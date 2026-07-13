'use strict';

const { Router } = require('express');
const pool = require('../db');
const { getPredictions } = require('../prediction');

const router = Router();

// ─────────────────────────────────────────────────────────────
// Shared helper — sparsity check
// Returns true when fewer than 12 snapshots exist in the last 24 h.
// ─────────────────────────────────────────────────────────────
async function isSparse() {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM occupancy_snapshots
     WHERE recorded_at > NOW() - INTERVAL '24 hours'`
  );
  return parseInt(rows[0].cnt, 10) < 12;
}

const DATA_WARNING =
  'Insufficient historical data — results may be inaccurate';

// ─────────────────────────────────────────────────────────────
// Task 5.2 — GET /api/analytics/occupancy-history
// ─────────────────────────────────────────────────────────────
router.get('/occupancy-history', async (req, res, next) => {
  try {
    // Validate `hours`
    const rawHours = req.query.hours !== undefined ? req.query.hours : '24';
    const hours = parseInt(rawHours, 10);
    if (isNaN(hours) || hours <= 0 || hours > 168) {
      return res
        .status(400)
        .json({ message: 'hours must be a positive integer between 1 and 168' });
    }

    const { floor } = req.query;

    let queryText;
    let queryParams;

    if (floor) {
      queryText = `
        SELECT *
        FROM occupancy_snapshots
        WHERE recorded_at > NOW() - ($1 || ' hours')::INTERVAL
          AND floor_level = $2
        ORDER BY recorded_at ASC
      `;
      queryParams = [hours, floor];
    } else {
      queryText = `
        SELECT *
        FROM occupancy_snapshots
        WHERE recorded_at > NOW() - ($1 || ' hours')::INTERVAL
        ORDER BY recorded_at ASC
      `;
      queryParams = [hours];
    }

    const { rows } = await pool.query(queryText, queryParams);

    const sparse = await isSparse();
    const response = { data: rows };
    if (sparse) response.data_warning = DATA_WARNING;

    return res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// Task 5.3 — GET /api/analytics/stats
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    // current_occupancy_rate — avg over most recent snapshot per floor (last 10 min)
    const currentRateResult = await pool.query(`
      SELECT AVG(occupancy_rate) AS current_occupancy_rate
      FROM (
        SELECT DISTINCT ON (floor_level)
          floor_level,
          occupancy_rate
        FROM occupancy_snapshots
        WHERE recorded_at > NOW() - INTERVAL '10 minutes'
        ORDER BY floor_level, recorded_at DESC
      ) latest
    `);

    // peak_hour_today — hour (0-23) with highest avg occupancy_rate from today's snapshots
    const peakHourResult = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM recorded_at)::INTEGER AS hour,
        AVG(occupancy_rate) AS avg_rate
      FROM occupancy_snapshots
      WHERE recorded_at >= DATE_TRUNC('day', NOW())
      GROUP BY EXTRACT(HOUR FROM recorded_at)
      ORDER BY avg_rate DESC
      LIMIT 1
    `);

    // avg_occupancy_last_7_days
    const avgLast7Result = await pool.query(`
      SELECT AVG(occupancy_rate) AS avg_occupancy_last_7_days
      FROM occupancy_snapshots
      WHERE recorded_at > NOW() - INTERVAL '7 days'
    `);

    // total_bookings_today — count of bookings with start_time >= today midnight
    const totalBookingsTodayResult = await pool.query(`
      SELECT COUNT(*) AS total_bookings_today
      FROM bookings
      WHERE start_time >= DATE_TRUNC('day', NOW())
    `);

    // busiest_floor — floor_level with highest avg occupancy_rate overall
    const busiestFloorResult = await pool.query(`
      SELECT floor_level
      FROM occupancy_snapshots
      GROUP BY floor_level
      ORDER BY AVG(occupancy_rate) DESC
      LIMIT 1
    `);

    const current_occupancy_rate =
      currentRateResult.rows[0].current_occupancy_rate !== null
        ? parseFloat(currentRateResult.rows[0].current_occupancy_rate)
        : 0;

    const peak_hour_today =
      peakHourResult.rows.length > 0
        ? peakHourResult.rows[0].hour
        : null;

    const avg_occupancy_last_7_days =
      avgLast7Result.rows[0].avg_occupancy_last_7_days !== null
        ? parseFloat(avgLast7Result.rows[0].avg_occupancy_last_7_days)
        : 0;

    const total_bookings_today = parseInt(
      totalBookingsTodayResult.rows[0].total_bookings_today,
      10
    );

    const busiest_floor =
      busiestFloorResult.rows.length > 0
        ? busiestFloorResult.rows[0].floor_level
        : null;

    // mae_yesterday — from prediction engine
    let mae_yesterday = null;
    try {
      const predResult = await getPredictions(pool, null);
      mae_yesterday = predResult.mae_yesterday;
    } catch (_) {}

    const sparse = await isSparse();
    const response = {
      current_occupancy_rate,
      peak_hour_today,
      avg_occupancy_last_7_days,
      total_bookings_today,
      busiest_floor,
      mae_yesterday,
    };
    if (sparse) response.data_warning = DATA_WARNING;

    return res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// Task 5.4 — GET /api/analytics/heatmap
// ─────────────────────────────────────────────────────────────
router.get('/heatmap', async (req, res, next) => {
  try {
    // Aggregate all snapshots by day-of-week and hour-of-day
    const { rows } = await pool.query(`
      SELECT
        EXTRACT(DOW  FROM recorded_at)::INTEGER AS day_of_week,
        EXTRACT(HOUR FROM recorded_at)::INTEGER AS hour_of_day,
        AVG(occupancy_rate)                     AS avg_rate
      FROM occupancy_snapshots
      GROUP BY
        EXTRACT(DOW  FROM recorded_at),
        EXTRACT(HOUR FROM recorded_at)
    `);

    // Build 7×24 matrix initialised to 0.00
    /** @type {number[][]} */
    const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));

    for (const row of rows) {
      const dow  = row.day_of_week;   // 0 (Sun) – 6 (Sat)
      const hour = row.hour_of_day;   // 0–23
      matrix[dow][hour] = parseFloat(parseFloat(row.avg_rate).toFixed(2));
    }

    const sparse = await isSparse();
    const response = { data: matrix };
    if (sparse) response.data_warning = DATA_WARNING;

    return res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/predictions
// ─────────────────────────────────────────────────────────────
router.get('/predictions', async (req, res, next) => {
  try {
    const { target_date } = req.query;
    if (target_date) {
      const d = new Date(target_date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: 'target_date must be a valid ISO 8601 date string' });
      }
    }
    const result = await getPredictions(pool, target_date || null);
    const sparse = await isSparse();
    const response = { data: result.predictions };
    if (result.mae_yesterday !== null) response.mae_yesterday = result.mae_yesterday;
    if (sparse) response.data_warning = DATA_WARNING;
    return res.json(response);
  } catch (err) {
    next(err);
  }
});
// ─────────────────────────────────────────────────────────────
// GET /api/analytics/revenue
// ─────────────────────────────────────────────────────────────
router.get('/revenue', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        DATE(b.start_time) as date,
        SUM(
          EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600.0 * 
          CASE WHEN s.is_premium THEN 10.0 ELSE 5.0 END
        ) as daily_revenue
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.status != 'cancelled'
      GROUP BY DATE(b.start_time)
      ORDER BY date ASC
    `);

    let totalRevenue = 0;
    let todayRevenue = 0;
    let thisMonthRevenue = 0;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

    const chartData = rows.map(row => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const rev = parseFloat(row.daily_revenue || 0);
      
      totalRevenue += rev;
      if (dateStr === todayStr) {
        todayRevenue += rev;
      }
      if (dateStr.startsWith(thisMonthStr)) {
        thisMonthRevenue += rev;
      }
      
      return {
        date: dateStr,
        revenue: parseFloat(rev.toFixed(2))
      };
    });

    res.json({
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      today_revenue: parseFloat(todayRevenue.toFixed(2)),
      this_month_revenue: parseFloat(thisMonthRevenue.toFixed(2)),
      chart_data: chartData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
