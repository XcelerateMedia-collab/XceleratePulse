import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";
import { syncGoogleSheetRows } from "@/lib/sync/sheet-mapper";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const configuredKey = process.env.SYNC_API_KEY || "xcelerate-pulse-sync-secret";

    // Allow simple authorization token
    if (apiKey && apiKey !== configuredKey) {
      return NextResponse.json({ error: "Unauthorized. Invalid x-api-key." }, { status: 401 });
    }

    const body = await req.json();
    let rows: any[] = [];

    if (Array.isArray(body)) {
      rows = body;
    } else if (body.rows && Array.isArray(body.rows)) {
      rows = body.rows;
    } else if (typeof body === "object") {
      rows = [body];
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows provided in payload." }, { status: 400 });
    }

    const result = await syncGoogleSheetRows(rows);

    return NextResponse.json({
      message: "Sync completed successfully",
      recordsProcessed: result.recordsProcessed,
      updatedCount: result.updatedCount,
      newCount: result.newCount,
      newCreators: result.newCreators,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Sheets Sync API Error:", error);
    return NextResponse.json(
      { error: "Failed to process Google Sheet sync", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    message: "Xcelerate Pulse Sync Engine Active",
    database: "Turso LibSQL",
    timestamp: new Date().toISOString(),
  });
}
