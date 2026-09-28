import { NextRequest, NextResponse } from "next/server";
import { 
  getEmployeeSheets, 
  saveEmployeeSheet, 
  deleteEmployeeSheet, 
  toggleEmployeeSheetStatus,
  extractCleanSheetId 
} from "@/lib/db/actions";
import { db, initDatabase } from "@/lib/db";

/**
 * Helper to call Google Apps Script Web App
 */
async function callAppsScript(action: string, params: Record<string, string> = {}) {
  const targetUrl = (process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBAPP_URL || "").trim();
  if (!targetUrl || !targetUrl.startsWith("http")) return null;

  try {
    const url = new URL(targetUrl);
    url.searchParams.set("action", action);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "User-Agent": "Xcelerate-Pulse-Admin" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.error("callAppsScript failed for action " + action, err);
  }
  return null;
}

/**
 * GET /api/sync/employees
 * Returns all registered employee sheets from the Turso database.
 * If sync=true or DB is empty, syncs from Google Apps Script '⚙️ Employee Sheets' tab.
 */
export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const forceSync = searchParams.get("sync") === "true";

    let dbEmployees = await getEmployeeSheets();

    // If database has 0 or 1 employee, or user explicitly requested sync with Google Sheet
    if (forceSync || dbEmployees.length <= 1) {
      const remoteData = await callAppsScript("get_registry");
      if (remoteData && remoteData.success && Array.isArray(remoteData.registry)) {
        for (const item of remoteData.registry) {
          const empName = String(item.employee || "").trim();
          const cleanId = await extractCleanSheetId(String(item.sheetId || item.sheet_id || ""));
          const tab = String(item.tabName || item.tab_name || "ExecutionSheet").trim();
          if (empName && cleanId) {
            await saveEmployeeSheet({
              employee_name: empName,
              sheet_id: cleanId,
              tab_name: tab,
              status: "Active",
            });
          }
        }
        // Re-read updated list from database
        dbEmployees = await getEmployeeSheets();
      }
    }

    return NextResponse.json({
      success: true,
      employees: dbEmployees,
      totalCount: dbEmployees.length,
      activeCount: dbEmployees.filter(e => e.status === "Active").length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("GET /api/sync/employees error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/sync/employees
 * Registers or updates an employee sheet credentials in database and syncs to Google Sheet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employee_name, sheet_id, tab_name = "ExecutionSheet", status = "Active", id } = body;

    if (!employee_name || !String(employee_name).trim()) {
      return NextResponse.json({ success: false, error: "Employee name is required." }, { status: 400 });
    }
    if (!sheet_id || !String(sheet_id).trim()) {
      return NextResponse.json({ success: false, error: "Google Sheet ID or URL is required." }, { status: 400 });
    }

    const cleanId = await extractCleanSheetId(sheet_id);

    // 1. Save to Database (Turso / SQLite)
    const dbResult = await saveEmployeeSheet({
      id,
      employee_name: String(employee_name).trim(),
      sheet_id: cleanId,
      tab_name: String(tab_name).trim() || "ExecutionSheet",
      status: status === "Paused" ? "Paused" : "Active",
    });

    if (!dbResult.success) {
      return NextResponse.json({ success: false, error: dbResult.message }, { status: 400 });
    }

    // 2. Also propagate to Google Sheet '⚙️ Employee Sheets' tab via Google Apps Script Web App
    try {
      await callAppsScript("add_employee", {
        employee: String(employee_name).trim(),
        sheetId: cleanId,
        tabName: String(tab_name).trim() || "ExecutionSheet",
        status: status === "Paused" ? "Paused" : "Active",
      });
    } catch (remoteErr) {
      console.warn("Failed to propagate employee to Google Sheet registry:", remoteErr);
    }

    // Return the updated full list of employees
    const allEmployees = await getEmployeeSheets();

    return NextResponse.json({
      success: true,
      message: dbResult.message,
      employee: dbResult.employee,
      employees: allEmployees,
    });
  } catch (err: any) {
    console.error("POST /api/sync/employees error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/sync/employees
 * Removes an employee sheet from the database.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    const target = id || name;
    if (!target) {
      return NextResponse.json({ success: false, error: "Employee ID or name is required." }, { status: 400 });
    }

    const result = await deleteEmployeeSheet(target);

    // Also notify Google Apps Script if possible
    if (name) {
      callAppsScript("delete_employee", { employee: name }).catch(() => {});
    }

    const allEmployees = await getEmployeeSheets();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      employees: allEmployees,
    });
  } catch (err: any) {
    console.error("DELETE /api/sync/employees error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/sync/employees
 * Toggle Active / Paused status of an employee sheet.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Employee ID is required." }, { status: 400 });
    }

    const result = await toggleEmployeeSheetStatus(id);
    const allEmployees = await getEmployeeSheets();

    return NextResponse.json({
      ...result,
      employees: allEmployees,
    });
  } catch (err: any) {
    console.error("PATCH /api/sync/employees error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
