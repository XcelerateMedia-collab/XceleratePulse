export type Role = "SUPER_ADMIN" | "INTERNAL_OPS" | "BRAND_CLIENT" | "AGENCY_CLIENT" | "EMPLOYEE" | "PERFORMANCE_ANALYST";

export type ClientType = "Brand" | "Agency" | "Other";

export type CategoryTier = "Nano" | "Micro" | "Macro" | "Mega" | "Unspecified";

export type ScriptStatus = 
  | "Script Pending"
  | "Approval Pending"
  | "Approved"
  | "Drop";

export type DraftStatus = 
  | "Draft Pending"
  | "Approval Pending"
  | "Sent For Revision/Reshoot"
  | "Feedback Pending"
  | "Revision/Reshoot Done"
  | "Approved"
  | "Drop";

export type FinalVideoStatus = 
  | "Approval Pending"
  | "Approved"
  | "Drop";

export type ExecutionStatus = 
  | "On Going"
  | "Drop"
  | "Completed"
  | "Hold";

export type ProductStatus =
  | "Not Applicable"
  | "Pending Dispatch"
  | "Shipped"
  | "Delivered";

export type ConfirmationMailStatus =
  | "Pending"
  | "Mail Sent"
  | "Drop";

/**
 * Full Deliverable record from DB (including sensitive agency commercials)
 */
export interface CreatorDeliverableInternal {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  org_name?: string;
  client_type?: string;
  campaign_month?: string;
  creator_name: string;
  niche: string;
  profile_url: string;
  followers_count: number;
  category: CategoryTier;
  city: string;
  state: string;
  language: string;
  gender: string;
  phone_number: string; // RESTRICTED
  deliverables: string;
  brand_cost: number;
  creator_cost: number; // RESTRICTED
  gross_margin: number; // RESTRICTED
  address?: string;
  product_status: ProductStatus;
  confirmation_mail_status: ConfirmationMailStatus;
  script_link?: string;
  script_status: ScriptStatus;
  script_approval_date?: string;
  first_draft_status: DraftStatus;
  first_draft_date?: string;
  revision_drive_link?: string;
  final_video_status: FinalVideoStatus;
  video_approval_date?: string;
  live_link?: string;
  live_date?: string;
  execution_status: ExecutionStatus;
  // Metrics
  total_views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  avg_watch_time: string;
  engagement_rate: number;
  account_reach: number;
  screenshots: string; // JSON string array
  // Milestones
  day7_views: number;
  day7_er: number;
  day7_reach?: number;
  day7_likes?: number;
  day7_comments?: number;
  day7_saves?: number;
  day7_shares?: number;
  day7_avg_watch_time?: string;
  day7_screenshot?: string;
  day15_views: number;
  day15_er: number;
  day15_reach?: number;
  day15_likes?: number;
  day15_comments?: number;
  day15_saves?: number;
  day15_shares?: number;
  day15_avg_watch_time?: string;
  day15_screenshot?: string;
  day30_views: number;
  day30_er: number;
  day30_reach?: number;
  day30_likes?: number;
  day30_comments?: number;
  day30_saves?: number;
  day30_shares?: number;
  day30_avg_watch_time?: string;
  day30_screenshot?: string;
  // Employee Execution & Invoicing Fields
  execution_owner?: string;
  brief_name?: string;
  brand_agency_poc?: string;
  creator_payment_cycle?: string;
  brand_receive_payment_cycle?: string;
  brand_payment_status?: string;
  invoice_pdf_link?: string;
  invoice_direct_link?: string;
  tracking_id?: string;
  invoice_status?: string;
  invoice_generated_on?: string;
  invoice_number?: string;
  creator_email?: string; // RESTRICTED
  invoice_amount?: number; // RESTRICTED
  gst_amount?: number; // RESTRICTED
  invoice_total?: number; // RESTRICTED
  unique_id?: string;
  source_sheet?: string;
  updated_at?: string;
}

/**
 * Sanitized Deliverable record for Brand/Agency Client View.
 * Sensitive fields (Phone, Creator Cost, Gross Margin, Creator Invoices) are NEVER present.
 */
export type CreatorDeliverableBrandView = Omit<
  CreatorDeliverableInternal,
  | "phone_number" 
  | "creator_cost" 
  | "gross_margin" 
  | "invoice_amount" 
  | "gst_amount" 
  | "invoice_total" 
  | "creator_payment_cycle" 
  | "creator_email"
>;

export interface CampaignSummary {
  id: string;
  campaign_month: string;
  client_type: ClientType;
  org_name: string;
  campaign_name: string;
  xcelerate_poc: string;
  brand_agency_poc: string;
  brand_payment_cycle: string;
  status: ExecutionStatus;
  created_at: string;
  deliverables_count?: number;
  total_views?: number;
  total_reach?: number;
  avg_er?: number;
  execution_owners?: string[];
}

/**
 * Strips confidential agency margins, invoices, and creator phone numbers
 * to ensure complete data security for client sessions.
 */
export function sanitizeForBrand(
  record: CreatorDeliverableInternal
): CreatorDeliverableBrandView {
  const { 
    phone_number, 
    creator_cost, 
    gross_margin,
    invoice_amount,
    gst_amount,
    invoice_total,
    creator_payment_cycle,
    creator_email,
    ...brandSafeRecord 
  } = record;
  return brandSafeRecord;
}

export type CampaignAccessMode = "ALL" | "SPECIFIC";

/**
 * Brand/Agency portal credential managed by admin.
 */
export interface BrandCredential {
  id: string;
  org_name: string;
  portal_username: string;
  portal_password: string;
  role: Role;
  is_active: boolean;
  notes?: string;
  campaign_access_mode?: CampaignAccessMode; // "ALL" = All campaigns for this org, "SPECIFIC" = Only assigned_campaign_ids
  assigned_campaign_ids?: string[]; // Array of campaign IDs (e.g. ["Aspero APRIL HM 2026", "Dominos-May2026"])
  created_at: string;
  updated_at: string;
}
