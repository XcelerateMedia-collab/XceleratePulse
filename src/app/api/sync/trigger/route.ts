import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";
import { syncGoogleSheetRows } from "@/lib/sync/sheet-mapper";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const { action = "test", webAppUrl, employee, month, campaign } = body;

    const targetUrl = (webAppUrl && String(webAppUrl).trim().startsWith("http"))
      ? String(webAppUrl).trim()
      : (process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBAPP_URL || "").trim();

    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: "Google Apps Script Web App URL is not configured. Please add GOOGLE_APPS_SCRIPT_WEBAPP_URL to .env.local or enter it in the Settings tab.",
      }, { status: 400 });
    }

    const url = new URL(targetUrl);
    url.searchParams.set("action", action || "test");
    if (employee) url.searchParams.set("employee", employee);
    if (month) url.searchParams.set("month", month);
    if (campaign) url.searchParams.set("campaign", campaign);

    // Pass the active webhook URL so Google Apps Script can dynamically update its destination
    const webhookOrigin = process.env.NEXT_PUBLIC_APP_URL 
      || process.env.NEXT_PUBLIC_TUNNEL_URL 
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://xcelerate-pulse.vercel.app");
    if (webhookOrigin) {
      url.searchParams.set("webhookUrl", `${webhookOrigin}/api/sync/sheets`);
    }


    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "User-Agent": "Xcelerate-Pulse-Admin" },
      cache: "no-store",
      redirect: "follow",
      signal: req.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (!data || data.success === false) {
        return NextResponse.json({
          success: false,
          error: data?.error || data?.message || "Google Apps Script returned an unsuccessful response.",
          raw: data
        }, { status: 500 });
      }

      await initDatabase();

      // CASE 1: In-Band Direct Data Ingestion
      // When Apps Script returns rows array directly, write to Turso immediately!
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        const syncRes = await syncGoogleSheetRows(data.rows);
        return NextResponse.json({
          success: true,
          action,
          totalProcessed: syncRes.recordsProcessed,
          totalUpdated: syncRes.updatedCount,
          totalAppended: syncRes.newCount,
          newCreators: syncRes.newCreators,
          message: `Successfully synchronized ${syncRes.recordsProcessed} deliverables (${syncRes.updatedCount} updated, ${syncRes.newCount} new rows added to database).`,
          employee: data.employee || employee,
        });
      }

      // CASE 2: Apps Script executed via reverse Webhook or background sync
      // Check if the webhook successfully recorded a recent sync log
      const recentLog = await db.execute({
        sql: `SELECT * FROM sync_logs WHERE status = 'SUCCESS' ORDER BY id DESC LIMIT 1`
      });

      let updatedCount = data.totalUpdated ?? 0;
      let newCount = data.totalAppended ?? 0;
      let processedCount = data.totalProcessed ?? (updatedCount + newCount);
      let newCreatorsList: string[] = Array.isArray(data.newCreators) ? data.newCreators : [];

      if (recentLog.rows.length > 0) {
        const lastLog: any = recentLog.rows[0];
        const logTimestamp = new Date(lastLog.timestamp || 0).getTime();
        const now = Date.now();
        // If a sync was recorded by the webhook within the last 30 seconds
        if (now - logTimestamp < 30000 && Number(lastLog.records_synced) > 0) {
          processedCount = Number(lastLog.records_synced);
        }
      }

      // If this was a pull action, record to sync_logs
      if (action.startsWith("pull_")) {
        const sourceName = action === "pull_employee"
          ? `Employee Sheet (${employee || data.employee || "Single"})`
          : "All Employee Sheets";

        const nCreators = newCreatorsList.length > 0 ? `. New Creators: ${newCreatorsList.join(", ")}` : "";
        const detailsStr = `${updatedCount} rows updated, ${newCount} new rows added${nCreators}`;

        await db.execute({
          sql: `INSERT INTO sync_logs (source, records_synced, status, details) VALUES (?, ?, ?, ?)`,
          args: [
            sourceName,
            processedCount,
            "SUCCESS",
            detailsStr
          ]
        });
      }

      return NextResponse.json({
        ...data,
        totalProcessed: processedCount,
        totalUpdated: updatedCount,
        totalAppended: newCount,
        newCreators: newCreatorsList,
      });
    } else {
      const text = await res.text();
      if (text.includes("accounts.google.com") || text.includes("ServiceLogin") || text.includes("permission")) {
        return NextResponse.json({
          success: false,
          error: "Google Apps Script requires authorization. In Google Apps Script > Deploy > Manage Deployments > Edit (pencil icon), set 'Who has access' to 'Anyone' and re-deploy.",
        }, { status: 401 });
      }
      if (res.status === 404 || text.includes("Page not found") || text.includes("unable to open the file")) {
        return NextResponse.json({
          success: false,
          error: "Google Apps Script Web App returned 404 (Not Found). In your Google Sheet, open Extensions > Apps Script > Deploy > Manage Deployments, make sure 'Who has access' is set to 'Anyone', copy the fresh Web App URL ending in '/exec', and paste it in the Connection & Diagnostics tab.",
        }, { status: 404 });
      }
      return NextResponse.json({
        success: false,
        error: `Apps Script execution failed with HTTP status ${res.status}.`,
        message: `Execution completed with status ${res.status}.`,
        raw: text.slice(0, 300)
      }, { status: res.status });
    }
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Failed to trigger Apps Script execution." 
    }, { status: 500 });
  }
}
