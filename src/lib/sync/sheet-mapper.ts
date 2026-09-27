import { db, initDatabase } from "@/lib/db";
import { CreatorDeliverableInternal } from "@/lib/types";
import { 
  deriveCategoryFromFollowers, 
  computeCommercialAutomations, 
  computeEngagementAutomations, 
  applySmartStatusCascades 
} from "@/lib/automation/rules";

export interface SheetRowRaw {
  [key: string]: any;
}

export function parseNumber(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const str = String(val).trim().toUpperCase();
  // Remove currency symbols, commas, and percentage
  const cleaned = str.replace(/[₹$,% ]/g, "");
  if (cleaned.endsWith("M")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000_000 || 0;
  }
  if (cleaned.endsWith("K")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000 || 0;
  }
  return parseFloat(cleaned) || 0;
}

export function parseString(val: any, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}

/**
 * Strips all time/timezone components from dates, ensuring strictly YYYY-MM-DD or date-only format.
 */
export function parseDateOnly(val: any, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (!s) return fallback;
  // If ISO 8601 string like "2026-09-21T18:30:00.000Z"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const datePart = s.split("T")[0].trim();
    if (datePart) return datePart;
  }
  // If date-time string like "2026-09-21 18:30:00"
  if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) {
    return s.split(/\s+/)[0].trim();
  }
  return s;
}

/**
 * Universal External URL Formatter:
 * Seamlessly handles Google Docs, Google Drive folders/files, PDFs, Sheets, Notion, and web links.
 * Automatically restores missing protocols and converts bare Google Doc/Drive IDs to clickable URLs.
 */
export function formatExternalUrl(val: any): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (!s || s === "#" || s.toLowerCase() === "n/a" || s.toLowerCase() === "null" || s.toLowerCase() === "none") return "";

  // If user pasted a bare Google Doc ID (25-60 alphanumeric characters/hyphen/underscore)
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(s)) {
    return `https://docs.google.com/document/d/${s}/edit`;
  }

  // Prepend https:// if protocol is missing
  if (/^(www\.|drive\.google\.com|docs\.google\.com)/i.test(s)) {
    return `https://${s}`;
  }

  return s;
}

/**
 * Normalizes fuzzy keys from Google Sheet headers to standard internal keys.
 * Handles "(hide from brand/agency)", parentheses, tabs, and spaces.
 */
export function normalizeSheetHeaders(rawRow: SheetRowRaw): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key
      .toLowerCase()
      .replace(/\(.*?\)/g, "") // remove anything in parentheses
      .replace(/[^a-z0-9]/g, "") // keep only alphanumeric
      .trim();
    normalized[cleanKey] = value;
  }
  return normalized;
}

/**
 * Intelligently extracts the Brand / Organization Name when explicit Brand column is absent.
 * e.g. "Dominos-May2026" -> "Dominos"
 *      "Livon-Barcode Jan" -> "Livon"
 *      "Aspero APRIL HM 2026" -> "Aspero"
 *      "Savings NFO NANO MAY 2026" -> "Savings NFO"
 *      "Amli Nano Term May 2026" -> "Amli"
 */
export function extractBrandFromBrief(brief: string, fallback = "Default Brand"): string {
  if (!brief || !brief.trim()) return fallback;
  const clean = brief.trim();

  // 1. Dash-separated brand: "Livon-Barcode Jan", "Dominos-May2026"
  if (clean.includes("-")) {
    const firstPart = clean.split("-")[0].trim();
    if (firstPart.length > 0) return firstPart;
  }
  // 2. Underscore-separated brand: "Livon_Barcode", "Dominos_May"
  if (clean.includes("_")) {
    const firstPart = clean.split("_")[0].trim();
    if (firstPart.length > 0) return firstPart;
  }

  // 3. Space-separated: stop before month names, years, or generic tier words
  const tokens = clean.split(/\s+/);
  if (tokens.length === 1) return tokens[0];

  const stopWords = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|202\d|hm|term|nano|micro|macro|mega|q[1-4]|campaign|reel|reels|launch|execution|influencer)$/i;

  const brandWords: string[] = [];
  for (const token of tokens) {
    if (stopWords.test(token)) break;
    brandWords.push(token);
  }

  if (brandWords.length > 0) {
    return brandWords.join(" ");
  }

  return tokens[0];
}

function normalizeWorkflowStatus(val: any, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  if (!s) return fallback;
  const l = s.toLowerCase();
  if (l === "drop" || l === "dropped" || l === "cancelled" || l === "cancel") return "Drop";
  if (l === "approved" || l === "approve") return "Approved";
  if (l === "completed" || l === "complete" || l === "done") return "Completed";
  if (l === "hold" || l === "on hold") return "Hold";
  if (l === "on going" || l === "ongoing" || l === "in progress") return "On Going";
  if (l === "mail sent" || l === "sent" || l === "yes" || l === "done") return "Mail Sent";
  if (l === "revision done" || l === "revision/reshoot done" || l === "reshoot done") return "Revision/Reshoot Done";
  if (l === "in revision" || l === "sent for revision/reshoot" || l === "revision" || l === "reshoot") return "Sent For Revision/Reshoot";
  if (l === "approval pending" || l === "review pending" || l === "pending approval") return "Approval Pending";
  if (l === "script pending") return "Script Pending";
  if (l === "draft pending") return "Draft Pending";
  if (l === "feedback pending" || l === "feedback needed") return "Feedback Pending";
  if (l === "paid") return "Paid";
  return s;
}

function formatCleanMonth(val: any): string {
  if (!val) return "Ongoing";
  const s = String(val).trim();
  if (s.includes("T") || /^\d{4}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  }
  return s;
}

/**
 * Maps a single Google Sheet row into the Turso relational model.
 * Guarantees that every row is preserved across multiple employee execution sheets.
 */
export function mapRowToDeliverable(
  rawRow: SheetRowRaw, 
  fallbackIndex?: number, 
  occurrenceIndex?: number
): {
  campaign: {
    id: string;
    campaign_month: string;
    client_type: string;
    org_name: string;
    campaign_name: string;
    brief_name?: string;
    xcelerate_poc: string;
    brand_agency_poc: string;
    brand_payment_cycle: string;
    status: string;
  };
  deliverable: CreatorDeliverableInternal;
} {
  const n = normalizeSheetHeaders(rawRow);

  const rawCampaignId = parseString(n.campaignid || rawRow["Campaign ID"] || rawRow["campaign_id"], "");
  const briefName = parseString(n.briefname || rawRow["Brief Name"], "");
  const campaignName = parseString(n.campaignname || rawRow["Campaign Name"], briefName || "Influencer Campaign");
  const campaignId = rawCampaignId || (campaignName && campaignName !== "Influencer Campaign" ? ("CAMP-" + campaignName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)) : "CAMP-GENERAL");
  const campaignMonth = formatCleanMonth(n.campaignmonth || rawRow["Campaign Month"]);
  const clientType = parseString(n.clienttype || rawRow["Client Type(Brand, Agency, Other)"] || rawRow["Client Type"], "Brand");
  
  const executionOwner = parseString(n.executionowner || rawRow["Execution Owner"], "");
  const explicitBrand = parseString(n.brandagencyname || rawRow["Brand/Agency Name"] || rawRow["Brand Name"], "");
  // Strictly use explicit Brand/Agency Name from Column E. Never guess or extract fake brands from campaign names!
  const orgName = explicitBrand.trim() || "Unassigned";
  
  const xceleratePoc = executionOwner || parseString(n.xceleratepoc || rawRow["Xcelerate POC"], "Team Xcelerate");
  const rawBrandPoc = parseString(
    n.brandagencypoc || 
    n.brandpoc || 
    n.agencypoc || 
    n.clientpoc || 
    rawRow["Brand/Agency POC"] || 
    rawRow["Brand POC"] || 
    rawRow["Agency POC"] || 
    rawRow["Client POC"], 
    ""
  );
  const brandPoc = rawBrandPoc && rawBrandPoc.trim() && rawBrandPoc.trim() !== "Brand Manager" ? rawBrandPoc.trim() : "N/A";
  const brandPaymentCycle = parseString(
    n.brandpaymentcycle || 
    rawRow["Brand Payment Cycle"] || 
    n.brandreceivepaymentcycle || 
    rawRow["Brand Receive Payment Cycle"], 
    "30 Days"
  );

  // Extract handle from profile URL if available
  const urlRaw = parseString(n.profileurl || n.url || rawRow["Profile URL"] || rawRow["URL"], "");
  let cleanHandle = "";
  if (urlRaw) {
    try {
      const match = urlRaw.match(/(?:instagram\.com\/|youtube\.com\/@?|tiktok\.com\/@?)([a-zA-Z0-9._]+)/);
      if (match && match[1]) {
        cleanHandle = match[1].replace(/[^a-zA-Z0-9._]/g, "");
      }
    } catch {
      cleanHandle = "";
    }
  }

  // PERSISTENT IDENTIFICATION ENGINE (DELIVERABLE ID IS SUPREME UNIQUE PRIMARY KEY)
  const rawExplicitId = parseString(
    rawRow["Deliverable ID"] || 
    rawRow["deliverable_id"] || 
    n.deliverableid ||
    rawRow["Unique_ID"] || 
    rawRow["unique_id"] || 
    n.uniqueid ||
    rawRow["UID"] || 
    rawRow["uid"] || 
    rawRow["ID"] || 
    rawRow["id"] || 
    rawRow["_id"] || 
    rawRow["Execution ID"] || 
    rawRow["execution_id"] || 
    rawRow["Row ID"] || 
    rawRow["row_id"] || 
    rawRow["S.No"] || 
    rawRow["SNo"] || 
    rawRow["s.no"] || 
    rawRow["sno"] ||
    rawRow["Sr. No"] ||
    rawRow["Sr.No"] ||
    rawRow["Sl No"] ||
    rawRow["Sl. No"] ||
    rawRow["#"], 
    ""
  );

  let creatorName = parseString(
    n.creatorname || 
    rawRow["Creator Name"] || 
    rawRow["Creator"] || 
    rawRow["Influencer Name"] || 
    rawRow["Handle"], 
    ""
  );

  // Resilient rescue for missing Creator Name: use profile URL handle or Deliverable ID
  if (!creatorName) {
    if (cleanHandle) {
      creatorName = cleanHandle;
    } else if (rawExplicitId) {
      creatorName = `Creator (${rawExplicitId.slice(0, 8)})`;
    } else {
      creatorName = `Creator Row ${(fallbackIndex !== undefined ? fallbackIndex + 2 : "N/A")}`;
    }
  }

  const cleanCreator = creatorName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const deliverablesRaw = parseString(n.deliverables || rawRow["Deliverables"], "");
  const cleanDeliverable = deliverablesRaw.toLowerCase().replace(/[^a-z0-9]/g, "");

  let deliverableId = "";
  if (rawExplicitId) {
    const isUuid = /^[0-9a-fA-F-]{16,}$/.test(rawExplicitId);
    const isPureNumber = /^\d+$/.test(rawExplicitId);
    if (isUuid) {
      // Direct globally unique identifier (Column A UUID)
      deliverableId = rawExplicitId;
    } else if (isPureNumber) {
      deliverableId = `${campaignId}_${cleanCreator || "creator"}_sno${rawExplicitId}`;
    } else {
      deliverableId = rawExplicitId.toLowerCase().startsWith(campaignId.toLowerCase())
        ? rawExplicitId
        : `${campaignId}_${rawExplicitId}`;
    }
  } else {
    // Smart Content-Based Deterministic Fingerprint
    const effectiveOccurrence = occurrenceIndex || parseNumber(rawRow["_sheet_occurrence"]) || 1;
    const tag = cleanDeliverable || cleanHandle || "d1";
    const seqSuffix = (effectiveOccurrence > 1) ? `_${effectiveOccurrence}` : "";
    deliverableId = `${campaignId}_${cleanCreator || "creator"}_${tag}${seqSuffix}`;
  }

  const brandCost = parseNumber(n.brandcost || rawRow["Brand Cost"]);
  // "Negotiated Cost" in employee sheet is the agency's creator buying cost!
  const creatorCost = parseNumber(
    n.negotiatedcost || 
    rawRow["Negotiated Cost"] || 
    n.creatorcost || 
    rawRow["Creator Cost(hide from brand/agency)"] || 
    rawRow["Creator Cost"]
  );
  const grossMarginRaw = parseNumber(
    n.grossmargin || 
    rawRow["Gross margin(hide from brand/agency)"] || 
    rawRow["Gross margin"]
  );

  // Screenshots array
  let screenshotsJson = "[]";
  const rawScreenshots = n.screenshots || rawRow["Screenshots"] || n.screenshot || rawRow["Screenshot"] || n.reelscreenshot || rawRow["Reel Screenshot"] || n.performancescreenshot || rawRow["Performance Screenshot"] || n.insightsscreenshot || rawRow["Insights Screenshot"] || rawRow["Proof"];
  if (rawScreenshots) {
    if (typeof rawScreenshots === "string") {
      const urls = rawScreenshots.split(/[\n,;]+/).map((u: string) => u.trim()).filter(Boolean);
      screenshotsJson = JSON.stringify(urls);
    } else if (Array.isArray(rawScreenshots)) {
      screenshotsJson = JSON.stringify(rawScreenshots);
    }
  }

  const views = parseNumber(n.totalviews || rawRow["Total Views"]);
  const likes = parseNumber(n.likes || rawRow["Likes"]);
  const comments = parseNumber(n.comments || rawRow["Comments"]);
  const saves = parseNumber(n.saves || rawRow["Saves"]);
  const shares = parseNumber(n.shares || rawRow["Shares"]);
  const reach = parseNumber(n.accountreach || rawRow["Account Reach"]);
  const inputEr = parseNumber(n.engagementrate || rawRow["Engagement Rate"]);

  // 1. AUTOMATIC CATEGORY DETERMINATION BY FOLLOWER COUNT
  const followersCount = parseNumber(n.followerscount || rawRow["Followers Count"]);
  const rawCategory = parseString(n.category || rawRow["Category(Nano, Micro, Macro, Mega)"] || rawRow["Category"], "");
  const category = deriveCategoryFromFollowers(followersCount, rawCategory);

  // 2. AUTOMATIC COMMERCIALS & GROSS MARGIN
  const { grossMargin } = computeCommercialAutomations(brandCost, creatorCost, grossMarginRaw);

  // 3. AUTOMATIC ENGAGEMENT RATE & METRICS COMPUTATION
  const { computedEr } = computeEngagementAutomations(
    views, likes, comments, saves, shares, reach, brandCost, inputEr
  );

  // Workflow statuses
  const rawConf = parseString(
    n.confirmationmailsent || 
    rawRow["Confirmation Mail Sent"] || 
    n.confirmationmailstatus || 
    rawRow["Confirmation Mail Status(Pending, Drop, Mail Sent)"] || 
    rawRow["Confirmation Mail Status"],
    ""
  );
  let confMailStatus: any = "Pending";
  if (rawConf) {
    const cl = rawConf.toLowerCase().trim();
    if (cl === "yes" || cl === "sent" || cl === "mail sent" || cl === "done" || cl === "true") {
      confMailStatus = "Mail Sent";
    } else if (cl === "drop" || cl === "dropped") {
      confMailStatus = "Drop";
    } else {
      confMailStatus = normalizeWorkflowStatus(rawConf, "Pending");
    }
  }

  const rawVideoStatus = parseString(
    n.videostatus ||
    rawRow["Video Status"] ||
    n.finalvideostatus ||
    rawRow["Final Video Status(Approval Pending, Drop, Approved)"] ||
    rawRow["Final Video Status"],
    ""
  );

  const liveDate = parseDateOnly(
    n.livedate ||
    rawRow["Live Date"] ||
    n.videolivedate ||
    rawRow["Video Live Date"],
    ""
  );

  // Invoicing & Employee Fields
  const creatorPaymentCycle = parseString(n.creatorpaymentcycle || rawRow["Creator Payment Cycle"], "");
  const brandReceivePaymentCycle = parseString(n.brandreceivepaymentcycle || rawRow["Brand Receive Payment Cycle"], "");
  const brandPaymentStatus = parseString(n.brandpayment || rawRow["Brand Payment"], "");
  const invoicePdfLink = parseString(n.invoicepdflink || rawRow["Invoice PDF Link"], "");
  const invoiceDirectLink = parseString(n.invoicedirectlink || rawRow["Invoice Direct Link"], "");
  const trackingId = parseString(n.trackingid || rawRow["Tracking ID"], "");
  const invoiceStatus = parseString(n.invoicestatus || rawRow["Invoice Status"], "");
  const invoiceGeneratedOn = parseDateOnly(n.generatedon || rawRow["Generated On"], "");
  const invoiceNumber = parseString(
    n.invoicenumber || 
    n.invoicenumberifavailable || 
    rawRow["Invoice Number (if available)"] || 
    rawRow["Invoice Number"], 
    ""
  );
  const creatorEmail = parseString(n.emailaddress || n.email || rawRow["Email address"] || rawRow["Email Address"], "");
  const invoiceAmount = parseNumber(n.invoiceamount || rawRow["Invoice Amount"]);
  const gstAmount = parseNumber(n.gstamount || n.gstamountifany || rawRow["GST Amount (if any)"] || rawRow["GST Amount"]);
  const invoiceTotal = parseNumber(n.total || rawRow["Total"]) || (invoiceAmount ? invoiceAmount + gstAmount : 0);
  const sourceSheet = parseString(rawRow["_sheet_name"] ? `${rawRow["_spreadsheet_title"] || "Google Sheets"} (${rawRow["_sheet_name"]})` : "");

  const explicitDay7Views = parseNumber(n.day7views || rawRow["Day 7 Views"] || rawRow["Day 7 View"] || rawRow["7 Day Views"] || rawRow["7d Views"]);
  const explicitDay7Er = parseNumber(n.day7er || rawRow["Day 7 ER"] || rawRow["7 Day ER"] || rawRow["7d ER"]);
  const explicitDay15Views = parseNumber(n.day15views || rawRow["Day 15 Views"] || rawRow["Day 15 View"] || rawRow["15 Day Views"] || rawRow["15d Views"]);
  const explicitDay15Er = parseNumber(n.day15er || rawRow["Day 15 ER"] || rawRow["15 Day ER"] || rawRow["15d ER"]);
  const explicitDay30Views = parseNumber(n.day30views || rawRow["Day 30 Views"] || rawRow["Day 30 View"] || rawRow["30 Day Views"] || rawRow["30d Views"]);
  const explicitDay30Er = parseNumber(n.day30er || rawRow["Day 30 ER"] || rawRow["30 Day ER"] || rawRow["30d ER"]);

  // Initial deliverable object before cascading
  const initialDeliverable: CreatorDeliverableInternal = {
    id: deliverableId,
    campaign_id: campaignId,
    creator_name: creatorName,
    niche: parseString(n.niche || rawRow["Niche"], "General"),
    profile_url: parseString(n.profileurl || n.url || rawRow["Profile URL"] || rawRow["URL"], ""),
    followers_count: followersCount,
    category: category,
    city: parseString(n.city || rawRow["City"], ""),
    state: parseString(n.state || rawRow["State"], ""),
    language: parseString(n.language || rawRow["Language"], "English"),
    gender: parseString(n.gender || rawRow["Gender"], "Not Specified"),
    phone_number: parseString(n.phonenumber || rawRow["Phone Number(hide from brand/agency)"] || rawRow["Phone Number"], ""),
    deliverables: parseString(n.deliverables || rawRow["Deliverables"], "1 IG Reel"),
    brand_cost: brandCost,
    creator_cost: creatorCost,
    gross_margin: grossMargin,
    address: parseString(n.address || rawRow["Address (If avl)"] || rawRow["Address"], ""),
    product_status: parseString(n.productstatus || rawRow["Product Status"], "Not Applicable") as any,
    confirmation_mail_status: confMailStatus,
    script_link: formatExternalUrl(
      parseString(
        n.scriptlink || 
        n.scripturl || 
        n.scriptdoclink || 
        n.scriptgoogledoclink || 
        n.scriptdrivelink || 
        rawRow["Script link"] || 
        rawRow["Script Link"] || 
        rawRow["Script URL"] || 
        rawRow["Script Doc Link"], 
        ""
      )
    ),
    script_status: normalizeWorkflowStatus(
      n.scriptstatus || 
      rawRow["Script Status(Approval Pending, Drop, Script Pending, Approved)"] || 
      rawRow["Script Status"], 
      "Script Pending"
    ) as any,
    script_approval_date: parseDateOnly(
      n.scriptapprovaldate || 
      n.scriptapproveddate || 
      n.scriptdate || 
      rawRow["Script Approval Date"] || 
      rawRow["Script Approved Date"], 
      ""
    ),
    first_draft_status: normalizeWorkflowStatus(
      n.videos1stdraftstatus || 
      n["1stdraftstatus"] || 
      n.firstdraftstatus || 
      n.draftstatus || 
      n.video1stdraftstatus || 
      rawRow["Video's 1st Draft Status(Approval Pending, Draft Pending, Sent For Revision/Reshoot, Feedback Pending, Revision/Reshoot Done, Approved, Drop)"] || 
      rawRow["Video's 1st Draft Status"] || 
      rawRow["1st Draft Status"], 
      "Draft Pending"
    ) as any,
    first_draft_date: parseDateOnly(
      n["1stdraftdate"] || 
      n.firstdraftdate || 
      n.videos1stdraftdate || 
      n.video1stdraftdate || 
      n.draftdate || 
      rawRow["1st Draft Date"] || 
      rawRow["Video's 1st Draft Date"] || 
      rawRow["First Draft Date"], 
      ""
    ),
    revision_drive_link: formatExternalUrl(
      parseString(
        n.revisionreshootfreqdrivelink || 
        n.revisionreshootdrivelink || 
        n.revisiondrivelink || 
        n.revisionlink || 
        n.reshootdrivelink || 
        n.freqdrivelink || 
        n.drivelink || 
        rawRow["Revision/Reshoot Freq. Drive Link"] || 
        rawRow["Revision Drive Link"] || 
        rawRow["Reshoot Drive Link"], 
        ""
      )
    ),
    final_video_status: normalizeWorkflowStatus(rawVideoStatus, "Approval Pending") as any,
    video_approval_date: parseDateOnly(
      n.videoapprovaldate || 
      n.videoapproveddate || 
      n.finalvideoapprovaldate || 
      rawRow["Video Approval Date"] || 
      rawRow["Video Approved Date"] || 
      rawRow["Final Video Approval Date"], 
      ""
    ),
    live_link: formatExternalUrl(parseString(n.livelink || rawRow["Live Link"], "")),
    live_date: liveDate,
    execution_status: normalizeWorkflowStatus(n.executionstatus || rawRow["Execution Status(On Going, Drop, Completed, Hold)"] || rawRow["Execution Status"], "On Going") as any,
    total_views: views,
    likes: likes,
    comments: comments,
    saves: saves,
    shares: shares,
    avg_watch_time: parseString(n.avgwatchtime || rawRow["Avg Watch Time"], ""),
    engagement_rate: computedEr,
    account_reach: reach,
    screenshots: screenshotsJson,
    day7_views: explicitDay7Views > 0 ? explicitDay7Views : (views > 0 ? Math.round(views * 0.7) : 0),
    day7_er: explicitDay7Er > 0 ? explicitDay7Er : ((views > 0 && computedEr > 0) ? +(computedEr * 1.05).toFixed(2) : 0),
    day15_views: explicitDay15Views > 0 ? explicitDay15Views : (views > 0 ? Math.round(views * 0.9) : 0),
    day15_er: explicitDay15Er > 0 ? explicitDay15Er : (views > 0 ? computedEr : 0),
    day30_views: explicitDay30Views > 0 ? explicitDay30Views : (views > 0 ? views : 0),
    day30_er: explicitDay30Er > 0 ? explicitDay30Er : (views > 0 ? computedEr : 0),
    // Employee execution & invoicing fields
    execution_owner: executionOwner || undefined,
    brief_name: briefName || undefined,
    creator_payment_cycle: creatorPaymentCycle || undefined,
    brand_receive_payment_cycle: brandReceivePaymentCycle || undefined,
    brand_payment_status: brandPaymentStatus || undefined,
    invoice_pdf_link: invoicePdfLink || undefined,
    invoice_direct_link: invoiceDirectLink || undefined,
    tracking_id: trackingId || undefined,
    invoice_status: invoiceStatus || undefined,
    invoice_generated_on: invoiceGeneratedOn || undefined,
    invoice_number: invoiceNumber || undefined,
    creator_email: creatorEmail || undefined,
    invoice_amount: invoiceAmount || undefined,
    gst_amount: gstAmount || undefined,
    invoice_total: invoiceTotal || undefined,
    unique_id: (rawExplicitId && rawExplicitId !== "#ERROR!") ? rawExplicitId : deliverableId,
    source_sheet: sourceSheet || undefined,
    brand_agency_poc: (brandPoc && brandPoc !== "N/A") ? brandPoc : undefined,
  };

  // 4. AUTOMATIC STATUS CASCADING & SMART DATE POPULATION
  const { updated: finalDeliverable } = applySmartStatusCascades(initialDeliverable);

  return {
    campaign: {
      id: campaignId,
      campaign_month: campaignMonth,
      client_type: clientType,
      org_name: orgName,
      campaign_name: campaignName,
      brief_name: briefName || undefined,
      xcelerate_poc: xceleratePoc,
      brand_agency_poc: brandPoc,
      brand_payment_cycle: brandPaymentCycle,
      status: (finalDeliverable.execution_status as string) || "On Going",
    },
    deliverable: finalDeliverable as CreatorDeliverableInternal,
  };
}

/**
 * Process a batch of rows from Google Sheet and upsert into Turso.
 */
export async function syncGoogleSheetRows(rows: SheetRowRaw[]) {
  await initDatabase();

  const fingerprintCounts = new Map<string, number>();
  const campaignsMap = new Map<string, any>();
  const orgsMap = new Map<string, any>();
  const deliverableStatements: { sql: string; args: any[] }[] = [];
  const allDeliverables: CreatorDeliverableInternal[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];

    // Check if row has an explicit ID (including Unique_ID column from employee sheet)
    const rawUid = parseString(
      rawRow["Unique_ID"] || 
      rawRow["unique_id"] || 
      rawRow["uniqueid"],
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
          rawRow["S.No"] || 
          rawRow["SNo"] || 
          rawRow["s.no"] || 
          rawRow["sno"] ||
          rawRow["Sr. No"] ||
          rawRow["Sr.No"] ||
          rawRow["Sl No"] ||
          rawRow["Sl. No"] ||
          rawRow["#"], 
          ""
        );

    let occurrence = 1;
    if (!explicitId) {
      if (rawRow["_sheet_occurrence"] && parseNumber(rawRow["_sheet_occurrence"]) > 0) {
        occurrence = parseNumber(rawRow["_sheet_occurrence"]);
      } else {
        const n = normalizeSheetHeaders(rawRow);
        const campId = parseString(n.campaignid || rawRow["Campaign ID"], "CAMP-DEFAULT");
        const cName = parseString(n.creatorname || rawRow["Creator Name"], "creator").toLowerCase().replace(/[^a-z0-9]/g, "");
        const dTag = parseString(n.deliverables || rawRow["Deliverables"], "").toLowerCase().replace(/[^a-z0-9]/g, "") || "d1";
        const baseKey = `${campId}_${cName}_${dTag}`;
        occurrence = (fingerprintCounts.get(baseKey) || 0) + 1;
        fingerprintCounts.set(baseKey, occurrence);
      }
    }

    const { campaign, deliverable } = mapRowToDeliverable(rawRow, idx, occurrence);
    if (!deliverable.id) {
      const sheetRowLabel = rawRow["_sheet_row"] ? `Row ${rawRow["_sheet_row"]}` : `Row index ${idx + 2}`;
      console.warn(`[Sheet Sync Audit] Skipped ${sheetRowLabel}: missing Deliverable ID`);
      continue;
    }

    // Deduplicate campaigns
    if (!campaignsMap.has(campaign.id)) {
      campaignsMap.set(campaign.id, campaign);
    } else {
      const existing = campaignsMap.get(campaign.id);
      if ((!existing.brand_agency_poc || existing.brand_agency_poc === "N/A") && campaign.brand_agency_poc && campaign.brand_agency_poc !== "N/A") {
        existing.brand_agency_poc = campaign.brand_agency_poc;
      }
    }

    // Deduplicate organizations (only track real client organizations, never Unassigned)
    if (campaign.org_name && campaign.org_name.trim() && campaign.org_name !== "Unassigned") {
      const orgId = `org-${campaign.org_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      if (!orgsMap.has(orgId)) {
        orgsMap.set(orgId, { id: orgId, name: campaign.org_name, type: campaign.client_type || "Brand", poc_name: campaign.brand_agency_poc });
      }
    }

    const d = deliverable;
    allDeliverables.push(d);
    deliverableStatements.push({
      sql: `INSERT INTO campaign_creators (
        id, campaign_id, creator_name, niche, profile_url, followers_count, category,
        city, state, language, gender, phone_number, deliverables, brand_cost, creator_cost,
        gross_margin, address, product_status, confirmation_mail_status, script_link,
        script_status, script_approval_date, first_draft_status, first_draft_date,
        revision_drive_link, final_video_status, video_approval_date, live_link, live_date,
        execution_status, total_views, likes, comments, saves, shares, avg_watch_time,
        engagement_rate, account_reach, screenshots, day7_views, day7_er, day15_views,
        day15_er, day30_views, day30_er,
        execution_owner, brief_name, brand_agency_poc, creator_payment_cycle, brand_receive_payment_cycle,
        brand_payment_status, invoice_pdf_link, invoice_direct_link, tracking_id,
        invoice_status, invoice_generated_on, invoice_number, creator_email,
        invoice_amount, gst_amount, invoice_total, unique_id, source_sheet, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        campaign_id = excluded.campaign_id,
        creator_name = excluded.creator_name,
        niche = excluded.niche,
        profile_url = excluded.profile_url,
        followers_count = excluded.followers_count,
        category = excluded.category,
        city = excluded.city,
        state = excluded.state,
        language = excluded.language,
        gender = excluded.gender,
        phone_number = excluded.phone_number,
        deliverables = excluded.deliverables,
        brand_cost = excluded.brand_cost,
        creator_cost = excluded.creator_cost,
        gross_margin = excluded.gross_margin,
        address = excluded.address,
        product_status = excluded.product_status,
        confirmation_mail_status = excluded.confirmation_mail_status,
        script_link = excluded.script_link,
        script_status = excluded.script_status,
        script_approval_date = excluded.script_approval_date,
        first_draft_status = excluded.first_draft_status,
        first_draft_date = excluded.first_draft_date,
        revision_drive_link = excluded.revision_drive_link,
        final_video_status = excluded.final_video_status,
        video_approval_date = excluded.video_approval_date,
        live_link = excluded.live_link,
        live_date = excluded.live_date,
        execution_status = excluded.execution_status,
        total_views = excluded.total_views,
        likes = excluded.likes,
        comments = excluded.comments,
        saves = excluded.saves,
        shares = excluded.shares,
        avg_watch_time = excluded.avg_watch_time,
        engagement_rate = excluded.engagement_rate,
        account_reach = excluded.account_reach,
        screenshots = excluded.screenshots,
        day7_views = excluded.day7_views,
        day7_er = excluded.day7_er,
        day15_views = excluded.day15_views,
        day15_er = excluded.day15_er,
        day30_views = excluded.day30_views,
        day30_er = excluded.day30_er,
        execution_owner = excluded.execution_owner,
        brief_name = excluded.brief_name,
        brand_agency_poc = excluded.brand_agency_poc,
        creator_payment_cycle = excluded.creator_payment_cycle,
        brand_receive_payment_cycle = excluded.brand_receive_payment_cycle,
        brand_payment_status = excluded.brand_payment_status,
        invoice_pdf_link = excluded.invoice_pdf_link,
        invoice_direct_link = excluded.invoice_direct_link,
        tracking_id = excluded.tracking_id,
        invoice_status = excluded.invoice_status,
        invoice_generated_on = excluded.invoice_generated_on,
        invoice_number = excluded.invoice_number,
        creator_email = excluded.creator_email,
        invoice_amount = excluded.invoice_amount,
        gst_amount = excluded.gst_amount,
        invoice_total = excluded.invoice_total,
        unique_id = excluded.unique_id,
        source_sheet = excluded.source_sheet,
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        d.id, d.campaign_id, d.creator_name, d.niche, d.profile_url, d.followers_count, d.category,
        d.city, d.state, d.language, d.gender, d.phone_number, d.deliverables, d.brand_cost, d.creator_cost,
        d.gross_margin, d.address || "", d.product_status, d.confirmation_mail_status, d.script_link || "",
        d.script_status, d.script_approval_date || "", d.first_draft_status, d.first_draft_date || "",
        d.revision_drive_link || "", d.final_video_status, d.video_approval_date || "", d.live_link || "", d.live_date || "",
        d.execution_status, d.total_views, d.likes, d.comments, d.saves, d.shares, d.avg_watch_time,
        d.engagement_rate, d.account_reach, d.screenshots, d.day7_views, d.day7_er, d.day15_views,
        d.day15_er, d.day30_views, d.day30_er,
        d.execution_owner || null, d.brief_name || null, d.brand_agency_poc || null, d.creator_payment_cycle || null, d.brand_receive_payment_cycle || null,
        d.brand_payment_status || null, d.invoice_pdf_link || null, d.invoice_direct_link || null, d.tracking_id || null,
        d.invoice_status || null, d.invoice_generated_on || null, d.invoice_number || null, d.creator_email || null,
        d.invoice_amount ?? 0, d.gst_amount ?? 0, d.invoice_total ?? 0, d.unique_id || d.id, d.source_sheet || null
      ],
    });
  }

  // Combine into optimized batch statements
  const allBatchStatements: { sql: string; args: any[] }[] = [];

  // 1. Unique campaigns (with brief_name support)
  for (const campaign of campaignsMap.values()) {
    allBatchStatements.push({
      sql: `INSERT INTO campaigns (id, campaign_month, client_type, org_name, campaign_name, brief_name, xcelerate_poc, brand_agency_poc, brand_payment_cycle, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              campaign_month = excluded.campaign_month,
              client_type = excluded.client_type,
              org_name = excluded.org_name,
              campaign_name = excluded.campaign_name,
              brief_name = COALESCE(excluded.brief_name, campaigns.brief_name),
              xcelerate_poc = excluded.xcelerate_poc,
              brand_agency_poc = CASE 
                WHEN excluded.brand_agency_poc IS NOT NULL AND excluded.brand_agency_poc != 'N/A' AND excluded.brand_agency_poc != '' 
                THEN excluded.brand_agency_poc 
                ELSE campaigns.brand_agency_poc 
              END,
              brand_payment_cycle = excluded.brand_payment_cycle,
              status = excluded.status`,
      args: [
        campaign.id,
        campaign.campaign_month,
        campaign.client_type,
        campaign.org_name,
        campaign.campaign_name,
        campaign.brief_name || null,
        campaign.xcelerate_poc,
        campaign.brand_agency_poc,
        campaign.brand_payment_cycle,
        campaign.status,
      ],
    });
  }

  // 2. Unique organizations
  for (const org of orgsMap.values()) {
    allBatchStatements.push({
      sql: `INSERT OR IGNORE INTO organizations (id, name, type, poc_name)
            VALUES (?, ?, ?, ?)`,
      args: [org.id, org.name, org.type, org.poc_name],
    });
  }

  // 3. Creator deliverables
  allBatchStatements.push(...deliverableStatements);

  // Check which deliverables already exist in DB to accurately report updated vs newly added creators
  const allIds = allDeliverables.map((d) => d.id).filter(Boolean);
  const existingIdSet = new Set<string>();
  if (allIds.length > 0) {
    try {
      const ID_CHUNK = 200;
      for (let i = 0; i < allIds.length; i += ID_CHUNK) {
        const chunk = allIds.slice(i, i + ID_CHUNK);
        const placeholders = chunk.map(() => "?").join(",");
        const res = await db.execute({
          sql: `SELECT id FROM campaign_creators WHERE id IN (${placeholders})`,
          args: chunk,
        });
        for (const row of res.rows) {
          existingIdSet.add(String(row.id));
        }
      }
    } catch (e) {
      console.warn("Could not check existing IDs for update count", e);
    }
  }

  let updatedCount = 0;
  let newCount = 0;
  const newCreatorsSet = new Set<string>();

  for (const d of allDeliverables) {
    if (existingIdSet.has(d.id)) {
      updatedCount++;
    } else {
      newCount++;
      if (d.creator_name && d.creator_name.trim()) {
        newCreatorsSet.add(d.creator_name.trim());
      }
    }
  }
  const newCreators = Array.from(newCreatorsSet);

  // Execute in batches of up to 50 statements for blazing-fast atomic writes
  const BATCH_SIZE = 50;
  for (let i = 0; i < allBatchStatements.length; i += BATCH_SIZE) {
    const chunk = allBatchStatements.slice(i, i + BATCH_SIZE);
    await db.batch(chunk, "write");
  }

  const insertedOrUpdated = deliverableStatements.length;

  // Log sync history with source attribution
  const sheetSource = rows[0]?._sheet_name 
    ? `${rows[0]?._spreadsheet_title || "Google Sheets"} (${rows[0]?._sheet_name})`
    : "Google Sheets Webhook";

  await db.execute({
    sql: `INSERT INTO sync_logs (source, records_synced, status, details) VALUES (?, ?, ?, ?)`,
    args: [
      sheetSource, 
      insertedOrUpdated, 
      "SUCCESS", 
      `Synchronized ${insertedOrUpdated} rows (${updatedCount} updated, ${newCount} added, ${newCreators.length} new creators) from ${sheetSource}`
    ],
  });

  return {
    success: true,
    recordsProcessed: insertedOrUpdated,
    updatedCount,
    newCount,
    newCreators,
  };
}
