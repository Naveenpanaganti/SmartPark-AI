'use strict';

/**
 * ParkSmart Data Cleaning Pipeline
 *
 * Reads all occupancy snapshots, applies five cleaning steps, flags outliers,
 * persists a quality report to pipeline_runs, and returns a PipelineReport.
 *
 * Steps:
 *   1. Null check      — discard records missing total/booked/available slots
 *   2. Deduplication   — keep first record per (floor_level, recorded_at)
 *   3. Integrity check — discard records where booked_slots > total_slots
 *   4. Outlier detect  — flag records > 3σ from per-hour mean in the DB
 *   5. Persist report  — INSERT quality report into pipeline_runs
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<PipelineReport>}
 *
 * @typedef {{
 *   run_timestamp: string,
 *   total_records_processed: number,
 *   null_records_discarded: number,
 *   duplicate_records_removed: number,
 *   outliers_flagged: number,
 *   records_loaded: number
 * }} PipelineReport
 */
async function runPipeline(pool) {
  const run_timestamp = new Date().toISOString();

  // ─────────────────────────────────────────────────────────────
  // Fetch all snapshots ordered by recorded_at ASC
  // ─────────────────────────────────────────────────────────────
  const { rows } = await pool.query(
    'SELECT * FROM occupancy_snapshots ORDER BY recorded_at ASC'
  );

  const total_records_processed = rows.length;
  let null_records_discarded = 0;
  let duplicate_records_removed = 0;

  // ─────────────────────────────────────────────────────────────
  // Step 1 — Null check
  // Discard any row missing total_slots, booked_slots, or available_slots
  // ─────────────────────────────────────────────────────────────
  const afterNullCheck = [];
  for (const row of rows) {
    if (
      row.total_slots == null ||
      row.booked_slots == null ||
      row.available_slots == null
    ) {
      null_records_discarded++;
    } else {
      afterNullCheck.push(row);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 2 — Deduplication
  // Group by (floor_level + recorded_at ISO string); keep first of each group
  // ─────────────────────────────────────────────────────────────
  const seen = new Set();
  const afterDedup = [];
  for (const row of afterNullCheck) {
    const key = `${row.floor_level}||${new Date(row.recorded_at).toISOString()}`;
    if (!seen.has(key)) {
      seen.add(key);
      afterDedup.push(row);
    }
  }
  duplicate_records_removed = afterNullCheck.length - afterDedup.length;

  // ─────────────────────────────────────────────────────────────
  // Step 3 — Integrity check
  // Discard records where booked_slots > total_slots; log each anomaly
  // ─────────────────────────────────────────────────────────────
  const cleanRecords = [];
  for (const row of afterDedup) {
    if (Number(row.booked_slots) > Number(row.total_slots)) {
      console.log(
        `[ANOMALY] id=${row.id} booked=${row.booked_slots} > total=${row.total_slots}`
      );
      null_records_discarded++; // counted together with null discards per spec
    } else {
      cleanRecords.push(row);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 4 — Outlier detection
  // Group clean records by hour-of-day (0–23).
  // For any bucket with >= 2 records compute mean + population stddev of
  // occupancy_rate. Flag records where |rate − mean| > 3 * stddev.
  // ─────────────────────────────────────────────────────────────

  // Build hour buckets
  /** @type {Map<number, Array<{id: number, rate: number}>>} */
  const hourBuckets = new Map();
  for (const row of cleanRecords) {
    const hour = new Date(row.recorded_at).getUTCHours();
    if (!hourBuckets.has(hour)) hourBuckets.set(hour, []);
    hourBuckets.get(hour).push({ id: row.id, rate: Number(row.occupancy_rate) });
  }

  const outlierIds = [];

  for (const [, records] of hourBuckets) {
    if (records.length < 2) continue;

    // Population mean
    const mean = records.reduce((s, r) => s + r.rate, 0) / records.length;

    // Population standard deviation
    const variance =
      records.reduce((s, r) => s + Math.pow(r.rate - mean, 2), 0) /
      records.length;
    const stddev = Math.sqrt(variance);

    for (const r of records) {
      if (Math.abs(r.rate - mean) > 3 * stddev) {
        outlierIds.push(r.id);
      }
    }
  }

  // Update outlier flags in the database
  if (outlierIds.length > 0) {
    await pool.query(
      'UPDATE occupancy_snapshots SET is_outlier = TRUE WHERE id = ANY($1)',
      [outlierIds]
    );
  }

  const outliers_flagged = outlierIds.length;

  // records_loaded: clean records after dedup + integrity check
  // (outliers are still "loaded" — just flagged)
  const records_loaded = cleanRecords.length;

  // ─────────────────────────────────────────────────────────────
  // Step 5 — Persist quality report
  // ─────────────────────────────────────────────────────────────
  /** @type {PipelineReport} */
  const report = {
    run_timestamp,
    total_records_processed,
    null_records_discarded,
    duplicate_records_removed,
    outliers_flagged,
    records_loaded,
  };

  await pool.query(
    'INSERT INTO pipeline_runs(report) VALUES($1)',
    [JSON.stringify(report)]
  );

  // ─────────────────────────────────────────────────────────────
  // Human-readable summary to stdout
  // ─────────────────────────────────────────────────────────────
  console.log('==============================');
  console.log('DATA PIPELINE REPORT');
  console.log(`Run: ${run_timestamp}`);
  console.log('==============================');
  console.log(`Total records processed : ${total_records_processed}`);
  console.log(`Null records discarded  : ${null_records_discarded}`);
  console.log(`Duplicates removed      : ${duplicate_records_removed}`);
  console.log(`Outliers flagged        : ${outliers_flagged}`);
  console.log(`Records loaded          : ${records_loaded}`);
  console.log('==============================');

  return report;
}

module.exports = { runPipeline };

// ─────────────────────────────────────────────────────────────
// Self-executing block — run directly via `node pipeline.js`
// or `npm run pipeline`
// ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const { Pool } = require('pg');
  require('dotenv').config();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  runPipeline(pool)
    .then(() => pool.end())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
