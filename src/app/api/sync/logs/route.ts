import { NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();

    const result = await db.execute(`
      SELECT id, source, records_synced, status, details, timestamp
      FROM sync_logs
      ORDER BY id DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      logs: result.rows || [],
    });
  } catch (error: any) {
    console.error("Failed to fetch sync logs:", error);
    return NextResponse.json(
      { success: false, error: error.message, logs: [] },
      { status: 500 }
    );
  }
}
