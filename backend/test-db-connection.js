require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ Error: DATABASE_URL is not defined in your .env file.");
  process.exit(1);
}

console.log("Analyzing connection string...");

// Check for square brackets
if (dbUrl.includes('[') || dbUrl.includes(']')) {
  console.warn("⚠️ Warning: Your connection string contains square brackets '[' or ']'.");
  console.warn("   Supabase uses brackets as placeholders (e.g. [YOUR-PASSWORD]).");
  console.warn("   You must remove these brackets and replace the placeholder with your actual value.");
}

// Check for unencoded special characters in password
const urlPattern = /^postgresql?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;
const match = dbUrl.match(urlPattern);

if (match) {
  const password = match[2];
  if (password.includes('@') || password.includes(':') || password.includes('/') || password.includes('?')) {
    console.warn("⚠️ Warning: Your password contains special characters like '@', ':', '/', or '?'.");
    console.warn("   In a connection URL, these characters must be URL-encoded.");
    console.warn("   For example, replace '@' with '%40'.");
  }
}

// Mask password for logging
const maskedUrl = dbUrl.replace(/:[^@:]+@/, ':****@');
console.log(`Connection URL: ${maskedUrl}`);

const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log("\nAttempting to connect to the database...");
  try {
    const res = await pool.query('SELECT NOW()');
    console.log("✅ Success! Successfully connected to Supabase.");
    console.log("Server time from database:", res.rows[0].now);
  } catch (err) {
    console.error("\n❌ Connection Failed!");
    console.error("Error Message:", err.message);
    
    console.log("\n--- Troubleshooting Guidance ---");
    if (err.message.includes('ENOTFOUND') && dbUrl.includes('.supabase.co')) {
      console.log("💡 The host could not be resolved. This is likely because:");
      console.log("   1. Supabase direct connections (.supabase.co on port 5432) are now IPv6-only.");
      console.log("      If your local network or machine does not support IPv6, this connection will fail.");
      console.log("   2. To fix this, use the connection pooler URL instead (port 6543, usually on .pooler.supabase.com).");
    } else if (err.message.includes('tenant/user') && err.message.includes('not found')) {
      console.log("💡 The connection pooler returned 'tenant/user not found'. This means:");
      console.log("   1. Your Supabase project might be PAUSED or DELETED. Log in to the Supabase dashboard and click 'Restore'.");
      console.log("   2. The project reference ID in the URL is incorrect or has a typo.");
      console.log("   3. The username format is incorrect. For poolers, it should be: postgres.[project-ref]");
    } else if (err.message.includes('password authentication failed')) {
      console.log("💡 Password authentication failed. Check that:");
      console.log("   1. Your database password is correct.");
      console.log("   2. Special characters in the password are correctly URL-encoded.");
    } else {
      console.log("   Please verify your network connection and ensure your database details in .env match your Supabase settings.");
    }
  } finally {
    await pool.end();
  }
}

testConnection();
