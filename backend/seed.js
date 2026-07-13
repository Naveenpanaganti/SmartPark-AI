'use strict';

/**
 * seed.js — Synthetic historical data generator for ParkSmart
 *
 * Generates 30 days of realistic booking records and hourly occupancy
 * snapshots, then reports a summary to stdout.
 *
 * Usage:
 *   node seed.js            (standalone, reads DATABASE_URL from .env)
 *   runSeed(pool)           (programmatic, pass an existing pg.Pool)
 */

// ---------------------------------------------------------------------------
// Exported constants (used by tests and the seeding logic itself)
// ---------------------------------------------------------------------------

const WEEKDAY_CAR_PROB  = 0.65;
const WEEKEND_CAR_PROB  = 0.80;
const WEEKDAY_BIKE_PROB = 0.40;
const WEEKEND_BIKE_PROB = 0.55;

/**
 * Peak windows: hours [start, end) get a probability multiplier.
 * Times match the mall traffic peaks defined in the requirements.
 */
const PEAK_WINDOWS = [
  { start: 8,  end: 10, multiplier: 1.4 },  // Morning rush
  { start: 12, end: 14, multiplier: 1.3 },  // Lunch
  { start: 17, end: 20, multiplier: 1.5 },  // Evening peak
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the base booking probability for a given vehicle type and day.
 * @param {string} vehicleType  - 'car' | 'bike'
 * @param {boolean} isWeekend
 * @returns {number}
 */
function baseProbability(vehicleType, isWeekend) {
  if (vehicleType === 'car') {
    return isWeekend ? WEEKEND_CAR_PROB : WEEKDAY_CAR_PROB;
  }
  // bike (or any other type falls back to bike probabilities)
  return isWeekend ? WEEKEND_BIKE_PROB : WEEKDAY_BIKE_PROB;
}

/**
 * Returns the peak multiplier for a given hour, or 1.0 if not in any window.
 * @param {number} hour  - 0–23
 * @returns {number}
 */
function peakMultiplier(hour) {
  for (const win of PEAK_WINDOWS) {
    if (hour >= win.start && hour < win.end) {
      return win.multiplier;
    }
  }
  return 1.0;
}

/**
 * Computes the final booking probability for a slot-hour-day combination,
 * capped at 0.95.
 * @param {string}  vehicleType
 * @param {boolean} isWeekend
 * @param {number}  hour
 * @returns {number}
 */
function finalProbability(vehicleType, isWeekend, hour) {
  const base = baseProbability(vehicleType, isWeekend);
  const mult = peakMultiplier(hour);
  return Math.min(0.95, base * mult);
}

/**
 * Returns a random integer in the inclusive range [min, max].
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Computes occupancy_rate as a NUMERIC(5,2)-compatible value:
 *   ROUND((booked / total) * 100, 2)
 * Returns 0 when total_slots is 0 (avoids division by zero).
 * @param {number} booked
 * @param {number} total
 * @returns {number}
 */
function computeOccupancyRate(booked, total) {
  if (total === 0) return 0;
  return Math.round((booked / total) * 10000) / 100;
}

// ---------------------------------------------------------------------------
// Core seeder
// ---------------------------------------------------------------------------

/**
 * Generates synthetic bookings and occupancy snapshots for the last 30 days,
 * then prints a seed report and returns the report object.
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<SeedReport>}
 *
 * @typedef {Object} SeedReport
 * @property {number} totalBookingsGenerated
 * @property {number} totalSnapshotsGenerated
 * @property {{ from: string, to: string }} dateRange
 * @property {Record<string, number>} perFloorUtilization  - fraction 0–1
 */
async function runSeed(pool) {
  // ------------------------------------------------------------------
  // 1. Load all parking slots
  // ------------------------------------------------------------------
  const slotsResult = await pool.query(
    'SELECT id, vehicle_type, floor_level FROM parking_slots ORDER BY id'
  );
  const slots = slotsResult.rows;

  if (slots.length === 0) {
    console.warn('[seed] No parking_slots found — nothing to seed.');
    return {
      totalBookingsGenerated: 0,
      totalSnapshotsGenerated: 0,
      dateRange: { from: '', to: '' },
      perFloorUtilization: {},
    };
  }

  // ------------------------------------------------------------------
  // 2. Build the 30-day window ending at "now"
  //    day index 0 = today, 29 = 29 days ago
  // ------------------------------------------------------------------
  const now = new Date();

  // Truncate "now" to the start of the current hour so our synthetic
  // data doesn't produce bookings in the future.
  const windowEnd = new Date(now);
  windowEnd.setMinutes(0, 0, 0);

  // Day 0 = today (date only, midnight local → UTC)
  const days = [];
  for (let d = 0; d < 30; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    day.setHours(0, 0, 0, 0);
    days.push(day);
  }

  const dateFrom = new Date(days[days.length - 1]); // oldest day
  const dateTo   = new Date(days[0]);                // today

  // ------------------------------------------------------------------
  // 3. Generate bookings
  //    We skip any slot+hour combination that already has an overlapping
  //    booking to satisfy the idempotence requirement.
  // ------------------------------------------------------------------

  // Fetch existing booking start_times per slot to detect conflicts.
  // We represent each existing booking as { slot_id, start_time, end_time }.
  const existingResult = await pool.query(
    `SELECT slot_id,
            start_time AT TIME ZONE 'UTC' AS start_time,
            end_time   AT TIME ZONE 'UTC' AS end_time
     FROM bookings
     WHERE start_time >= $1`,
    [dateFrom]
  );

  // Build a quick-lookup set: "slot_id|ISO-start-time" for O(1) conflict check
  // We'll check overlap: a proposed booking [ps, pe] conflicts with existing [es, ee]
  // if ps < ee AND pe > es.
  // For efficiency we store existing bookings per slot_id.
  /** @type {Map<number, Array<{start: Date, end: Date}>>} */
  const existingBySlot = new Map();
  for (const row of existingResult.rows) {
    const sid = row.slot_id;
    if (!existingBySlot.has(sid)) existingBySlot.set(sid, []);
    existingBySlot.get(sid).push({
      start: new Date(row.start_time),
      end:   new Date(row.end_time),
    });
  }

  /**
   * Returns true if the proposed [propStart, propEnd) interval overlaps any
   * existing booking for slotId.
   */
  function hasOverlap(slotId, propStart, propEnd) {
    const existing = existingBySlot.get(slotId);
    if (!existing) return false;
    for (const ex of existing) {
      if (propStart < ex.end && propEnd > ex.start) return true;
    }
    return false;
  }

  /** @type {Array<[number, string, Date, Date]>} [slot_id, user_name, start, end] */
  const bookingsToInsert = [];

  // Tracking data for the seed report
  /** @type {Map<string, { totalSlots: number, bookedCount: number }>} */
  const floorStats = new Map();
  for (const slot of slots) {
    if (!floorStats.has(slot.floor_level)) {
      floorStats.set(slot.floor_level, { totalSlots: 0, bookedCount: 0 });
    }
    floorStats.get(slot.floor_level).totalSlots += 1;
  }

  for (const day of days) {
    const dayOfWeek = day.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (let hour = 0; hour < 24; hour++) {
      // Don't generate bookings beyond "now"
      const slotTime = new Date(day);
      slotTime.setHours(hour, 0, 0, 0);
      if (slotTime > windowEnd) continue;

      for (const slot of slots) {
        const prob = finalProbability(slot.vehicle_type, isWeekend, hour);

        if (Math.random() < prob) {
          // Duration: random 30–120 minutes
          const durationMinutes = randomInt(30, 120);

          const startTime = new Date(slotTime);
          const endTime   = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

          // Skip if this would overlap an existing booking
          if (hasOverlap(slot.id, startTime, endTime)) continue;

          const userName = `seed_user_${slot.id}_${startTime.getTime()}`;
          bookingsToInsert.push([slot.id, userName, startTime, endTime]);

          // Register in the in-memory conflict map for subsequent iterations
          if (!existingBySlot.has(slot.id)) existingBySlot.set(slot.id, []);
          existingBySlot.get(slot.id).push({ start: startTime, end: endTime });

          // Accumulate per-floor booking counts
          floorStats.get(slot.floor_level).bookedCount += 1;
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 4. Batch-insert bookings
  // ------------------------------------------------------------------
  let insertedBookings = 0;

  // Insert in chunks of 500 to avoid huge query strings
  const CHUNK = 500;
  for (let i = 0; i < bookingsToInsert.length; i += CHUNK) {
    const chunk = bookingsToInsert.slice(i, i + CHUNK);

    // Build a multi-row VALUES clause
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const [slotId, userName, startTime, endTime] of chunk) {
      values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
      params.push(slotId, userName, startTime, endTime);
    }

    const sql = `
      INSERT INTO bookings (slot_id, user_name, start_time, end_time)
      VALUES ${values.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const result = await pool.query(sql, params);
    insertedBookings += result.rowCount;
  }

  // ------------------------------------------------------------------
  // 5. Compute and insert occupancy snapshots
  //    One row per (day × hour × floor_level)
  // ------------------------------------------------------------------

  // Build a fast lookup: for each slot, its floor_level
  /** @type {Map<number, string>} */
  const slotFloor = new Map(slots.map(s => [s.id, s.floor_level]));

  // Unique floor levels
  const floorLevels = [...new Set(slots.map(s => s.floor_level))];

  // We need to count, per (day, hour, floor), how many slots are booked.
  // A booking is "active" at a snapshot time T when start_time <= T < end_time.
  // We'll build a combined list of all bookings (newly generated + pre-existing)
  // filtered to the seed window.

  // Re-fetch all bookings in the window (including pre-existing ones we skipped)
  // so the snapshots reflect reality.
  const allBookingsResult = await pool.query(
    `SELECT slot_id,
            start_time AT TIME ZONE 'UTC' AS start_time,
            end_time   AT TIME ZONE 'UTC' AS end_time
     FROM bookings
     WHERE start_time >= $1 AND start_time < $2`,
    [dateFrom, new Date(dateTo.getTime() + 24 * 60 * 60 * 1000)]
  );

  /** @type {Array<{slotId: number, start: Date, end: Date, floor: string}>} */
  const allBookings = allBookingsResult.rows.map(r => ({
    slotId: r.slot_id,
    start:  new Date(r.start_time),
    end:    new Date(r.end_time),
    floor:  slotFloor.get(r.slot_id) || 'Unknown',
  }));

  // Total slots per floor (constant)
  /** @type {Map<string, number>} */
  const totalSlotsPerFloor = new Map();
  for (const slot of slots) {
    totalSlotsPerFloor.set(
      slot.floor_level,
      (totalSlotsPerFloor.get(slot.floor_level) || 0) + 1
    );
  }

  /** @type {Array<[string, Date, number, number, number, number]>}
   *  [floor_level, recorded_at, total, booked, available, occupancy_rate] */
  const snapshotsToInsert = [];

  for (const day of days) {
    for (let hour = 0; hour < 24; hour++) {
      const snapshotTime = new Date(day);
      snapshotTime.setHours(hour, 0, 0, 0);

      // Don't create future snapshots
      if (snapshotTime > windowEnd) continue;

      for (const floor of floorLevels) {
        const total = totalSlotsPerFloor.get(floor) || 0;

        // Count bookings active at snapshotTime: start <= snapshotTime < end
        let booked = 0;
        for (const bk of allBookings) {
          if (bk.floor === floor && bk.start <= snapshotTime && snapshotTime < bk.end) {
            booked += 1;
          }
        }

        // Cap booked at total to satisfy the DB CHECK constraint
        const safebooked    = Math.min(booked, total);
        const available     = total - safebooked;
        const occupancyRate = computeOccupancyRate(safebooked, total);

        snapshotsToInsert.push([floor, snapshotTime, total, safebooked, available, occupancyRate]);
      }
    }
  }

  // Batch-insert snapshots — use ON CONFLICT DO NOTHING to stay idempotent.
  // There's no unique constraint yet, but the task says to use ON CONFLICT DO NOTHING,
  // so if a constraint is added later this will be safe.
  let insertedSnapshots = 0;

  for (let i = 0; i < snapshotsToInsert.length; i += CHUNK) {
    const chunk = snapshotsToInsert.slice(i, i + CHUNK);

    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const [floor, recAt, total, booked, available, rate] of chunk) {
      values.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
      );
      params.push(floor, recAt, total, booked, available, rate);
    }

    const sql = `
      INSERT INTO occupancy_snapshots
        (floor_level, recorded_at, total_slots, booked_slots, available_slots, occupancy_rate)
      VALUES ${values.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const result = await pool.query(sql, params);
    insertedSnapshots += result.rowCount;
  }

  // ------------------------------------------------------------------
  // 6. Build and print the seed report
  // ------------------------------------------------------------------

  /** @type {Record<string, number>} */
  const perFloorUtilization = {};
  for (const [floor, stats] of floorStats.entries()) {
    // Utilization = bookedCount / (totalSlots × 30 days × 24 hours)
    const maxPossible = stats.totalSlots * 30 * 24;
    perFloorUtilization[floor] = maxPossible > 0
      ? Math.round((stats.bookedCount / maxPossible) * 10000) / 100  // percentage
      : 0;
  }

  const report = {
    totalBookingsGenerated:  insertedBookings,
    totalSnapshotsGenerated: insertedSnapshots,
    dateRange: {
      from: dateFrom.toISOString(),
      to:   dateTo.toISOString(),
    },
    perFloorUtilization,
  };

  // Print human-readable report
  console.log('\n=== SEED REPORT ===');
  console.log(`Total booking records generated:  ${report.totalBookingsGenerated}`);
  console.log(`Total snapshot records generated: ${report.totalSnapshotsGenerated}`);
  console.log(`Date range: ${report.dateRange.from} to ${report.dateRange.to}`);
  console.log('Per-floor utilization:');
  for (const [floor, pct] of Object.entries(perFloorUtilization)) {
    console.log(`  ${floor}: ${pct}%`);
  }
  console.log('==================\n');

  return report;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  runSeed,
  WEEKDAY_CAR_PROB,
  WEEKEND_CAR_PROB,
  WEEKDAY_BIKE_PROB,
  WEEKEND_BIKE_PROB,
  PEAK_WINDOWS,
  // Expose internal helpers for unit/property tests
  baseProbability,
  peakMultiplier,
  finalProbability,
  computeOccupancyRate,
};

// ---------------------------------------------------------------------------
// Self-executing block: run directly with `node seed.js`
// ---------------------------------------------------------------------------

if (require.main === module) {
  const { Pool } = require('pg');
  require('dotenv').config();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  runSeed(pool)
    .then(() => pool.end())
    .catch(e => { console.error(e); process.exit(1); });
}
