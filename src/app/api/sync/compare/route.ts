import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/db";
import { 
  mapRowToDeliverable, 
  syncGoogleSheetRows, 
  SheetRowRaw,
  parseString 
} from "@/lib/sync/sheet-mapper";

export const dynamic = "force-dynamic";

interface FieldDiff {
  field: string;
  label: string;
  dbValue: any;
  sheetValue: any;
}

interface ModifiedRecord {
  id: string;
  creator_name: string;
  campaign_name: string;
  deliverables: string;
  changes: FieldDiff[];
  rawRow: SheetRowRaw;
}

interface MissingRecord {
  id: string;
  creator_name: string;
  campaign_name: string;
  deliverables?: string;
  status?: string;
  rawRow?: SheetRowRaw;
}

/**
 * GET: Compares Turso database with the master "Execution Pipeline" (Flow sheet).
 * Non-destructive and read-only.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientUrl = searchParams.get("webAppUrl");
    const serverDefaultUrl = (
      process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL || 
      process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBAPP_URL || 
      "https://script.google.com/macros/s/AKfycbz5TbRW5dWaTrScczn6CnoqYaBtlKqvT3bYKbxT5Z8jV4NK4KG7QVI59fUa8YiKFdU1/exec"
    ).trim();

    const targetUrl = (clientUrl && clientUrl.startsWith("http")) ? clientUrl.trim() : serverDefaultUrl;

    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: "Google Apps Script Web App URL is not configured.",
      }, { status: 400 });
    }

    // 1. Fetch live Flow sheet rows from Apps Script (read-only, no webhook push)
    const scriptUrl = new URL(targetUrl);
    scriptUrl.searchParams.set("action", "read_flow");

    let sheetRes = await fetch(scriptUrl.toString(), {
      method: "GET",
      headers: { "User-Agent": "Xcelerate-Pulse-Compare" },
      cache: "no-store",
      redirect: "follow",
      signal: req.signal,
    });

    // If client-provided URL returned 404 or auth error, retry with server default URL
    if (!sheetRes.ok && clientUrl && serverDefaultUrl && clientUrl !== serverDefaultUrl) {
      try {
        const fallbackUrl = new URL(serverDefaultUrl);
        fallbackUrl.searchParams.set("action", "read_flow");
        const fallbackRes = await fetch(fallbackUrl.toString(), {
          method: "GET",
          headers: { "User-Agent": "Xcelerate-Pulse-Compare" },
          cache: "no-store",
          redirect: "follow",
          signal: req.signal,
        });
        if (fallbackRes.ok) {
          sheetRes = fallbackRes;
        }
      } catch (_) {}
    }

    if (!sheetRes.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch Flow sheet from Google Apps Script (HTTP ${sheetRes.status}). Ensure Web App is deployed with access 'Anyone'.`,
      }, { status: 502 });
    }

    const sheetJson = await sheetRes.json();
    if (!sheetJson || !Array.isArray(sheetJson.rows)) {
      return NextResponse.json({
        success: false,
        error: sheetJson?.error || "Google Apps Script did not return rows array.",
        raw: sheetJson
      }, { status: 500 });
    }

    const rawSheetRows: SheetRowRaw[] = sheetJson.rows;

    // 2. Fetch all current deliverables from Turso DB
    await initDatabase();
    const dbRes = await db.execute({
      sql: `SELECT id, campaign_id, creator_name, deliverables, 
                   execution_status, live_link, total_views, likes, comments, 
                   brand_cost, creator_cost, gross_margin, execution_owner, brief_name, 
                   brand_agency_poc, invoice_status, updated_at
            FROM campaign_creators`
    });

    const dbMap = new Map<string, any>();
    for (const row of dbRes.rows) {
      if (row.id) {
        dbMap.set(String(row.id), row);
      }
    }

    // 3. Map sheet rows to deliverables and compare
    const sheetMap = new Map<string, { deliverable: any; rawRow: SheetRowRaw; campaign: any }>();
    const fingerprintCounts = new Map<string, number>();
    const seenIdsInBatch = new Map<string, number>();

    const inSyncIds: string[] = [];
    const modifiedRecords: ModifiedRecord[] = [];
    const missingInDbRecords: MissingRecord[] = [];

    for (let idx = 0; idx < rawSheetRows.length; idx++) {
      const rawRow = rawSheetRows[idx];

      const rawUid = parseString(
        rawRow["Unique_ID"] || rawRow["unique_id"] || rawRow["uniqueid"], 
        ""
      );
      const explicitId = (rawUid && rawUid !== "#ERROR!" && rawUid.length > 5)
        ? rawUid
        : parseString(
            rawRow["Deliverable ID"] || 
            rawRow["deliverable_id"] || 
            rawRow["UID"] || 
            rawRow["uid"] || 
            rawRow["ID"] || 
            rawRow["id"] || 
            rawRow["_id"] || 
            rawRow["Execution ID"] || 
            rawRow["execution_id"] || 
            rawRow["Row ID"] || 
            rawRow["row_id"] || 
            rawRow["#"],
            ""
          );

      let occurrence = 1;
      if (!explicitId) {
        const campId = parseString(rawRow["Campaign ID"] || rawRow["campaign_id"], "CAMP-DEFAULT");
        const cName = parseString(rawRow["Creator Name"] || rawRow["creator_name"], "creator").toLowerCase().replace(/[^a-z0-9]/g, "");
        const dTag = parseString(rawRow["Deliverables"] || rawRow["deliverables"], "").toLowerCase().replace(/[^a-z0-9]/g, "") || "d1";
        const baseKey = `${campId}_${cName}_${dTag}`;
        occurrence = (fingerprintCounts.get(baseKey) || 0) + 1;
        fingerprintCounts.set(baseKey, occurrence);
      }

      const { campaign, deliverable } = mapRowToDeliverable(rawRow, idx, occurrence);
      if (!deliverable.id) continue;

      // Safeguard: Disambiguate duplicate Deliverable IDs within the same sync batch
      const baseId = deliverable.id;
      if (seenIdsInBatch.has(baseId)) {
        const dupeCount = (seenIdsInBatch.get(baseId) || 1) + 1;
        seenIdsInBatch.set(baseId, dupeCount);
        const rowSuffix = rawRow["_sheet_row"] ? `_r${rawRow["_sheet_row"]}` : `_d${dupeCount}`;
        deliverable.id = `${baseId}${rowSuffix}`;
        (deliverable as any).unique_id = deliverable.id;
      } else {
        seenIdsInBatch.set(baseId, 1);
      }

      sheetMap.set(deliverable.id, { deliverable, rawRow, campaign });

      const dbRecord = dbMap.get(deliverable.id);
      const campaignTitle = campaign.campaign_name || deliverable.campaign_id;

      if (!dbRecord) {
        missingInDbRecords.push({
          id: deliverable.id,
          creator_name: deliverable.creator_name || "Unknown",
          campaign_name: campaignTitle,
          deliverables: deliverable.deliverables || "N/A",
          status: deliverable.execution_status || "Pending",
          rawRow
        });
      } else {
        // Compare key fields
        const changes: FieldDiff[] = [];

        const checkDiff = (field: string, label: string, dbVal: any, sheetVal: any, isNum: boolean = false) => {
          if (isNum) {
            const nDb = Number(dbVal || 0);
            const nSheet = Number(sheetVal || 0);
            if (nDb !== nSheet) {
              changes.push({ field, label, dbValue: nDb, sheetValue: nSheet });
            }
          } else {
            const sDb = String(dbVal || "").trim().toLowerCase();
            const sSheet = String(sheetVal || "").trim().toLowerCase();
            if (sDb !== sSheet) {
              changes.push({ field, label, dbValue: dbVal || "(empty)", sheetValue: sheetVal || "(empty)" });
            }
          }
        };

        checkDiff("execution_status", "Status", dbRecord.execution_status, deliverable.execution_status);
        checkDiff("creator_name", "Creator Name", dbRecord.creator_name, deliverable.creator_name);
        checkDiff("total_views", "Views", dbRecord.total_views, deliverable.total_views, true);
        checkDiff("live_link", "Live Link", dbRecord.live_link, deliverable.live_link);
        checkDiff("deliverables", "Deliverables", dbRecord.deliverables, deliverable.deliverables);
        checkDiff("brand_cost", "Commercial / Brand Cost", dbRecord.brand_cost, deliverable.brand_cost, true);
        checkDiff("creator_cost", "Creator Cost", dbRecord.creator_cost, (deliverable as any).creator_cost, true);
        checkDiff("execution_owner", "Execution Owner", dbRecord.execution_owner, (deliverable as any).execution_owner);
        checkDiff("invoice_status", "Invoice Status", dbRecord.invoice_status, (deliverable as any).invoice_status);

        if (changes.length > 0) {
          modifiedRecords.push({
            id: deliverable.id,
            creator_name: deliverable.creator_name,
            campaign_name: campaignTitle,
            deliverables: deliverable.deliverables,
            changes,
            rawRow
          });
        } else {
          inSyncIds.push(deliverable.id);
        }
      }
    }

    // 4. Find records that exist in Turso DB but are not in the spreadsheet
    const missingInSheetRecords: MissingRecord[] = [];
    for (const [id, dbRecord] of dbMap.entries()) {
      if (!sheetMap.has(id)) {
        missingInSheetRecords.push({
          id,
          creator_name: dbRecord.creator_name || "Unknown",
          campaign_name: dbRecord.brief_name || dbRecord.campaign_id || "Unknown",
          deliverables: dbRecord.deliverables || "N/A",
          status: dbRecord.execution_status || "Unknown"
        });
      }
    }

    const totalSheetRows = sheetMap.size;
    const totalDbRows = dbMap.size;
    const needsUpdate = modifiedRecords.length > 0 || missingInDbRecords.length > 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalSheetRows,
        totalDbRows,
        inSyncCount: inSyncIds.length,
        modifiedCount: modifiedRecords.length,
        missingInDbCount: missingInDbRecords.length,
        missingInSheetCount: missingInSheetRecords.length,
        needsUpdate
      },
      differences: {
        modified: modifiedRecords,
        missingInDb: missingInDbRecords,
        missingInSheet: missingInSheetRecords
      },
      rawSheetCount: rawSheetRows.length
    });
  } catch (err: any) {
    console.error("Comparison failed:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to compare database with Execution Pipeline.",
    }, { status: 500 });
  }
}

/**
 * POST: Keeps Turso database updated according to Google Spreadsheet ("Execution Pipeline").
 * Upserts modified and missing records or runs full synchronization.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action = "apply_differences", 
      webAppUrl,
      rowsToSync = [],
      markDroppedIds = []
    } = body;

    await initDatabase();

    let targetRows: SheetRowRaw[] = rowsToSync;

    // If client didn't supply rowsToSync, fetch live Flow sheet rows from Apps Script directly
    if (!Array.isArray(targetRows) || targetRows.length === 0) {
      const serverDefaultUrl = (
        process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL || 
        process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBAPP_URL || 
        "https://script.google.com/macros/s/AKfycbz5TbRW5dWaTrScczn6CnoqYaBtlKqvT3bYKbxT5Z8jV4NK4KG7QVI59fUa8YiKFdU1/exec"
      ).trim();

      const targetUrl = (webAppUrl && String(webAppUrl).startsWith("http")) ? String(webAppUrl).trim() : serverDefaultUrl;
      const scriptUrl = new URL(targetUrl);
      scriptUrl.searchParams.set("action", "read_flow");

      const sheetRes = await fetch(scriptUrl.toString(), {
        method: "GET",
        headers: { "User-Agent": "Xcelerate-Pulse-Update" },
        cache: "no-store",
        redirect: "follow",
        signal: req.signal,
      });

      if (!sheetRes.ok) {
        return NextResponse.json({
          success: false,
          error: `Failed to fetch live Flow sheet rows (HTTP ${sheetRes.status}).`,
        }, { status: 502 });
      }

      const sheetJson = await sheetRes.json();
      if (!sheetJson || !Array.isArray(sheetJson.rows)) {
        return NextResponse.json({
          success: false,
          error: "Failed to extract rows from Execution Pipeline spreadsheet.",
        }, { status: 500 });
      }

      targetRows = sheetJson.rows;
    }

    if (targetRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No rows to update.",
        recordsProcessed: 0,
        unchangedCount: 0,
        newCount: 0,
        updatedCount: 0,
        newRecords: [],
        modifiedRecords: [],
      });
    }

    // 1. Fetch current DB records to compute genuine differences (not false positives)
    const dbRes = await db.execute({
      sql: `SELECT id, campaign_id, creator_name, deliverables, 
                   execution_status, live_link, total_views, likes, comments, 
                   brand_cost, creator_cost, gross_margin, execution_owner, brief_name, 
                   brand_agency_poc, invoice_status
            FROM campaign_creators`
    });

    const dbMap = new Map<string, any>();
    for (const row of dbRes.rows) {
      if (row.id) {
        dbMap.set(String(row.id), row);
      }
    }

    // 2. Identify genuine new records and genuine field modifications
    const newRecords: Array<{
      id: string;
      creator_name: string;
      campaign_name: string;
      deliverables: string;
      status: string;
    }> = [];

    const modifiedRecords: Array<{
      id: string;
      creator_name: string;
      campaign_name: string;
      changeSummary: string;
    }> = [];

    let unchangedCount = 0;
    const fingerprintCounts = new Map<string, number>();
    const seenIdsInBatch = new Map<string, number>();

    for (let idx = 0; idx < targetRows.length; idx++) {
      const rawRow = targetRows[idx];
      const rawUid = parseString(rawRow["Unique_ID"] || rawRow["unique_id"] || rawRow["uniqueid"], "");
      const explicitId = (rawUid && rawUid !== "#ERROR!" && rawUid.length > 5)
        ? rawUid
        : parseString(
            rawRow["Deliverable ID"] || rawRow["deliverable_id"] || rawRow["UID"] || rawRow["uid"] || rawRow["ID"] || rawRow["id"], 
            ""
          );

      let occurrence = 1;
      if (!explicitId) {
        const campId = parseString(rawRow["Campaign ID"] || rawRow["campaign_id"], "CAMP-DEFAULT");
        const cName = parseString(rawRow["Creator Name"] || rawRow["creator_name"], "creator").toLowerCase().replace(/[^a-z0-9]/g, "");
        const dTag = parseString(rawRow["Deliverables"] || rawRow["deliverables"], "").toLowerCase().replace(/[^a-z0-9]/g, "") || "d1";
        const baseKey = `${campId}_${cName}_${dTag}`;
        occurrence = (fingerprintCounts.get(baseKey) || 0) + 1;
        fingerprintCounts.set(baseKey, occurrence);
      }

      const { campaign, deliverable } = mapRowToDeliverable(rawRow, idx, occurrence);
      if (!deliverable.id) continue;

      // Safeguard: Disambiguate duplicate Deliverable IDs within the same sync batch
      const baseId = deliverable.id;
      if (seenIdsInBatch.has(baseId)) {
        const dupeCount = (seenIdsInBatch.get(baseId) || 1) + 1;
        seenIdsInBatch.set(baseId, dupeCount);
        const rowSuffix = rawRow["_sheet_row"] ? `_r${rawRow["_sheet_row"]}` : `_d${dupeCount}`;
        deliverable.id = `${baseId}${rowSuffix}`;
        (deliverable as any).unique_id = deliverable.id;
      } else {
        seenIdsInBatch.set(baseId, 1);
      }

      const dbRecord = dbMap.get(deliverable.id);
      const campaignTitle = campaign.campaign_name || deliverable.campaign_id;

      if (!dbRecord) {
        newRecords.push({
          id: deliverable.id,
          creator_name: deliverable.creator_name || "Unknown",
          campaign_name: campaignTitle,
          deliverables: deliverable.deliverables || "N/A",
          status: deliverable.execution_status || "Pending",
        });
      } else {
        const diffList: string[] = [];

        if (String(dbRecord.execution_status || "").trim().toLowerCase() !== String(deliverable.execution_status || "").trim().toLowerCase()) {
          diffList.push(`Status: ${deliverable.execution_status}`);
        }
        if (String(dbRecord.live_link || "").trim().toLowerCase() !== String(deliverable.live_link || "").trim().toLowerCase()) {
          diffList.push("Live Link updated");
        }
        if (Number(dbRecord.total_views || 0) !== Number(deliverable.total_views || 0)) {
          diffList.push(`Views: ${Number(deliverable.total_views).toLocaleString()}`);
        }
        if (Number(dbRecord.brand_cost || 0) !== Number(deliverable.brand_cost || 0)) {
          diffList.push(`Cost: ₹${deliverable.brand_cost}`);
        }
        if (String(dbRecord.deliverables || "").trim().toLowerCase() !== String(deliverable.deliverables || "").trim().toLowerCase()) {
          diffList.push(`Deliverables: ${deliverable.deliverables}`);
        }

        if (diffList.length > 0) {
          modifiedRecords.push({
            id: deliverable.id,
            creator_name: deliverable.creator_name,
            campaign_name: campaignTitle,
            changeSummary: diffList.join(" • "),
          });
        } else {
          unchangedCount++;
        }
      }
    }

    // 3. Upsert the rows into Turso DB using fast batch writes
    const syncRes = await syncGoogleSheetRows(targetRows);

    // Optionally mark records missing in sheet as 'Drop'
    let droppedCount = 0;
    if (Array.isArray(markDroppedIds) && markDroppedIds.length > 0) {
      const CHUNK = 200;
      for (let i = 0; i < markDroppedIds.length; i += CHUNK) {
        const chunk = markDroppedIds.slice(i, i + CHUNK);
        const placeholders = chunk.map(() => "?").join(",");
        await db.execute({
          sql: `UPDATE campaign_creators 
                SET execution_status = 'Drop', brand_cost = 0, creator_cost = 0, gross_margin = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${placeholders})`,
          args: chunk,
        });
        droppedCount += chunk.length;
      }
    }

    const logMsg = `Reconciled Turso DB with Execution Pipeline: ${syncRes.recordsProcessed} synced (${modifiedRecords.length} updated, ${newRecords.length} new added, ${unchangedCount} unchanged)${droppedCount > 0 ? `, ${droppedCount} marked as Drop` : ""}`;

    await db.execute({
      sql: `INSERT INTO sync_logs (source, records_synced, status, details) VALUES (?, ?, ?, ?)`,
      args: [
        "Execution Pipeline (Compare & Update)",
        syncRes.recordsProcessed,
        "SUCCESS",
        logMsg
      ]
    });

    const statusMsg = (newRecords.length > 0 || modifiedRecords.length > 0)
      ? `Synchronized: ${newRecords.length} new deliverable added, ${modifiedRecords.length} updated, ${unchangedCount} verified in sync.`
      : `Zero drift: All ${syncRes.recordsProcessed} deliverables match Google Sheet records identically.`;

    return NextResponse.json({
      success: true,
      recordsProcessed: syncRes.recordsProcessed,
      unchangedCount,
      newCount: newRecords.length,
      updatedCount: modifiedRecords.length,
      newRecords,
      modifiedRecords,
      droppedCount,
      message: statusMsg,
    });
  } catch (err: any) {
    console.error("Update failed:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to update database from Execution Pipeline.",
    }, { status: 500 });
  }
}
