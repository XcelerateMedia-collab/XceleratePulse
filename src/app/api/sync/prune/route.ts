import { NextRequest, NextResponse } from "next/server";
import { 
  reconcileDroppedDeliverables, 
  purgeDroppedDeliverables, 
  resetDatabaseCleanSlate 
} from "@/lib/db/actions";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    const { action, activeIds = [], scopeOwner, confirmKey, scopeType, scopeValue } = body;

    if (action === "reconcile") {
      const result = await reconcileDroppedDeliverables(activeIds, scopeOwner);
      return NextResponse.json(result);
    }

    if (action === "purge_dropped") {
      const result = await purgeDroppedDeliverables(scopeOwner);
      return NextResponse.json(result);
    }

    if (action === "reset_clean_slate") {
      const result = await resetDatabaseCleanSlate(confirmKey, scopeType, scopeValue);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
