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

// ── CORS — allow Vercel frontend + local dev ───────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://smart-park-ai-zeta.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// ── Swagger UI ─────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// ── Role-Based Access Control (RBAC) & JWT Middleware ──────
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'parksmart-dev-secret-2024';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    const role = req.headers['x-user-role'];
    if (role) {
      req.user = { role, full_name: 'Dev User', email: 'dev@example.com' };
      return next();
    }
    return res.status(401).json({ error: "Unauthorized: Missing Authorization header." });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains userId, email, role
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
  }
};

const checkRole = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userRole) {
      return res.status(401).json({ error: "Unauthorized: Missing role identification." });
    }

    if (requiredRole === 'manager' && userRole !== 'manager') {
      return res.status(403).json({ error: 'Forbidden: Manager privilege required.' });
    }

    if (requiredRole === 'user' && userRole !== 'user' && userRole !== 'customer' && userRole !== 'manager') {
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
        b.id AS active_booking_id,
        b.user_id AS booked_by_user_id,
        b.user_name AS booked_by_name,
        CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_booked
      FROM parking_slots s
      LEFT JOIN bookings b ON b.slot_id = s.id 
        AND NOW() BETWEEN b.start_time AND b.end_time
        AND (b.status IS NULL OR b.status NOT IN ('completed', 'cancelled'))
      ORDER BY s.slot_number ASC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.1 Add a new parking slot (Protected: Manager only)
app.post('/api/slots', authenticateToken, checkRole('manager'), async (req, res) => {
  const { slot_number, floor_level, is_premium, vehicle_type } = req.body;
  if (!slot_number || !floor_level || !vehicle_type) {
    return res.status(400).json({ error: 'Missing slot_number, floor_level, or vehicle_type.' });
  }
  try {
    const query = `
      INSERT INTO parking_slots (slot_number, floor_level, is_premium, vehicle_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [slot_number, floor_level, !!is_premium, vehicle_type]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2 Edit an existing parking slot (Protected: Manager only)
app.put('/api/slots/:id', authenticateToken, checkRole('manager'), async (req, res) => {
  const { id } = req.params;
  const { slot_number, floor_level, is_premium, vehicle_type } = req.body;
  if (!slot_number || !floor_level || !vehicle_type) {
    return res.status(400).json({ error: 'Missing slot_number, floor_level, or vehicle_type.' });
  }
  try {
    const query = `
      UPDATE parking_slots
      SET slot_number = $1, floor_level = $2, is_premium = $3, vehicle_type = $4
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [slot_number, floor_level, !!is_premium, vehicle_type, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Slot not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.3 Delete a parking slot (Protected: Manager only)
app.delete('/api/slots/:id', authenticateToken, checkRole('manager'), async (req, res) => {
  const { id } = req.params;
  try {
    // Delete any associated bookings first to maintain referential integrity
    await pool.query('DELETE FROM bookings WHERE slot_id = $1', [id]);
    const result = await pool.query('DELETE FROM parking_slots WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Slot not found.' });
    res.json({ message: 'Slot deleted successfully.', slot: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.4 Fetch all settings (Public)
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM app_settings');
    const settings = {};
    result.rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5 Update system configuration setting (Protected: Manager only)
app.post('/api/settings', authenticateToken, checkRole('manager'), async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required.' });
  }
  try {
    const query = `
      INSERT INTO app_settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      RETURNING *
    `;
    const result = await pool.query(query, [key, JSON.stringify(value)]);
    res.json({ message: 'Setting saved successfully.', setting: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create a booking (Protected: Only 'user' or 'manager' roles can book)
app.post('/api/book', authenticateToken, checkRole('user'), async (req, res) => {
  const { slot_id, user_name, start_time, end_time } = req.body;
  const bookingName = user_name || req.user?.full_name || req.user?.email || 'Customer';

  if (!slot_id) {
    return res.status(400).json({ error: 'Missing required field: slot_id' });
  }

  try {
    // Check if slot has active occupation
    const checkQuery = `
      SELECT 1 FROM bookings
      WHERE slot_id = $1
      AND NOW() BETWEEN start_time AND end_time
      AND (status IS NULL OR status NOT IN ('completed', 'cancelled'))
    `;
    const checkResult = await pool.query(checkQuery, [slot_id]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Booking collision: Slot already occupied.' });
    }

    const insertQuery = `
      INSERT INTO bookings (slot_id, user_name, start_time, end_time, status, user_id)
      VALUES ($1, $2, COALESCE($3, NOW()), COALESCE($4, NOW() + INTERVAL '1 hour'), 'booked', $5)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      slot_id,
      bookingName,
      start_time || null,
      end_time || null,
      req.user?.userId || null
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch all bookings (Protected: Manager only)
app.get('/api/all-bookings', authenticateToken, checkRole('manager'), async (req, res) => {
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

// 5. Fetch current user's bookings (Protected)
app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  try {
    const nameFilter = req.user?.full_name || 'NONE_GIVEN';
    const emailFilter = req.user?.email || 'NONE_GIVEN';
    const query = `
      SELECT b.*, s.slot_number, s.floor_level, s.vehicle_type, s.is_premium
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.user_id = $1 OR (b.user_id IS NULL AND (b.user_name = $2 OR b.user_name = $3))
      ORDER BY b.start_time DESC
    `;
    const result = await pool.query(query, [req.user?.userId || null, nameFilter, emailFilter]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Fetch a single booking (Protected)
app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT b.*, s.slot_number, s.floor_level, s.vehicle_type, s.is_premium
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update booking status (Protected)
app.patch('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['booked', 'checked-in', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    // Fetch the booking first for ownership check
    const bookingCheck = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingCheck.rows[0];
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    // Ownership guard: non-managers can only modify their own bookings
    if (userRole !== 'manager' && booking.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only modify your own bookings.' });
    }

    let query;
    let params;
    
    if (status === 'checked-in') {
      query = `UPDATE bookings SET status = $1, start_time = NOW() WHERE id = $2 RETURNING *`;
      params = [status, id];
    } else if (status === 'completed') {
      query = `UPDATE bookings SET status = $1, end_time = NOW() WHERE id = $2 RETURNING *`;
      params = [status, id];
    } else {
      query = `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`;
      params = [status, id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete an active booking for a slot (Protected: Manager only)
app.delete('/api/slots/:slot_id/booking', authenticateToken, checkRole('manager',), async (req, res) => {
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


// ── Admin: User Management ───────────────────────────────────

// GET /api/admin/users — list all users with booking stats (Manager only)
app.get('/api/admin/users', authenticateToken, checkRole('manager'), async (req, res) => {
  try {
    const query = `
      SELECT
        u.id, u.email, u.full_name, u.role, u.created_at,
        COUNT(b.id)::INTEGER AS total_bookings,
        COUNT(CASE WHEN b.status NOT IN ('cancelled','completed') AND NOW() BETWEEN b.start_time AND b.end_time THEN 1 END)::INTEGER AS active_bookings
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id — get single user details (Manager only)
app.get('/api/admin/users/:id', authenticateToken, checkRole('manager'), async (req, res) => {
  const { id } = req.params;
  try {
    const userResult = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const bookingsResult = await pool.query(`
      SELECT b.*, s.slot_number, s.floor_level
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.user_id = $1
      ORDER BY b.start_time DESC
      LIMIT 20
    `, [id]);

    res.json({ user: userResult.rows[0], bookings: bookingsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/role — change a user's role (Manager only)
app.patch('/api/admin/users/:id/role', authenticateToken, checkRole('manager'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['customer', 'security', 'manager'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }
  // Prevent manager from demoting themselves
  if (parseInt(id) === req.user?.userId) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Role updated successfully.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — delete a user account (Manager only)
app.delete('/api/admin/users/:id', authenticateToken, checkRole('manager'), async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user?.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    // Cancel active bookings first, then delete
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE user_id = $1", [id]);
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted successfully.', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Staff Management ──────────────────────────────────

// GET /api/admin/staff — list only security + manager accounts (Manager only)
app.get('/api/admin/staff', authenticateToken, checkRole('manager'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, full_name, role, created_at
      FROM users
      WHERE role IN ('security', 'manager')
      ORDER BY role ASC, full_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/staff — create a new staff account (Manager only)
app.post('/api/admin/staff', authenticateToken, checkRole('manager'), async (req, res) => {
  const { email, full_name, role, password } = req.body;
  const validRoles = ['security', 'manager'];
  if (!email || !full_name || !password) {
    return res.status(400).json({ error: 'email, full_name, and password are required.' });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Role must be 'security' or 'manager'." });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at',
      [email, password_hash, full_name, role]
    );
    res.status(201).json({ message: 'Staff account created.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/staff/:id — update staff name or role (Manager only)
app.patch('/api/admin/staff/:id', authenticateToken, checkRole('manager'), async (req, res) => {
  const { id } = req.params;
  const { full_name, role } = req.body;
  const validRoles = ['security', 'manager'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: "Role must be 'security' or 'manager'." });
  }
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (full_name) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
    if (role)      { fields.push(`role = $${idx++}`);      values.push(role); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, role`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Staff not found.' });
    res.json({ message: 'Staff updated.', user: result.rows[0] });
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
