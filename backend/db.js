'use strict';

const { Pool } = require('pg');
require('dotenv').config();

// Use POOLER_DATABASE_URL if set, otherwise fall back to DATABASE_URL.
// The pooler URL (port 6543) is required for this Supabase project.
const connectionString =
  process.env.POOLER_DATABASE_URL ||
  'postgresql://postgres.rijsgvwdvznzbqwqjdyd:Mallesh%4017302@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
