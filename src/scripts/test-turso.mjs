import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually if not in environment
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...vals] = trimmed.split("=");
    if (key && vals.length > 0) {
      const val = vals.join("=").replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  }
}

const url = process.env.TURSO_DATABASE_URL || "";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log("\n=======================================================");
console.log("⚡ XCELERATE PULSE - TURSO CLOUD CONNECTION TEST");
console.log("=======================================================");

if (!url || url.includes("your-database-slug")) {
  console.log("\n⚠️  TURSO_DATABASE_URL is not configured yet in .env.local!");
  console.log("👉 Please paste your Database URL and Auth Token into:");
  console.log("   c:\\Users\\AsusTuf\\Desktop\\Xcelerate Pulse\\.env.local\n");
  console.log("Example:");
  console.log("TURSO_DATABASE_URL=\"libsql://xcelerate-db-company.turso.io\"");
  console.log("TURSO_AUTH_TOKEN=\"eyJhbGciOiJFZERTQ...\"");
  console.log("\n(Currently running on local embedded SQLite database)\n");
  process.exit(0);
}

console.log(`📡 Connecting to Turso Database: ${url}`);

async function testConnection() {
  try {
    const client = createClient({ url, authToken });

    // Test ping
    const ping = await client.execute("SELECT 1 as connected");
    if (ping.rows[0]?.connected === 1) {
      console.log("✅ Successfully connected to Turso Cloud Database!");
    }

    // Auto-create schema on Turso Cloud
    console.log("📦 Verifying / Initializing database tables on Turso...");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        poc_name TEXT,
        poc_email TEXT,
        poc_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        campaign_month TEXT NOT NULL,
        client_type TEXT NOT NULL,
        org_name TEXT NOT NULL,
        campaign_name TEXT NOT NULL,
        xcelerate_poc TEXT NOT NULL,
        brand_agency_poc TEXT NOT NULL,
        brand_payment_cycle TEXT,
        status TEXT DEFAULT 'On Going',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS campaign_creators (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        creator_name TEXT NOT NULL,
        niche TEXT NOT NULL,
        profile_url TEXT NOT NULL,
        followers_count INTEGER NOT NULL,
        category TEXT NOT NULL,
        city TEXT,
        state TEXT,
        language TEXT,
        gender TEXT,
        phone_number TEXT,
        deliverables TEXT NOT NULL,
        brand_cost INTEGER NOT NULL,
        creator_cost INTEGER NOT NULL,
        gross_margin INTEGER NOT NULL,
        address TEXT,
        product_status TEXT DEFAULT 'Pending',
        confirmation_mail_status TEXT DEFAULT 'Pending',
        script_link TEXT,
        script_status TEXT DEFAULT 'Script Pending',
        script_approval_date TEXT,
        first_draft_status TEXT DEFAULT 'Draft Pending',
        first_draft_date TEXT,
        revision_drive_link TEXT,
        final_video_status TEXT DEFAULT 'Approval Pending',
        video_approval_date TEXT,
        live_link TEXT,
        live_date TEXT,
        execution_status TEXT DEFAULT 'On Going',
        total_views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        avg_watch_time TEXT DEFAULT '0:00',
        engagement_rate REAL DEFAULT 0.0,
        account_reach INTEGER DEFAULT 0,
        screenshots TEXT,
        day7_views INTEGER DEFAULT 0,
        day7_er REAL DEFAULT 0.0,
        day15_views INTEGER DEFAULT 0,
        day15_er REAL DEFAULT 0.0,
        day30_views INTEGER DEFAULT 0,
        day30_er REAL DEFAULT 0.0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        records_synced INTEGER NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const campCount = await client.execute("SELECT COUNT(*) as count FROM campaigns");
    const creatorCount = await client.execute("SELECT COUNT(*) as count FROM campaign_creators");

    console.log(`📊 Active Campaigns on Turso: ${campCount.rows[0]?.count || 0}`);
    console.log(`👥 Active Creators on Turso: ${creatorCount.rows[0]?.count || 0}`);
    console.log("\n🚀 Turso Cloud is 100% READY for Production!\n");
  } catch (err) {
    console.error("\n❌ Connection to Turso failed:");
    console.error(err.message);
    console.log("\nPlease verify that TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local are correct.\n");
  }
}

testConnection();
