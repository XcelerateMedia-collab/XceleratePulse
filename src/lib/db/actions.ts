"use server";

import { db, initDatabase } from "@/lib/db";
import { 
  Role, 
  CreatorDeliverableInternal, 
  CreatorDeliverableBrandView, 
  CampaignSummary,
  BrandCredential,
  CampaignAccessMode,
  sanitizeForBrand,
  EmployeeSheet
} from "@/lib/types";

/**
 * Fetch all campaigns accessible to the user based on role, organization, and optional assigned campaigns.
 */
export async function getCampaigns(
  role: Role = "BRAND_CLIENT",
  orgName: string = "boAt Lifestyle",
  assignedCampaignIds?: string[]
): Promise<CampaignSummary[]> {
  await initDatabase();

  let sql = `
    SELECT 
      c.id, c.campaign_month, c.client_type, c.org_name, c.campaign_name,
      c.xcelerate_poc, c.brand_agency_poc, c.brand_payment_cycle, c.status, c.created_at,
      COUNT(d.id) as deliverables_count,
      SUM(COALESCE(d.total_views, 0)) as total_views,
      SUM(COALESCE(d.account_reach, 0)) as total_reach,
      AVG(COALESCE(d.engagement_rate, 0)) as avg_er,
      GROUP_CONCAT(DISTINCT d.execution_owner) as execution_owners
    FROM campaigns c
    LEFT JOIN campaign_creators d ON c.id = d.campaign_id
  `;

  const args: any[] = [];

  // Strict RBAC: Brand/Agency clients CAN NEVER see campaigns outside their organization
  if (role === "BRAND_CLIENT" || role === "AGENCY_CLIENT") {
    sql += " WHERE LOWER(c.org_name) = LOWER(?) ";
    args.push(orgName);
    if (assignedCampaignIds && assignedCampaignIds.length > 0) {
      const placeholders = assignedCampaignIds.map(() => "?").join(", ");
      sql += ` AND c.id IN (${placeholders}) `;
      args.push(...assignedCampaignIds);
    }
  } else if (role === "EMPLOYEE") {
    sql += ` WHERE (
      LOWER(COALESCE(c.xcelerate_poc, '')) = LOWER(?) 
      OR c.id IN (SELECT DISTINCT campaign_id FROM campaign_creators WHERE LOWER(COALESCE(execution_owner, '')) = LOWER(?))
    ) `;
    args.push(orgName, orgName); // orgName carries the employee name for EMPLOYEE role
    if (assignedCampaignIds && assignedCampaignIds.length > 0) {
      const placeholders = assignedCampaignIds.map(() => "?").join(", ");
      sql += ` AND c.id IN (${placeholders}) `;
      args.push(...assignedCampaignIds);
    }
  }
  // PERFORMANCE_ANALYST and SUPER_ADMIN/INTERNAL_OPS see everything

  sql += " GROUP BY c.id ORDER BY c.created_at DESC";

  const result = await db.execute({ sql, args });

  return result.rows.map((row: any) => ({
    id: String(row.id),
    campaign_month: String(row.campaign_month),
    client_type: String(row.client_type) as any,
    org_name: String(row.org_name),
    campaign_name: String(row.campaign_name),
    xcelerate_poc: String(row.xcelerate_poc || "Team Xcelerate"),
    brand_agency_poc: row.brand_agency_poc && String(row.brand_agency_poc).trim() && String(row.brand_agency_poc).trim() !== "Brand Manager" ? String(row.brand_agency_poc).trim() : "N/A",
    brand_payment_cycle: String(row.brand_payment_cycle || "Net 30"),
    status: String(row.status || "On Going") as any,
    created_at: String(row.created_at),
    deliverables_count: Number(row.deliverables_count || 0),
    total_views: Number(row.total_views || 0),
    total_reach: Number(row.total_reach || 0),
    avg_er: Number((Number(row.avg_er || 0)).toFixed(2)),
    execution_owners: row.execution_owners
      ? String(row.execution_owners)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],
  }));
}

function cleanDateOnly(val: any): string {
  if (!val) return "";
  const s = String(val).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.split("T")[0].trim();
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) return s.split(/\s+/)[0].trim();
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s/.test(s)) return s.split(/\s+/)[0].trim();
  return s;
}

function mapRowToDeliverable(r: any): CreatorDeliverableInternal {
  return {
    id: String(r.id),
    campaign_id: String(r.campaign_id),
    campaign_name: r.campaign_name ? String(r.campaign_name) : undefined,
    org_name: r.org_name ? String(r.org_name) : undefined,
    client_type: r.client_type ? String(r.client_type) : undefined,
    campaign_month: r.campaign_month ? String(r.campaign_month) : undefined,
    creator_name: String(r.creator_name),
    niche: String(r.niche),
    profile_url: String(r.profile_url || ""),
    followers_count: Number(r.followers_count || 0),
    category: String(r.category || "Micro") as any,
    city: String(r.city || ""),
    state: String(r.state || ""),
    language: String(r.language || ""),
    gender: String(r.gender || ""),
    phone_number: String(r.phone_number || ""),
    deliverables: String(r.deliverables || "1 Reel"),
    brand_cost: Number(r.brand_cost || 0),
    creator_cost: Number(r.creator_cost || 0),
    gross_margin: Number(r.gross_margin || 0),
    address: String(r.address || ""),
    product_status: String(r.product_status || "Not Applicable") as any,
    confirmation_mail_status: String(r.confirmation_mail_status || "Pending") as any,
    script_link: String(r.script_link || ""),
    script_status: String(r.script_status || "Script Pending") as any,
    script_approval_date: cleanDateOnly(r.script_approval_date),
    first_draft_status: String(r.first_draft_status || "Draft Pending") as any,
    first_draft_date: cleanDateOnly(r.first_draft_date),
    revision_drive_link: String(r.revision_drive_link || ""),
    final_video_status: String(r.final_video_status || "Approval Pending") as any,
    video_approval_date: cleanDateOnly(r.video_approval_date),
    live_link: String(r.live_link || ""),
    live_date: cleanDateOnly(r.live_date),
    execution_status: String(r.execution_status || "On Going") as any,
    total_views: Number(r.total_views || 0),
    likes: Number(r.likes || 0),
    comments: Number(r.comments || 0),
    saves: Number(r.saves || 0),
    shares: Number(r.shares || 0),
    avg_watch_time: String(r.avg_watch_time || "-"),
    engagement_rate: Number(r.engagement_rate || 0),
    account_reach: Number(r.account_reach || 0),
    screenshots: String(r.screenshots || "[]"),
    day7_views: Number(r.day7_views || 0),
    day7_er: Number(r.day7_er || 0),
    day7_reach: Number(r.day7_reach || 0),
    day7_likes: Number(r.day7_likes || 0),
    day7_comments: Number(r.day7_comments || 0),
    day7_saves: Number(r.day7_saves || 0),
    day7_shares: Number(r.day7_shares || 0),
    day7_avg_watch_time: r.day7_avg_watch_time ? String(r.day7_avg_watch_time) : undefined,
    day7_screenshot: r.day7_screenshot ? String(r.day7_screenshot) : undefined,
    day15_views: Number(r.day15_views || 0),
    day15_er: Number(r.day15_er || 0),
    day15_reach: Number(r.day15_reach || 0),
    day15_likes: Number(r.day15_likes || 0),
    day15_comments: Number(r.day15_comments || 0),
    day15_saves: Number(r.day15_saves || 0),
    day15_shares: Number(r.day15_shares || 0),
    day15_avg_watch_time: r.day15_avg_watch_time ? String(r.day15_avg_watch_time) : undefined,
    day15_screenshot: r.day15_screenshot ? String(r.day15_screenshot) : undefined,
    day30_views: Number(r.day30_views || 0),
    day30_er: Number(r.day30_er || 0),
    day30_reach: Number(r.day30_reach || 0),
    day30_likes: Number(r.day30_likes || 0),
    day30_comments: Number(r.day30_comments || 0),
    day30_saves: Number(r.day30_saves || 0),
    day30_shares: Number(r.day30_shares || 0),
    day30_avg_watch_time: r.day30_avg_watch_time ? String(r.day30_avg_watch_time) : undefined,
    day30_screenshot: r.day30_screenshot ? String(r.day30_screenshot) : undefined,
    execution_owner: r.execution_owner ? String(r.execution_owner) : undefined,
    xcelerate_poc: r.xcelerate_poc ? String(r.xcelerate_poc) : (r.execution_owner ? String(r.execution_owner) : undefined),
    brief_name: r.brief_name ? String(r.brief_name) : undefined,
    brand_agency_poc: r.brand_agency_poc ? String(r.brand_agency_poc) : undefined,
    creator_payment_cycle: r.creator_payment_cycle ? String(r.creator_payment_cycle) : undefined,
    brand_receive_payment_cycle: r.brand_receive_payment_cycle ? String(r.brand_receive_payment_cycle) : undefined,
    brand_payment_status: r.brand_payment_status ? String(r.brand_payment_status) : undefined,
    invoice_pdf_link: r.invoice_pdf_link ? String(r.invoice_pdf_link) : undefined,
    invoice_direct_link: r.invoice_direct_link ? String(r.invoice_direct_link) : undefined,
    tracking_id: r.tracking_id ? String(r.tracking_id) : undefined,
    invoice_status: r.invoice_status ? String(r.invoice_status) : undefined,
    invoice_generated_on: r.invoice_generated_on ? String(r.invoice_generated_on) : undefined,
    invoice_number: r.invoice_number ? String(r.invoice_number) : undefined,
    creator_email: r.creator_email ? String(r.creator_email) : undefined,
    invoice_amount: r.invoice_amount !== null && r.invoice_amount !== undefined ? Number(r.invoice_amount) : undefined,
    gst_amount: r.gst_amount !== null && r.gst_amount !== undefined ? Number(r.gst_amount) : undefined,
    invoice_total: r.invoice_total !== null && r.invoice_total !== undefined ? Number(r.invoice_total) : undefined,
    unique_id: r.unique_id ? String(r.unique_id) : undefined,
    source_sheet: r.source_sheet ? String(r.source_sheet) : undefined,
    updated_at: String(r.updated_at || ""),
  };
}

/**
 * Fetch creators & execution pipeline for a specific campaign or ALL campaigns.
 * Strictly sanitizes confidential agency margins & phone numbers for clients.
 */
export async function getCampaignDeliverables(
  campaignId: string,
  role: Role = "BRAND_CLIENT",
  orgName: string = "boAt Lifestyle",
  assignedCampaignIds?: string[]
): Promise<{
  campaign: CampaignSummary | null;
  deliverables: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  isInternal: boolean;
}> {
  await initDatabase();
  const isFinancialAdmin = role === "SUPER_ADMIN" || role === "INTERNAL_OPS";
  const isInternal = isFinancialAdmin;

  // Handle "ALL" option to view all campaigns and creators consolidated
  if (campaignId === "ALL" || !campaignId) {
    const campaign: CampaignSummary = {
      id: "ALL",
      campaign_month: "All Months",
      client_type: "Brand",
      org_name: (isFinancialAdmin || role === "PERFORMANCE_ANALYST") ? "All Organizations" : orgName,
      campaign_name: "All Campaigns (Consolidated Overview)",
      xcelerate_poc: "All Leads",
      brand_agency_poc: "All Leads",
      brand_payment_cycle: "Multiple Cycles",
      status: "On Going",
      created_at: new Date().toISOString(),
    };

    let delivSql = `
      SELECT 
        d.*,
        c.campaign_name,
        c.org_name,
        c.client_type,
        c.campaign_month,
        c.xcelerate_poc,
        COALESCE(NULLIF(d.brand_agency_poc, ''), c.brand_agency_poc) as brand_agency_poc,
        COALESCE(NULLIF(d.brief_name, ''), c.brief_name) as brief_name
      FROM campaign_creators d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
    `;
    const delivArgs: any[] = [];

    if (role === "BRAND_CLIENT" || role === "AGENCY_CLIENT") {
      delivSql += ` WHERE LOWER(c.org_name) = LOWER(?)`;
      delivArgs.push(orgName);
      if (assignedCampaignIds && assignedCampaignIds.length > 0) {
        const placeholders = assignedCampaignIds.map(() => "?").join(", ");
        delivSql += ` AND c.id IN (${placeholders})`;
        delivArgs.push(...assignedCampaignIds);
      }
    } else if (role === "EMPLOYEE") {
      delivSql += ` WHERE (LOWER(COALESCE(d.execution_owner, '')) = LOWER(?) OR LOWER(COALESCE(c.xcelerate_poc, '')) = LOWER(?))`;
      delivArgs.push(orgName, orgName); // orgName carries the employee name for EMPLOYEE role
      if (assignedCampaignIds && assignedCampaignIds.length > 0) {
        const placeholders = assignedCampaignIds.map(() => "?").join(", ");
        delivSql += ` AND c.id IN (${placeholders})`;
        delivArgs.push(...assignedCampaignIds);
      }
    }
    // PERFORMANCE_ANALYST sees all creators across campaigns without confidential commercials

    delivSql += ` ORDER BY d.updated_at DESC, d.followers_count DESC`;
    const delivResult = await db.execute({ sql: delivSql, args: delivArgs });
    const rawDeliverables = delivResult.rows.map(mapRowToDeliverable);

    const sanitizedDeliverables = isFinancialAdmin
      ? rawDeliverables
      : rawDeliverables.map(sanitizeForBrand);

    return {
      campaign,
      deliverables: sanitizedDeliverables,
      isInternal,
    };
  }

  // 1. Verify Campaign Access
  // If specific campaign IDs assigned, strictly verify this campaignId is within them
  if (assignedCampaignIds && assignedCampaignIds.length > 0 && !assignedCampaignIds.includes(campaignId)) {
    return { campaign: null, deliverables: [], isInternal: false };
  }

  let campSql = `SELECT * FROM campaigns WHERE id = ?`;
  const campArgs: any[] = [campaignId];

  if (role === "BRAND_CLIENT" || role === "AGENCY_CLIENT") {
    campSql += ` AND LOWER(org_name) = LOWER(?)`;
    campArgs.push(orgName);
  } else if (role === "EMPLOYEE") {
    campSql += ` AND (
      LOWER(COALESCE(xcelerate_poc, '')) = LOWER(?)
      OR id IN (SELECT DISTINCT campaign_id FROM campaign_creators WHERE LOWER(COALESCE(execution_owner, '')) = LOWER(?))
    )`;
    campArgs.push(orgName, orgName);
  }

  const campResult = await db.execute({ sql: campSql, args: campArgs });
  if (campResult.rows.length === 0) {
    return { campaign: null, deliverables: [], isInternal: false };
  }

  const cRow = campResult.rows[0];
  const campaign: CampaignSummary = {
    id: String(cRow.id),
    campaign_month: String(cRow.campaign_month),
    client_type: String(cRow.client_type) as any,
    org_name: String(cRow.org_name),
    campaign_name: String(cRow.campaign_name),
    xcelerate_poc: String(cRow.xcelerate_poc || "Team Xcelerate"),
    brand_agency_poc: cRow.brand_agency_poc && String(cRow.brand_agency_poc).trim() && String(cRow.brand_agency_poc).trim() !== "Brand Manager" ? String(cRow.brand_agency_poc).trim() : "N/A",
    brand_payment_cycle: String(cRow.brand_payment_cycle || ""),
    status: String(cRow.status || "On Going") as any,
    created_at: String(cRow.created_at),
  };

  // 2. Query Deliverables (Strictly isolated by execution_owner or xcelerate_poc for EMPLOYEE)
  let delivSql = `
    SELECT 
      d.*,
      c.campaign_name,
      c.org_name,
      c.client_type,
      c.campaign_month,
      c.xcelerate_poc,
      COALESCE(NULLIF(d.brand_agency_poc, ''), c.brand_agency_poc) as brand_agency_poc,
      COALESCE(NULLIF(d.brief_name, ''), c.brief_name) as brief_name
    FROM campaign_creators d
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE d.campaign_id = ?
  `;
  const delivArgs: any[] = [campaignId];

  if (role === "EMPLOYEE") {
    delivSql += ` AND (LOWER(COALESCE(d.execution_owner, '')) = LOWER(?) OR LOWER(COALESCE(c.xcelerate_poc, '')) = LOWER(?))`;
    delivArgs.push(orgName, orgName);
  }

  delivSql += ` ORDER BY d.followers_count DESC`;

  const delivResult = await db.execute({
    sql: delivSql,
    args: delivArgs,
  });

  const rawDeliverables = delivResult.rows.map(mapRowToDeliverable);

  // PHYSICAL STRIPPING for clients
  const sanitizedDeliverables = isInternal
    ? rawDeliverables
    : rawDeliverables.map(sanitizeForBrand);

  return {
    campaign,
    deliverables: sanitizedDeliverables,
    isInternal,
  };
}

/**
 * Internal Ops: Fetch P&L and Margin Overview across all campaigns
 */
export async function getAgencyFinancialSummary() {
  await initDatabase();

  const stats = await db.execute(`
    SELECT 
      COUNT(DISTINCT c.id) as total_campaigns,
      COUNT(d.id) as total_creators,
      SUM(COALESCE(d.brand_cost, 0)) as total_brand_revenue,
      SUM(COALESCE(d.creator_cost, 0)) as total_creator_payout,
      SUM(COALESCE(d.gross_margin, 0)) as total_gross_margin
    FROM campaigns c
    LEFT JOIN campaign_creators d ON c.id = d.campaign_id
  `);

  const row = stats.rows[0];
  const revenue = Number(row?.total_brand_revenue || 0);
  const payout = Number(row?.total_creator_payout || 0);
  const margin = Number(row?.total_gross_margin || 0);
  const marginPct = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : "0.0";

  return {
    totalCampaigns: Number(row?.total_campaigns || 0),
    totalCreators: Number(row?.total_creators || 0),
    totalBrandRevenue: revenue,
    totalCreatorPayout: payout,
    totalGrossMargin: margin,
    marginPercentage: Number(marginPct),
  };
}

/**
 * Update a deliverable with automated field derivation, status cascading & auto-dates.
 */
export async function updateDeliverableWithAutomation(
  deliverableId: string,
  partialUpdates: Partial<CreatorDeliverableInternal>
): Promise<{
  success: boolean;
  deliverable?: CreatorDeliverableInternal;
  automationsApplied: string[];
}> {
  await initDatabase();

  const existingRes = await db.execute({
    sql: `SELECT * FROM campaign_creators WHERE id = ?`,
    args: [deliverableId],
  });

  if (existingRes.rows.length === 0) {
    return { success: false, automationsApplied: ["Deliverable not found"] };
  }

  const existing = existingRes.rows[0] as any;
  const merged: any = { ...existing, ...partialUpdates };

  const { deriveCategoryFromFollowers, computeCommercialAutomations, computeEngagementAutomations, applySmartStatusCascades } = await import("@/lib/automation/rules");

  const automationsApplied: string[] = [];

  // 1. Auto Category by follower count
  if (merged.followers_count !== undefined) {
    const derivedCategory = deriveCategoryFromFollowers(Number(merged.followers_count));
    if (derivedCategory !== merged.category) {
      automationsApplied.push(`Auto-Category: ${merged.category} → ${derivedCategory} (${Number(merged.followers_count).toLocaleString()} followers)`);
      merged.category = derivedCategory;
    }
  }

  // 2. Auto Commercials & Margin
  const { grossMargin } = computeCommercialAutomations(Number(merged.brand_cost || 0), Number(merged.creator_cost || 0), merged.gross_margin ? Number(merged.gross_margin) : undefined);
  merged.gross_margin = grossMargin;

  // 3. Auto Engagement
  const { computedEr } = computeEngagementAutomations(
    Number(merged.total_views || 0),
    Number(merged.likes || 0),
    Number(merged.comments || 0),
    Number(merged.saves || 0),
    Number(merged.shares || 0),
    Number(merged.account_reach || 0),
    Number(merged.brand_cost || 0),
    Number(merged.engagement_rate || 0)
  );
  merged.engagement_rate = computedEr;

  // 4. Auto Status Cascading & Dependent Column Updates
  const { updated, automationsApplied: cascadeLogs } = applySmartStatusCascades(merged);
  automationsApplied.push(...cascadeLogs);

  // 4b. Auto-reflect milestone metrics into overall performance if updating milestone
  const has30d = Number(merged.day30_views || 0) > 0 || Number(merged.day30_er || 0) > 0;
  const has15d = Number(merged.day15_views || 0) > 0 || Number(merged.day15_er || 0) > 0;
  const has7d = Number(merged.day7_views || 0) > 0 || Number(merged.day7_er || 0) > 0;

  const isUpdatingMilestone = (
    partialUpdates.day30_views !== undefined ||
    partialUpdates.day15_views !== undefined ||
    partialUpdates.day7_views !== undefined
  );

  if (isUpdatingMilestone && partialUpdates.total_views === undefined) {
    if (has30d && partialUpdates.day30_views !== undefined) {
      merged.total_views = Number(merged.day30_views || 0);
      merged.engagement_rate = Number(merged.day30_er || 0);
      if (merged.day30_reach) merged.account_reach = Number(merged.day30_reach);
      if (merged.day30_likes) merged.likes = Number(merged.day30_likes);
      if (merged.day30_comments) merged.comments = Number(merged.day30_comments);
      if (merged.day30_saves) merged.saves = Number(merged.day30_saves);
      if (merged.day30_shares) merged.shares = Number(merged.day30_shares);
      if (merged.day30_avg_watch_time) merged.avg_watch_time = String(merged.day30_avg_watch_time);
      automationsApplied.push("Reflected Day 30 metrics to Overall Performance");
    } else if (has15d && partialUpdates.day15_views !== undefined) {
      merged.total_views = Number(merged.day15_views || 0);
      merged.engagement_rate = Number(merged.day15_er || 0);
      if (merged.day15_reach) merged.account_reach = Number(merged.day15_reach);
      if (merged.day15_likes) merged.likes = Number(merged.day15_likes);
      if (merged.day15_comments) merged.comments = Number(merged.day15_comments);
      if (merged.day15_saves) merged.saves = Number(merged.day15_saves);
      if (merged.day15_shares) merged.shares = Number(merged.day15_shares);
      if (merged.day15_avg_watch_time) merged.avg_watch_time = String(merged.day15_avg_watch_time);
      automationsApplied.push("Reflected Day 15 metrics to Overall Performance");
    } else if (has7d && partialUpdates.day7_views !== undefined) {
      merged.total_views = Number(merged.day7_views || 0);
      merged.engagement_rate = Number(merged.day7_er || 0);
      if (merged.day7_reach) merged.account_reach = Number(merged.day7_reach);
      if (merged.day7_likes) merged.likes = Number(merged.day7_likes);
      if (merged.day7_comments) merged.comments = Number(merged.day7_comments);
      if (merged.day7_saves) merged.saves = Number(merged.day7_saves);
      if (merged.day7_shares) merged.shares = Number(merged.day7_shares);
      if (merged.day7_avg_watch_time) merged.avg_watch_time = String(merged.day7_avg_watch_time);
      automationsApplied.push("Reflected Day 7 metrics to Overall Performance");
    }
  }

  // 5. Update Turso
  await db.execute({
    sql: `UPDATE campaign_creators SET
      category = ?,
      script_status = ?,
      script_approval_date = ?,
      first_draft_status = ?,
      first_draft_date = ?,
      final_video_status = ?,
      video_approval_date = ?,
      live_link = ?,
      live_date = ?,
      execution_status = ?,
      confirmation_mail_status = ?,
      gross_margin = ?,
      engagement_rate = ?,
      total_views = ?,
      likes = ?,
      comments = ?,
      saves = ?,
      shares = ?,
      account_reach = ?,
      avg_watch_time = ?,
      screenshots = ?,
      day7_views = ?,
      day7_er = ?,
      day7_reach = ?,
      day7_likes = ?,
      day7_comments = ?,
      day7_saves = ?,
      day7_shares = ?,
      day7_avg_watch_time = ?,
      day7_screenshot = ?,
      day15_views = ?,
      day15_er = ?,
      day15_reach = ?,
      day15_likes = ?,
      day15_comments = ?,
      day15_saves = ?,
      day15_shares = ?,
      day15_avg_watch_time = ?,
      day15_screenshot = ?,
      day30_views = ?,
      day30_er = ?,
      day30_reach = ?,
      day30_likes = ?,
      day30_comments = ?,
      day30_saves = ?,
      day30_shares = ?,
      day30_avg_watch_time = ?,
      day30_screenshot = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    args: [
      updated.category || "Unspecified",
      updated.script_status || "Script Pending",
      cleanDateOnly(updated.script_approval_date),
      updated.first_draft_status || "Draft Pending",
      cleanDateOnly(updated.first_draft_date),
      updated.final_video_status || "Approval Pending",
      cleanDateOnly(updated.video_approval_date),
      updated.live_link || "",
      cleanDateOnly(updated.live_date),
      updated.execution_status || "On Going",
      updated.confirmation_mail_status || "Pending",
      updated.gross_margin ?? 0,
      updated.engagement_rate ?? 0,
      Number(updated.total_views || 0),
      Number(updated.likes || 0),
      Number(updated.comments || 0),
      Number(updated.saves || 0),
      Number(updated.shares || 0),
      Number(updated.account_reach || 0),
      String(updated.avg_watch_time || ""),
      typeof updated.screenshots === "string" ? updated.screenshots : JSON.stringify(updated.screenshots || []),
      Number(updated.day7_views || 0),
      Number(updated.day7_er || 0),
      Number(updated.day7_reach || 0),
      Number(updated.day7_likes || 0),
      Number(updated.day7_comments || 0),
      Number(updated.day7_saves || 0),
      Number(updated.day7_shares || 0),
      String(updated.day7_avg_watch_time || ""),
      String(updated.day7_screenshot || ""),
      Number(updated.day15_views || 0),
      Number(updated.day15_er || 0),
      Number(updated.day15_reach || 0),
      Number(updated.day15_likes || 0),
      Number(updated.day15_comments || 0),
      Number(updated.day15_saves || 0),
      Number(updated.day15_shares || 0),
      String(updated.day15_avg_watch_time || ""),
      String(updated.day15_screenshot || ""),
      Number(updated.day30_views || 0),
      Number(updated.day30_er || 0),
      Number(updated.day30_reach || 0),
      Number(updated.day30_likes || 0),
      Number(updated.day30_comments || 0),
      Number(updated.day30_saves || 0),
      Number(updated.day30_shares || 0),
      String(updated.day30_avg_watch_time || ""),
      String(updated.day30_screenshot || ""),
      deliverableId,
    ],
  });

  return {
    success: true,
    deliverable: updated as CreatorDeliverableInternal,
    automationsApplied,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand Credentials CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all brand/agency portal credentials.
 */
export async function getCredentials(): Promise<BrandCredential[]> {
  await initDatabase();

  const result = await db.execute(
    `SELECT * FROM brand_credentials ORDER BY created_at DESC`
  );

  return result.rows.map((row: any) => {
    let assignedCampaigns: string[] = [];
    try {
      if (row.assigned_campaign_ids) {
        assignedCampaigns = typeof row.assigned_campaign_ids === "string" 
          ? JSON.parse(row.assigned_campaign_ids) 
          : Array.isArray(row.assigned_campaign_ids) ? row.assigned_campaign_ids : [];
      }
    } catch {
      assignedCampaigns = [];
    }

    return {
      id: String(row.id),
      org_name: String(row.org_name),
      portal_username: String(row.portal_username),
      portal_password: String(row.portal_password),
      role: String(row.role || "BRAND_CLIENT") as Role,
      is_active: Number(row.is_active) === 1,
      notes: row.notes ? String(row.notes) : undefined,
      campaign_access_mode: (row.campaign_access_mode as CampaignAccessMode) || "ALL",
      assigned_campaign_ids: assignedCampaigns,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  });
}

/**
 * Create a new brand/agency portal credential.
 */
export async function createCredential(data: {
  org_name: string;
  portal_username: string;
  portal_password: string;
  role: Role;
  notes?: string;
  campaign_access_mode?: CampaignAccessMode;
  assigned_campaign_ids?: string[];
}): Promise<{ success: boolean; credential?: BrandCredential; error?: string }> {
  await initDatabase();

  const id = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const accessMode = data.campaign_access_mode || "ALL";
  const assignedJson = JSON.stringify(data.assigned_campaign_ids || []);

  try {
    await db.execute({
      sql: `INSERT INTO brand_credentials (id, org_name, portal_username, portal_password, role, is_active, notes, campaign_access_mode, assigned_campaign_ids)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [
        id, 
        data.org_name, 
        data.portal_username, 
        data.portal_password, 
        data.role, 
        data.notes || null,
        accessMode,
        assignedJson
      ],
    });

    return {
      success: true,
      credential: {
        id,
        org_name: data.org_name,
        portal_username: data.portal_username,
        portal_password: data.portal_password,
        role: data.role,
        is_active: true,
        notes: data.notes,
        campaign_access_mode: accessMode,
        assigned_campaign_ids: data.assigned_campaign_ids || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing credential (edit fields or toggle active status).
 */
export async function updateCredential(
  id: string,
  data: Partial<{
    org_name: string;
    portal_username: string;
    portal_password: string;
    role: Role;
    is_active: boolean;
    notes: string;
    campaign_access_mode: CampaignAccessMode;
    assigned_campaign_ids: string[];
  }>
): Promise<{ success: boolean; error?: string }> {
  await initDatabase();

  const setClauses: string[] = [];
  const args: any[] = [];

  if (data.org_name !== undefined) { setClauses.push("org_name = ?"); args.push(data.org_name); }
  if (data.portal_username !== undefined) { setClauses.push("portal_username = ?"); args.push(data.portal_username); }
  if (data.portal_password !== undefined) { setClauses.push("portal_password = ?"); args.push(data.portal_password); }
  if (data.role !== undefined) { setClauses.push("role = ?"); args.push(data.role); }
  if (data.is_active !== undefined) { setClauses.push("is_active = ?"); args.push(data.is_active ? 1 : 0); }
  if (data.notes !== undefined) { setClauses.push("notes = ?"); args.push(data.notes); }
  if (data.campaign_access_mode !== undefined) { setClauses.push("campaign_access_mode = ?"); args.push(data.campaign_access_mode); }
  if (data.assigned_campaign_ids !== undefined) { setClauses.push("assigned_campaign_ids = ?"); args.push(JSON.stringify(data.assigned_campaign_ids)); }

  if (setClauses.length === 0) {
    return { success: false, error: "No fields to update" };
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");
  args.push(id);

  try {
    await db.execute({
      sql: `UPDATE brand_credentials SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Permanently delete a credential.
 */
export async function deleteCredential(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await initDatabase();

  try {
    await db.execute({
      sql: `DELETE FROM brand_credentials WHERE id = ?`,
      args: [id],
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch the master SUPER_ADMIN credential. Auto-seeds if not present.
 */
export async function getAdminCredential(): Promise<BrandCredential | null> {
  await initDatabase();

  const res = await db.execute("SELECT * FROM brand_credentials WHERE role = 'SUPER_ADMIN' ORDER BY created_at ASC LIMIT 1");
  if (res.rows.length === 0) {
    const id = "admin-master";
    await db.execute({
      sql: `INSERT INTO brand_credentials (id, org_name, portal_username, portal_password, role, is_active, notes, campaign_access_mode, assigned_campaign_ids)
            VALUES (?, ?, ?, ?, ?, 1, ?, 'ALL', '[]')`,
      args: [
        id,
        "Xcelerate Media Admin",
        "admin@xceleratemedia.in",
        "Admin@Pulse2026!",
        "SUPER_ADMIN",
        "Master Super Administrator Account"
      ]
    });
    return {
      id,
      org_name: "Xcelerate Media Admin",
      portal_username: "admin@xceleratemedia.in",
      portal_password: "Admin@Pulse2026!",
      role: "SUPER_ADMIN",
      is_active: true,
      notes: "Master Super Administrator Account",
      campaign_access_mode: "ALL",
      assigned_campaign_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const row: any = res.rows[0];
  let assignedCampaigns: string[] = [];
  try {
    if (row.assigned_campaign_ids) {
      assignedCampaigns = typeof row.assigned_campaign_ids === "string"
        ? JSON.parse(row.assigned_campaign_ids)
        : Array.isArray(row.assigned_campaign_ids) ? row.assigned_campaign_ids : [];
    }
  } catch {
    assignedCampaigns = [];
  }

  return {
    id: String(row.id),
    org_name: String(row.org_name),
    portal_username: String(row.portal_username),
    portal_password: String(row.portal_password),
    role: "SUPER_ADMIN",
    is_active: Number(row.is_active) === 1,
    notes: row.notes ? String(row.notes) : undefined,
    campaign_access_mode: "ALL",
    assigned_campaign_ids: assignedCampaigns,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Update the Super Admin's own login email and/or master password.
 */
export async function updateAdminProfile(data: {
  portal_username?: string;
  portal_password?: string;
  org_name?: string;
}): Promise<{ success: boolean; credential?: BrandCredential; error?: string }> {
  await initDatabase();
  const admin = await getAdminCredential();
  if (!admin) return { success: false, error: "Master Admin record not found" };

  const setClauses: string[] = [];
  const args: any[] = [];

  if (data.portal_username !== undefined) {
    const u = data.portal_username.trim();
    if (!u || u.length < 3) return { success: false, error: "Valid email or username is required" };
    setClauses.push("portal_username = ?");
    args.push(u);
  }

  if (data.portal_password !== undefined) {
    const p = data.portal_password.trim();
    if (!p || p.length < 5) return { success: false, error: "Password must be at least 5 characters" };
    setClauses.push("portal_password = ?");
    args.push(p);
  }

  if (data.org_name !== undefined) {
    const o = data.org_name.trim();
    if (o) {
      setClauses.push("org_name = ?");
      args.push(o);
    }
  }

  if (setClauses.length === 0) {
    return { success: false, error: "No fields to update" };
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");
  args.push(admin.id);

  try {
    await db.execute({
      sql: `UPDATE brand_credentials SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });
    const updated = await getAdminCredential();
    return { success: true, credential: updated || undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Quick password reset for any credential (Brand, Agency, Employee, Analyst).
 */
export async function resetCredentialPassword(
  credentialId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  await initDatabase();
  const p = newPassword.trim();
  if (!p || p.length < 4) {
    return { success: false, error: "Password must be at least 4 characters." };
  }
  try {
    await db.execute({
      sql: `UPDATE brand_credentials SET portal_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [p, credentialId],
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Secure Server-side authentication:
 * Matches strictly against database credentials with zero backdoors.
 */
export async function verifyLogin(
  identifier: string,
  passwordAttempt: string
): Promise<{
  success: boolean;
  role?: Role;
  orgName?: string;
  credential?: BrandCredential;
  error?: string;
}> {
  await initDatabase();
  const id = identifier.trim();
  const pass = passwordAttempt.trim();

  if (!id) {
    return { success: false, error: "Please enter your portal email or username." };
  }
  if (!pass) {
    return { success: false, error: "Please enter your password." };
  }

  // Ensure default master admin exists
  await getAdminCredential();

  // Query database for matching username or org name
  const result = await db.execute({
    sql: `SELECT * FROM brand_credentials WHERE LOWER(portal_username) = LOWER(?) OR LOWER(org_name) = LOWER(?) LIMIT 1`,
    args: [id, id],
  });

  if (result.rows.length === 0) {
    return { success: false, error: "No account found matching this email. Please check your credentials or contact administrator." };
  }

  const row: any = result.rows[0];
  if (Number(row.is_active) !== 1) {
    return { success: false, error: `Access paused: The portal account for ${row.org_name} is currently inactive. Contact your agency account manager.` };
  }

  if (String(row.portal_password) !== pass) {
    return { success: false, error: "Incorrect password. Please verify the credentials provided." };
  }

  let assignedCampaigns: string[] = [];
  try {
    if (row.assigned_campaign_ids) {
      assignedCampaigns = typeof row.assigned_campaign_ids === "string"
        ? JSON.parse(row.assigned_campaign_ids)
        : Array.isArray(row.assigned_campaign_ids) ? row.assigned_campaign_ids : [];
    }
  } catch {
    assignedCampaigns = [];
  }

  const credential: BrandCredential = {
    id: String(row.id),
    org_name: String(row.org_name),
    portal_username: String(row.portal_username),
    portal_password: String(row.portal_password),
    role: String(row.role || "BRAND_CLIENT") as Role,
    is_active: true,
    notes: row.notes ? String(row.notes) : undefined,
    campaign_access_mode: (row.campaign_access_mode as CampaignAccessMode) || "ALL",
    assigned_campaign_ids: assignedCampaigns,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };

  return {
    success: true,
    role: credential.role,
    orgName: credential.org_name,
    credential,
  };
}

/**
 * Fetch distinct organization names (for credential form dropdown).
 */
export async function getOrganizationNames(): Promise<string[]> {
  await initDatabase();

  const result = await db.execute(
    `SELECT DISTINCT org_name FROM campaigns WHERE org_name IS NOT NULL AND TRIM(org_name) != '' AND org_name NOT IN ('Unassigned', 'Default Brand') ORDER BY org_name ASC`
  );

  return result.rows.map((row: any) => String(row.org_name));
}

/**
 * Fetch distinct employee/execution owner names from campaign creators and campaigns (Xcelerate POC).
 */
export async function getExecutionOwners(): Promise<string[]> {
  await initDatabase();

  const result = await db.execute(`
    SELECT DISTINCT name FROM (
      SELECT TRIM(execution_owner) as name FROM campaign_creators 
      WHERE execution_owner IS NOT NULL AND TRIM(execution_owner) != ''
      UNION
      SELECT TRIM(xcelerate_poc) as name FROM campaigns 
      WHERE xcelerate_poc IS NOT NULL AND TRIM(xcelerate_poc) != ''
    )
    WHERE name != '' 
      AND LOWER(name) NOT IN ('all ops leads', 'team xcelerate', 'n/a', 'unassigned')
    ORDER BY name ASC
  `);

  const owners = result.rows.map((row: any) => String(row.name).trim()).filter(Boolean);

  if (!owners.includes("Payal")) {
    owners.unshift("Payal");
  }

  return owners;
}

/**
 * Permanently delete a creator deliverable from the database.
 */
export async function deleteDeliverable(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await initDatabase();

  try {
    await db.execute({
      sql: `DELETE FROM campaign_creators WHERE id = ?`,
      args: [id],
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Safely mark deliverables that are no longer in the active sheet as 'Drop'.
 * This prevents accidental data loss if an employee removes a dropped creator row,
 * while keeping company audit logs and protecting against unauthorized sheet wiping.
 */
export async function reconcileDroppedDeliverables(
  activeDeliverableIds: string[],
  scopeOwner?: string
): Promise<{ success: boolean; droppedCount: number; message: string }> {
  await initDatabase();

  // Disaster Prevention Threshold:
  // If activeDeliverableIds is empty, DO NOT wipe/drop the database automatically!
  if (!activeDeliverableIds || activeDeliverableIds.length === 0) {
    return {
      success: false,
      droppedCount: 0,
      message: "Safety Guard Active: Sheet payload has 0 rows. Database records preserved against unauthorized or accidental sheet wipe."
    };
  }

  try {
    let sql = `
      UPDATE campaign_creators 
      SET execution_status = 'Drop', 
          script_status = 'Drop', 
          first_draft_status = 'Drop', 
          final_video_status = 'Drop',
          updated_at = CURRENT_TIMESTAMP
      WHERE id NOT IN (${activeDeliverableIds.map(() => "?").join(",")})
        AND execution_status != 'Drop'
    `;
    const args: any[] = [...activeDeliverableIds];

    if (scopeOwner && scopeOwner !== "ALL") {
      sql += ` AND LOWER(COALESCE(execution_owner, '')) = LOWER(?)`;
      args.push(scopeOwner);
    }

    const res = await db.execute({ sql, args });
    const droppedCount = res.rowsAffected || 0;

    return {
      success: true,
      droppedCount,
      message: droppedCount > 0 
        ? `Reconciliation complete: ${droppedCount} removed creator(s) safely marked as 'Drop'.`
        : "All active database creators match the current sheet."
    };
  } catch (err: any) {
    return { success: false, droppedCount: 0, message: err.message };
  }
}

/**
 * Permanently purge only deliverables that are in 'Drop' status.
 * Leaves all active and completed company records 100% intact.
 */
export async function purgeDroppedDeliverables(
  scopeOwner?: string
): Promise<{ success: boolean; purgedCount: number; message: string }> {
  await initDatabase();

  try {
    let sql = `DELETE FROM campaign_creators WHERE execution_status = 'Drop'`;
    const args: any[] = [];

    if (scopeOwner && scopeOwner !== "ALL") {
      sql += ` AND LOWER(COALESCE(execution_owner, '')) = LOWER(?)`;
      args.push(scopeOwner);
    }

    const res = await db.execute({ sql, args });
    const purgedCount = res.rowsAffected || 0;

    return {
      success: true,
      purgedCount,
      message: `Cleaned ${purgedCount} dropped creator record(s).`
    };
  } catch (err: any) {
    return { success: false, purgedCount: 0, message: err.message };
  }
}

/**
 * Controlled Admin Clean Slate:
 * Granular Admin Reset Engine:
 * Supports resetting data by All, Month-wise, Campaign-wise, or Employee-wise.
 * Protected by explicit typed confirmation phrase matching what is being deleted.
 */
export async function resetDatabaseCleanSlate(
  confirmKey: string,
  scopeType: "ALL" | "MONTH" | "CAMPAIGN" | "EMPLOYEE" = "ALL",
  scopeValue?: string
): Promise<{ success: boolean; message: string; deletedDeliverables?: number; deletedCampaigns?: number }> {
  await initDatabase();

  const cleanConfirm = (confirmKey || "").trim().toUpperCase();

  // 1. FULL DATABASE RESET
  if (scopeType === "ALL") {
    const expected = "RESET ALL";
    if (cleanConfirm !== expected && cleanConfirm !== "RESET") {
      return { 
        success: false, 
        message: `Invalid confirmation key. Type '${expected}' to proceed.` 
      };
    }

    try {
      const delivRes = await db.execute(`DELETE FROM campaign_creators`);
      const campRes = await db.execute(`DELETE FROM campaigns`);
      return { 
        success: true, 
        message: `Clean slate complete: All database records cleared (${delivRes.rowsAffected || 0} creators, ${campRes.rowsAffected || 0} campaigns). Ready for Google Sheet sync.` 
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // 2. MONTH-WISE RESET
  if (scopeType === "MONTH") {
    const month = (scopeValue || "").trim();
    if (!month) {
      return { success: false, message: "No month specified for reset." };
    }
    const expected = ("DELETE " + month).toUpperCase();
    if (cleanConfirm !== expected && cleanConfirm !== month.toUpperCase()) {
      return {
        success: false,
        message: `Invalid confirmation key. Type '${expected}' to proceed.`
      };
    }

    try {
      const delivRes = await db.execute({
        sql: `DELETE FROM campaign_creators WHERE campaign_id IN (SELECT id FROM campaigns WHERE LOWER(campaign_month) = LOWER(?))`,
        args: [month]
      });
      const campRes = await db.execute({
        sql: `DELETE FROM campaigns WHERE LOWER(campaign_month) = LOWER(?)`,
        args: [month]
      });

      return {
        success: true,
        message: `Month '${month}' cleared: ${delivRes.rowsAffected || 0} creator deliverables and ${campRes.rowsAffected || 0} campaigns deleted.`
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // 3. CAMPAIGN-WISE RESET
  if (scopeType === "CAMPAIGN") {
    const campaignId = (scopeValue || "").trim();
    if (!campaignId) {
      return { success: false, message: "No campaign specified for reset." };
    }
    const expected = ("DELETE " + campaignId).toUpperCase();
    if (cleanConfirm !== expected && cleanConfirm !== campaignId.toUpperCase()) {
      return {
        success: false,
        message: `Invalid confirmation key. Type '${expected}' to proceed.`
      };
    }

    try {
      const delivRes = await db.execute({
        sql: `DELETE FROM campaign_creators WHERE LOWER(campaign_id) = LOWER(?)`,
        args: [campaignId]
      });
      const campRes = await db.execute({
        sql: `DELETE FROM campaigns WHERE LOWER(id) = LOWER(?)`,
        args: [campaignId]
      });

      return {
        success: true,
        message: `Campaign '${campaignId}' cleared: ${delivRes.rowsAffected || 0} creator deliverables and campaign removed.`
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // 4. EMPLOYEE-WISE RESET
  if (scopeType === "EMPLOYEE") {
    const employee = (scopeValue || "").trim();
    if (!employee) {
      return { success: false, message: "No employee specified for reset." };
    }
    const expected = ("DELETE " + employee).toUpperCase();
    if (cleanConfirm !== expected && cleanConfirm !== employee.toUpperCase()) {
      return {
        success: false,
        message: `Invalid confirmation key. Type '${expected}' to proceed.`
      };
    }

    try {
      const delivRes = await db.execute({
        sql: `DELETE FROM campaign_creators 
              WHERE LOWER(COALESCE(execution_owner, '')) = LOWER(?) 
                 OR campaign_id IN (
                   SELECT id FROM campaigns WHERE LOWER(COALESCE(xcelerate_poc, '')) = LOWER(?)
                 )`,
        args: [employee, employee]
      });

      // Also clean up any campaigns that now have 0 creators remaining
      await db.execute(`
        DELETE FROM campaigns 
        WHERE id NOT IN (SELECT DISTINCT campaign_id FROM campaign_creators)
      `);

      return {
        success: true,
        message: `Employee '${employee}' data cleared: ${delivRes.rowsAffected || 0} creator deliverables removed.`
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return { success: false, message: "Unknown scope type." };
}

/**
 * Helper to extract raw sheet ID from full Google Spreadsheet URLs or raw strings
 */
export async function extractCleanSheetId(raw: string): Promise<string> {
  if (!raw) return "";
  const s = raw.trim();
  const match = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return s;
}

/**
 * Fetch all employee sheets registered in the database.
 */
export async function getEmployeeSheets(): Promise<EmployeeSheet[]> {
  await initDatabase();
  try {
    const res = await db.execute(`
      SELECT id, employee_name, sheet_id, tab_name, status, last_pulled_at, rows_ingested, created_at, updated_at
      FROM employee_sheets
      ORDER BY created_at ASC
    `);

    // For each employee, also dynamically check actual rows in campaign_creators
    const ownerCounts: Record<string, number> = {};
    try {
      const countsRes = await db.execute(`
        SELECT LOWER(COALESCE(d.execution_owner, c.xcelerate_poc, '')) as owner, COUNT(d.id) as count
        FROM campaign_creators d
        LEFT JOIN campaigns c ON d.campaign_id = c.id
        WHERE d.execution_owner IS NOT NULL OR c.xcelerate_poc IS NOT NULL
        GROUP BY LOWER(COALESCE(d.execution_owner, c.xcelerate_poc, ''))
      `);

      for (const r of countsRes.rows as any[]) {
        const o = String(r.owner || "").trim();
        const cnt = Number(r.count || 0);
        if (o) ownerCounts[o] = (ownerCounts[o] || 0) + cnt;
      }
    } catch (countErr) {
      console.warn("Could not query dynamic campaign_creators counts:", countErr);
    }

    return res.rows.map((r: any) => {
      const empName = String(r.employee_name || "").trim();
      const dbCount = ownerCounts[empName.toLowerCase()] ?? 0;
      const storedCount = Number(r.rows_ingested || 0);

      return {
        id: String(r.id),
        employee_name: empName,
        sheet_id: String(r.sheet_id || ""),
        tab_name: String(r.tab_name || "ExecutionSheet"),
        status: (String(r.status || "Active").toLowerCase() === "paused" ? "Paused" : "Active") as "Active" | "Paused",
        last_pulled_at: r.last_pulled_at ? String(r.last_pulled_at) : undefined,
        rows_ingested: Math.max(dbCount, storedCount),
        created_at: r.created_at ? String(r.created_at) : undefined,
        updated_at: r.updated_at ? String(r.updated_at) : undefined,
      };
    });
  } catch (err) {
    console.error("Failed to get employee sheets:", err);
    return [];
  }
}

/**
 * Add or update an employee sheet registration in the database.
 */
export async function saveEmployeeSheet(data: {
  id?: string;
  employee_name: string;
  sheet_id: string;
  tab_name?: string;
  status?: "Active" | "Paused" | string;
}): Promise<{ success: boolean; employee?: EmployeeSheet; message: string }> {
  await initDatabase();

  const name = String(data.employee_name || "").trim();
  const cleanId = await extractCleanSheetId(data.sheet_id);
  const tab = String(data.tab_name || "").trim() || "ExecutionSheet";
  const status = (String(data.status || "Active").toLowerCase() === "paused" ? "Paused" : "Active");

  if (!name) {
    return { success: false, message: "Employee name is required." };
  }
  if (!cleanId) {
    return { success: false, message: "A valid Google Sheet ID or URL is required." };
  }

  const id = data.id || `emp-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;

  try {
    // Check if employee name already exists
    const existing = await db.execute({
      sql: `SELECT id FROM employee_sheets WHERE LOWER(employee_name) = LOWER(?) OR id = ?`,
      args: [name, id]
    });

    if (existing.rows.length > 0) {
      const existingId = String(existing.rows[0].id);
      await db.execute({
        sql: `UPDATE employee_sheets 
              SET employee_name = ?, sheet_id = ?, tab_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [name, cleanId, tab, status, existingId]
      });
      return {
        success: true,
        message: `Employee sheet for '${name}' updated successfully!`,
        employee: {
          id: existingId,
          employee_name: name,
          sheet_id: cleanId,
          tab_name: tab,
          status,
          updated_at: new Date().toISOString()
        }
      };
    } else {
      await db.execute({
        sql: `INSERT INTO employee_sheets (id, employee_name, sheet_id, tab_name, status, rows_ingested)
              VALUES (?, ?, ?, ?, ?, 0)`,
        args: [id, name, cleanId, tab, status]
      });
      return {
        success: true,
        message: `New employee sheet for '${name}' added to database!`,
        employee: {
          id,
          employee_name: name,
          sheet_id: cleanId,
          tab_name: tab,
          status,
          rows_ingested: 0,
          created_at: new Date().toISOString()
        }
      };
    }
  } catch (err: any) {
    console.error("saveEmployeeSheet error:", err);
    return { success: false, message: err.message || "Failed to save employee sheet." };
  }
}

/**
 * Delete an employee sheet from database.
 */
export async function deleteEmployeeSheet(id: string): Promise<{ success: boolean; message: string }> {
  await initDatabase();
  try {
    const res = await db.execute({
      sql: `DELETE FROM employee_sheets WHERE id = ? OR LOWER(employee_name) = LOWER(?)`,
      args: [id, id]
    });
    if ((res.rowsAffected || 0) > 0) {
      return { success: true, message: "Employee sheet removed from database." };
    }
    return { success: false, message: "Employee sheet not found." };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to delete employee sheet." };
  }
}

/**
 * Toggle employee sheet Active/Paused status.
 */
export async function toggleEmployeeSheetStatus(id: string): Promise<{ success: boolean; status?: string; message: string }> {
  await initDatabase();
  try {
    const existing = await db.execute({
      sql: `SELECT id, status, employee_name FROM employee_sheets WHERE id = ?`,
      args: [id]
    });
    if (existing.rows.length === 0) {
      return { success: false, message: "Employee sheet not found." };
    }
    const current = String(existing.rows[0].status || "Active");
    const nextStatus = current.toLowerCase() === "active" ? "Paused" : "Active";
    await db.execute({
      sql: `UPDATE employee_sheets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [nextStatus, id]
    });
    return {
      success: true,
      status: nextStatus,
      message: `Employee '${existing.rows[0].employee_name}' status set to ${nextStatus}.`
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Updates last_pulled_at and rows_ingested after a successful sync/pull.
 */
export async function updateEmployeeSheetStats(employeeName: string, rowsCount: number): Promise<void> {
  await initDatabase();
  try {
    await db.execute({
      sql: `UPDATE employee_sheets 
            SET last_pulled_at = CURRENT_TIMESTAMP, rows_ingested = ?, updated_at = CURRENT_TIMESTAMP
            WHERE LOWER(employee_name) = LOWER(?)`,
      args: [rowsCount, employeeName]
    });
  } catch (err) {
    console.error("Failed to update employee sheet stats:", err);
  }
}

