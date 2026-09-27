import { createClient } from "@libsql/client";

// Supports Turso Cloud via TURSO_DATABASE_URL & TURSO_AUTH_TOKEN
// Fallback to local SQLite file for seamless zero-config local development
const url = process.env.TURSO_DATABASE_URL || "file:xcelerate_pulse.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const db = createClient({
  url,
  authToken,
});

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Auto-initialize database tables if not created yet.
 * Memoized so it executes only ONCE per server lifecycle instead of on every query.
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL, -- 'Brand', 'Agency', 'Internal'
          poc_name TEXT,
          poc_email TEXT,
          poc_phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, -- Campaign ID (e.g. CAMP-2026-BOAT)
      campaign_month TEXT NOT NULL,
      client_type TEXT NOT NULL, -- 'Brand', 'Agency', 'Other'
      org_name TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      xcelerate_poc TEXT NOT NULL,
      brand_agency_poc TEXT NOT NULL,
      brand_payment_cycle TEXT,
      status TEXT DEFAULT 'On Going',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaign_creators (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      profile_url TEXT NOT NULL,
      followers_count INTEGER DEFAULT 0,
      category TEXT NOT NULL, -- 'Nano', 'Micro', 'Macro', 'Mega'
      city TEXT,
      state TEXT,
      language TEXT,
      gender TEXT,
      phone_number TEXT, -- RESTRICTED: Confidential agency contact
      deliverables TEXT NOT NULL,
      brand_cost REAL DEFAULT 0,
      creator_cost REAL DEFAULT 0, -- RESTRICTED: Agency buying price
      gross_margin REAL DEFAULT 0, -- RESTRICTED: Profit
      address TEXT,
      product_status TEXT DEFAULT 'Not Applicable',
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
      -- Performance Metrics
      total_views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      avg_watch_time TEXT,
      engagement_rate REAL DEFAULT 0,
      account_reach INTEGER DEFAULT 0,
      screenshots TEXT, -- JSON array of proof image URLs
      -- Milestone snapshots (Day 7, Day 15, Day 30 tracking)
      day7_views INTEGER DEFAULT 0,
      day7_er REAL DEFAULT 0,
      day15_views INTEGER DEFAULT 0,
      day15_er REAL DEFAULT 0,
      day30_views INTEGER DEFAULT 0,
      day30_er REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      records_synced INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS brand_credentials (
      id TEXT PRIMARY KEY,
      org_name TEXT NOT NULL,
      portal_username TEXT NOT NULL,
      portal_password TEXT NOT NULL,
      role TEXT DEFAULT 'BRAND_CLIENT',
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      campaign_access_mode TEXT DEFAULT 'ALL',
      assigned_campaign_ids TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── Auto-migrate employee execution & invoicing columns ──
  const employeeColumns = [
    "ALTER TABLE campaign_creators ADD COLUMN execution_owner TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN brief_name TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN creator_payment_cycle TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN brand_receive_payment_cycle TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN brand_payment_status TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_pdf_link TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_direct_link TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN tracking_id TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_status TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_generated_on TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_number TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN creator_email TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_amount REAL DEFAULT 0",
    "ALTER TABLE campaign_creators ADD COLUMN gst_amount REAL DEFAULT 0",
    "ALTER TABLE campaign_creators ADD COLUMN invoice_total REAL DEFAULT 0",
    "ALTER TABLE campaign_creators ADD COLUMN unique_id TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN source_sheet TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN day7_screenshot TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN day15_screenshot TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN day30_screenshot TEXT",
    "ALTER TABLE campaign_creators ADD COLUMN brand_agency_poc TEXT",
    "ALTER TABLE campaigns ADD COLUMN brief_name TEXT",
    "ALTER TABLE brand_credentials ADD COLUMN campaign_access_mode TEXT DEFAULT 'ALL'",
    "ALTER TABLE brand_credentials ADD COLUMN assigned_campaign_ids TEXT DEFAULT '[]'"
  ];

    for (const colSql of employeeColumns) {
      try {
        await db.execute(colSql);
      } catch {
        // Column already exists - safe to ignore
      }
    }

    // Ensure default master admin credential exists if no SUPER_ADMIN exists
    try {
      const adminRes = await db.execute("SELECT id FROM brand_credentials WHERE role = 'SUPER_ADMIN' LIMIT 1");
      if (adminRes.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO brand_credentials (id, org_name, portal_username, portal_password, role, is_active, notes, campaign_access_mode, assigned_campaign_ids)
                VALUES (?, ?, ?, ?, ?, 1, ?, 'ALL', '[]')`,
          args: [
            "admin-master",
            "Xcelerate Media Admin",
            "admin@xceleratemedia.in",
            "Admin@Pulse2026!",
            "SUPER_ADMIN",
            "Master Super Administrator Account"
          ]
        });
      }
    } catch (adminErr) {
      console.error("Master admin seeding error:", adminErr);
    }

    isInitialized = true;
  } catch (err) {
    initPromise = null;
    console.error("Database initialization failed:", err);
    throw err;
  }
})();

  return initPromise;
}
