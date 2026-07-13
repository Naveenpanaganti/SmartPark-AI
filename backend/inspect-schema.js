'use strict';
const pool = require('./db');

async function inspectSchema() {
  const tables = ['users', 'bookings', 'parking_slots'];
  try {
    for (const table of tables) {
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      console.log(`\nTable ${table} Schema:`);
      res.rows.forEach(col => {
        console.log(` - ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable})`);
      });
    }
  } catch (err) {
    console.error('Error inspecting schema:', err.message);
  } finally {
    await pool.end();
  }
}

inspectSchema();
