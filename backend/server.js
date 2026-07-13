'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDoc = YAML.load('./swagger.yaml');

const pool = require('./db');

// ── Snapshot Scheduler ─────────────────────────────────────
async function captureSnapshot() {
  try {
    const { rows: floors } = await pool.query('SELECT DISTINCT floor_level FROM parking_slots');
    for (const { floor_level } of floors) {
      const { rows: [agg] } = await pool.query(`
        SELECT
          COUNT(s.id)::INTEGER AS total_slots,
          COUNT(b.id)::INTEGER AS booked_slots
        FROM parking_slots s
        LEFT JOIN bookings b ON b.slot_id = s.id
          AND NOW() BETWEEN b.start_time AND b.end_time
        WHERE s.floor_level = $1
      `, [floor_level]);
      const total = agg.total_slots;
      const booked = agg.booked_slots;
      const available = total - booked;
      const occupancy_rate = total === 0 ? 0 : Math.round((booked / total) * 10000) / 100;
      await pool.query(
        `INSERT INTO occupancy_snapshots (recorded_at, floor_level, total_slots, booked_slots, available_slots, occupancy_rate)
         VALUES (NOW(), $1, $2, $3, $4, $5)`,
        [floor_level, total, booked, available, occupancy_rate]
      );
    }
  } catch (err) {
    console.error(`[Snapshot ${new Date().toISOString()}] Capture failed:`, err.message);
  }
}
setInterval(captureSnapshot, 5 * 60 * 1000);
captureSnapshot();

const app = express();
app.use(cors());
app.use(express.json());

// ── Swagger UI ─────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// ── Role-Based Access Control (RBAC) Middleware ────────────
const checkRole = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];

    if (!userRole) {
      return res.status(401).json({ error: "Unauthorized: Missing 'x-user-role' header." });
    }

    if (requiredRole === 'manager' && userRole !== 'manager') {
      return res.status(403).json({ error: 'Forbidden: Manager privilege required.' });
    }

    if (requiredRole === 'user' && userRole !== 'user' && userRole !== 'manager') {
      return res.status(403).json({ error: 'Forbidden: User privilege required.' });
    }

    next();
  };
};

// 1. Health check
app.get('/api/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp, db: 'connected' });
  } catch (err) {
    res.status(200).json({ status: 'ok', timestamp, db: 'error' });
  }
});

// 2. Fetch all slots with their current booking status (Public access)
app.get('/api/slots', async (req, res) => {
  try {
    const query = `
      SELECT s.*,
      EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND NOW() BETWEEN b.start_time AND b.end_time) as is_booked
      FROM parking_slots s`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create a booking (Protected: Only 'user' or 'manager' roles can book)
app.post('/api/book', checkRole('user'), async (req, res) => {
  const { slot_id, user_name, start_time, end_time } = req.body;

  if (!slot_id || !user_name) {
    return res.status(400).json({ error: 'Missing required fields: slot_id and user_name' });
  }

  try {
    const checkQuery = `
      SELECT 1 FROM bookings
      WHERE slot_id = $1
      AND NOW() BETWEEN start_time AND end_time
    `;
    const checkResult = await pool.query(checkQuery, [slot_id]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Booking collision: Slot already occupied.' });
    }

    const insertQuery = `
      INSERT INTO bookings (slot_id, user_name, start_time, end_time)
      VALUES ($1, $2, COALESCE($3, NOW()), COALESCE($4, NOW() + INTERVAL '1 hour'))
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      slot_id,
      user_name,
      start_time || null,
      end_time || null,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch all bookings (Protected: Manager only)
app.get('/api/all-bookings', checkRole('manager'), async (req, res) => {
  try {
    const query = `
      SELECT b.*, s.slot_number, s.floor_level
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      ORDER BY b.start_time DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete an active booking for a slot (Protected: Manager only)
app.delete('/api/slots/:slot_id/booking', checkRole('manager'), async (req, res) => {
  const { slot_id } = req.params;
  try {
    const query = `
      DELETE FROM bookings
      WHERE slot_id = $1
      AND NOW() BETWEEN start_time AND end_time
      RETURNING *
    `;
    const result = await pool.query(query, [slot_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active booking found for this slot.' });
    }

    res.json({ message: 'Booking cancelled successfully.', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auth Router ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));

// ── Analytics Router ────────────────────────────────────────
app.use('/api/analytics', require('./routes/analytics.routes'));

// ── Global Error-Handling Middleware ───────────────────────
app.use((err, req, res, next) => {
  console.error(`[Error ${new Date().toISOString()}]`, err.stack);
  if (err.code === '57P03' || (err.message && err.message.toLowerCase().includes('timeout'))) {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
