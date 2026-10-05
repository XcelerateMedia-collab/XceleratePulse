"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Role, CampaignSummary, CreatorDeliverableBrandView, CreatorDeliverableInternal, BrandCredential } from "@/lib/types";
import { getCampaigns, getCampaignDeliverables, getCredentials } from "@/lib/db/actions";
import { Navbar } from "@/components/layout/Navbar";
import { ExecutiveKpis } from "@/components/dashboard/ExecutiveKpis";
import { CampaignPipelineView } from "@/components/pipeline/CampaignPipelineView";
import { PerformanceAnalyticsView } from "@/components/analytics/PerformanceAnalyticsView";
import { AgencyFinancialsView } from "@/components/admin/AgencyFinancialsView";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { CampaignSelector, formatCleanMonth } from "@/components/pipeline/CampaignSelector";
import { LandingHero } from "@/components/landing/LandingHero";
import { 
  Kanban, 
  BarChart3, 
  PieChart, 
  RefreshCw, 
  Settings
} from "lucide-react";

const SESSION_STORAGE_KEY = "xcelerate_pulse_auth_session";

interface PulseAuthSession {
  viewMode: "landing" | "portal";
  role: Role;
  selectedOrg: string;
  activeTab: "pipeline" | "analytics" | "financials" | "settings";
  credential?: BrandCredential | null;
  selectedCampaignId?: string;
  selectedCampaignIds?: string[];
  timestamp: number;
}

export default function Home() {
  const [isSessionRestoring, setIsSessionRestoring] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"landing" | "portal">("landing");
  const [role, setRole] = useState<Role>("BRAND_CLIENT");
  const [selectedOrg, setSelectedOrg] = useState<string>("All Organizations");
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [credentials, setCredentials] = useState<BrandCredential[]>([]);
  const [activeCredential, setActiveCredential] = useState<BrandCredential | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(["ALL"]);
  const [deliverables, setDeliverables] = useState<(CreatorDeliverableBrandView | CreatorDeliverableInternal)[]>([]);
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "analytics" | "financials" | "settings">("pipeline");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active refs to ensure callbacks have stable references across renders
  const roleRef = useRef(role);
  const selectedOrgRef = useRef(selectedOrg);
  const selectedCampaignIdsRef = useRef(selectedCampaignIds);
  const deliverablesRef = useRef(deliverables);
  const activeCredentialRef = useRef(activeCredential);

  useEffect(() => {
    roleRef.current = role;
    selectedOrgRef.current = selectedOrg;
    selectedCampaignIdsRef.current = selectedCampaignIds;
    deliverablesRef.current = deliverables;
    activeCredentialRef.current = activeCredential;
  }, [role, selectedOrg, selectedCampaignIds, deliverables, activeCredential]);

  // Determine effective assigned campaign IDs based on active credential or matched org
  const effectiveAssignedCampaignIds = useMemo(() => {
    if (role === "SUPER_ADMIN" || role === "INTERNAL_OPS") return undefined;
    if (activeCredential?.campaign_access_mode === "SPECIFIC") {
      return activeCredential.assigned_campaign_ids && activeCredential.assigned_campaign_ids.length > 0
        ? activeCredential.assigned_campaign_ids
        : undefined;
    }
    // Fallback: check matching credential by org and role
    const matched = credentials.find(
      c => c.org_name.toLowerCase() === selectedOrg.toLowerCase() && c.role === role
    );
    if (matched?.campaign_access_mode === "SPECIFIC" && matched.assigned_campaign_ids && matched.assigned_campaign_ids.length > 0) {
      return matched.assigned_campaign_ids;
    }
    return undefined;
  }, [role, selectedOrg, activeCredential, credentials]);

  // Handle explicit sign-out & return to landing page
  const handleExitToLanding = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {}
    setActiveCredential(null);
    setSelectedCampaignIds(["ALL"]);
    setRole("BRAND_CLIENT");
    setSelectedOrg("All Organizations");
    setActiveTab("pipeline");
    setViewMode("landing");
  }, []);

  // 1. Session Restoration on Initial Mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const session: PulseAuthSession = JSON.parse(saved);
          if (session && session.viewMode === "portal") {
            if (session.role) setRole(session.role);
            if (session.selectedOrg) setSelectedOrg(session.selectedOrg);
            if (session.activeTab) setActiveTab(session.activeTab);
            if (session.credential) setActiveCredential(session.credential);
            if (session.selectedCampaignIds && Array.isArray(session.selectedCampaignIds) && session.selectedCampaignIds.length > 0) {
              setSelectedCampaignIds(session.selectedCampaignIds);
            } else if (session.selectedCampaignId) {
              setSelectedCampaignIds([session.selectedCampaignId]);
            } else {
              setSelectedCampaignIds(["ALL"]);
            }
            setViewMode("portal");
          }
        }
      }
    } catch (err) {
      console.error("Failed to restore session from storage:", err);
    } finally {
      setIsSessionRestoring(false);
    }
  }, []);

  // 2. Persist Session on State Changes
  useEffect(() => {
    if (isSessionRestoring || typeof window === "undefined") return;
    if (viewMode === "portal") {
      try {
        const sessionData: PulseAuthSession = {
          viewMode: "portal",
          role,
          selectedOrg,
          activeTab,
          credential: activeCredential,
          selectedCampaignId: selectedCampaignIds[0] || "ALL",
          selectedCampaignIds,
          timestamp: Date.now(),
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (err) {
        console.error("Failed to persist session to storage:", err);
      }
    } else {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
    }
  }, [isSessionRestoring, viewMode, role, selectedOrg, activeTab, activeCredential, selectedCampaignIds]);

  // Pre-load credentials on mount and re-validate active restored credential
  useEffect(() => {
    getCredentials()
      .then((creds) => {
        setCredentials(creds);

        // Security re-validation of restored credential:
        // If current session is a non-admin role with an active credential, check if still active
        if (roleRef.current !== "SUPER_ADMIN" && roleRef.current !== "INTERNAL_OPS") {
          const currentCred = activeCredentialRef.current;
          if (currentCred) {
            const freshCred = creds.find(
              (c) => c.id === currentCred.id || c.portal_username.toLowerCase() === currentCred.portal_username.toLowerCase()
            );
            if (!freshCred || !freshCred.is_active) {
              console.warn("Restored credential is disabled or deleted. Logging out.");
              handleExitToLanding();
            } else {
              // Update with any modified assigned campaigns or notes
              setActiveCredential(freshCred);
            }
          }
        }
      })
      .catch((err) => console.error("Initial credentials load error:", err));
  }, [handleExitToLanding]);

  const handleEnterPlatform = useCallback((
    newRole?: Role, 
    newOrg?: string,
    initialTab?: "pipeline" | "analytics" | "financials" | "settings",
    cred?: BrandCredential | null
  ) => {
    const roleToSet = newRole || "BRAND_CLIENT";
    const orgToSet = newOrg || "All Organizations";
    const tabToSet = initialTab || "pipeline";
    if (newRole) setRole(roleToSet);
    if (newOrg) setSelectedOrg(orgToSet);
    if (initialTab) setActiveTab(tabToSet);
    setActiveCredential(cred || null);
    setSelectedCampaignIds(["ALL"]);
    setViewMode("portal");

    try {
      if (typeof window !== "undefined") {
        const sessionData: PulseAuthSession = {
          viewMode: "portal",
          role: roleToSet,
          selectedOrg: orgToSet,
          activeTab: tabToSet,
          credential: cred || null,
          selectedCampaignId: "ALL",
          selectedCampaignIds: ["ALL"],
          timestamp: Date.now(),
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      }
    } catch (err) {
      console.error("Failed to save session on login:", err);
    }
  }, []);

  // In-memory cache for instant 0ms campaign switching
  const allDeliverablesRef = useRef<(CreatorDeliverableBrandView | CreatorDeliverableInternal)[]>([]);
  const campaignCacheRef = useRef<Map<string, (CreatorDeliverableBrandView | CreatorDeliverableInternal)[]>>(new Map());

  // Load campaigns, credentials, and deliverables with a 100% stable reference
  const loadData = useCallback(async () => {
    if (deliverablesRef.current.length === 0) {
      setIsLoading(true);
    }
    try {
      const assignedIds = effectiveAssignedCampaignIds;

      const [campList, credList, delivRes] = await Promise.all([
        getCampaigns(roleRef.current, selectedOrgRef.current, assignedIds),
        getCredentials(),
        getCampaignDeliverables("ALL", roleRef.current, selectedOrgRef.current, assignedIds),
      ]);

      setCampaigns(campList);
      setCredentials(credList);
      setIsInternal(delivRes.isInternal);

      // Cache all deliverables for instant 0ms multi-selection filtering
      allDeliverablesRef.current = delivRes.deliverables;
      campaignCacheRef.current.set("ALL", delivRes.deliverables);

      // Pre-index by campaign_id
      for (let i = 0; i < delivRes.deliverables.length; i++) {
        const d = delivRes.deliverables[i];
        if (d.campaign_id) {
          const arr = campaignCacheRef.current.get(d.campaign_id) || [];
          arr.push(d);
          campaignCacheRef.current.set(d.campaign_id, arr);
        }
      }

      // Apply current multi-campaign filter
      const currentSelected = selectedCampaignIdsRef.current;
      const isAll = !currentSelected || currentSelected.length === 0 || currentSelected.includes("ALL");
      
      if (isAll) {
        setDeliverables(delivRes.deliverables);
      } else {
        const selSet = new Set(currentSelected);
        const selNames = new Set(
          campList.filter(c => selSet.has(c.id)).map(c => c.campaign_name.trim().toLowerCase())
        );
        const filtered = delivRes.deliverables.filter(d => 
          (d.campaign_id && selSet.has(d.campaign_id)) ||
          (d.campaign_name && selNames.has(d.campaign_name.trim().toLowerCase()))
        );
        setDeliverables(filtered);
      }
    } catch (err) {
      console.error("Failed to load campaign data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveAssignedCampaignIds]);

  // Real-time synchronization when credentials are created, modified, disabled, or deleted
  const refreshCredentials = useCallback(async () => {
    try {
      const credList = await getCredentials();
      setCredentials(credList);

      // If currently in client session for an org whose credential was deleted or disabled, fallback to SUPER_ADMIN
      if (roleRef.current !== "SUPER_ADMIN" && roleRef.current !== "INTERNAL_OPS") {
        const exists = credList.some(
          (c) => c.org_name.toLowerCase() === selectedOrgRef.current.toLowerCase() && c.is_active
        );
        if (!exists) {
          setRole("SUPER_ADMIN");
        }
      }
    } catch (err) {
      console.error("Failed to refresh credentials:", err);
    }
  }, []);

  // Multi-campaign selection change (Instant 0ms in-memory update)
  const handleCampaignsChange = useCallback((campIds: string[]) => {
    const normalizedIds = campIds.length === 0 || campIds.includes("ALL") ? ["ALL"] : campIds;
    setSelectedCampaignIds(normalizedIds);

    if (normalizedIds.includes("ALL")) {
      if (allDeliverablesRef.current.length > 0) {
        setDeliverables(allDeliverablesRef.current);
      }
    } else {
      const selSet = new Set(normalizedIds);
      const selNames = new Set(
        campaigns.filter(c => selSet.has(c.id)).map(c => c.campaign_name.trim().toLowerCase())
      );
      if (allDeliverablesRef.current.length > 0) {
        const filtered = allDeliverablesRef.current.filter(d => 
          (d.campaign_id && selSet.has(d.campaign_id)) ||
          (d.campaign_name && selNames.has(d.campaign_name.trim().toLowerCase()))
        );
        setDeliverables(filtered);
      }
    }
  }, [campaigns]);

  // Single-campaign compatibility wrapper
  const handleSingleCampaignChange = useCallback((campId: string) => {
    if (campId === "ALL") {
      handleCampaignsChange(["ALL"]);
    } else {
      handleCampaignsChange([campId]);
    }
  }, [handleCampaignsChange]);

  useEffect(() => {
    if (viewMode === "portal") {
      loadData();
    }
  }, [role, selectedOrg, viewMode, effectiveAssignedCampaignIds]);

  const isAllSelected = useMemo(() => {
    if (selectedCampaignIds.length === 0) return true;
    if (selectedCampaignIds.includes("ALL")) return true;
    if (campaigns.length > 0 && selectedCampaignIds.length === campaigns.length) return true;
    return false;
  }, [selectedCampaignIds, campaigns.length]);

  const isSingleSelected = !isAllSelected && selectedCampaignIds.length === 1;

  const currentCampaign = useMemo(() => {
    if (isSingleSelected) {
      return campaigns.find((c) => c.id === selectedCampaignIds[0]) || null;
    }
    return null;
  }, [isSingleSelected, selectedCampaignIds, campaigns]);

  const selectedCampaignsList = useMemo(() => {
    if (isAllSelected) return campaigns;
    const set = new Set(selectedCampaignIds);
    return campaigns.filter((c) => set.has(c.id));
  }, [isAllSelected, selectedCampaignIds, campaigns]);

  const activeDisplayTitle = useMemo(() => {
    if (isAllSelected) {
      return "All Campaigns (Consolidated Overview)";
    }
    if (isSingleSelected && currentCampaign) {
      return currentCampaign.campaign_name || "Campaign Execution Portal";
    }
    if (selectedCampaignsList.length > 0) {
      const names = selectedCampaignsList.map(c => c.campaign_name);
      const preview = names.slice(0, 2).join(", ");
      const extra = names.length > 2 ? ` + ${names.length - 2} more` : "";
      return `${selectedCampaignsList.length} Campaigns Selected (${preview}${extra})`;
    }
    return "Selected Campaigns View";
  }, [isAllSelected, isSingleSelected, currentCampaign, selectedCampaignsList]);

  const brandPocValue = useMemo(() => {
    if (isAllSelected || !isSingleSelected) return "Multiple POCs";
    if (
      currentCampaign?.brand_agency_poc &&
      currentCampaign.brand_agency_poc.trim() &&
      currentCampaign.brand_agency_poc !== "Brand Manager"
    ) {
      return currentCampaign.brand_agency_poc.trim();
    }
    return "N/A";
  }, [isAllSelected, isSingleSelected, currentCampaign?.brand_agency_poc]);

  // While restoring session from storage on page refresh, show seamless splash to prevent landing flash
  if (isSessionRestoring) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 selection:bg-[#0052FF] selection:text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <img
              src="/xcelerate-logo-trimmed.png"
              alt="Xcelerate Media"
              className="h-12 w-auto object-contain animate-pulse"
            />
          </div>
          <div className="flex items-center space-x-2.5 text-xs font-semibold text-slate-500">
            <div className="w-4 h-4 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin" />
            <span>Restoring secure session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "landing") {
    return (
      <LandingHero
        onEnterPlatform={handleEnterPlatform}
        credentials={credentials}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans selection:bg-[#0052FF] selection:text-white overflow-x-hidden w-full max-w-full">
      {/* Top Navigation */}
      <Navbar
        currentRole={role}
        onRoleChange={setRole}
        selectedOrg={selectedOrg}
        onOrgChange={setSelectedOrg}
        onRefreshData={loadData}
        isSyncing={isLoading}
        credentials={credentials}
        onExitToLanding={handleExitToLanding}
        onCredentialChange={setActiveCredential}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-4 sm:space-y-6 min-w-0">
        
        {/* Campaign Header & Tab Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200">
          
          {/* Campaign Selector / Title */}
          <div className="space-y-1.5 min-w-0">
            {/* Header Controls: Campaign Filter & Breadcrumbs */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Multi-Campaign Filter Trigger: Always anchored at fixed coordinate on the left */}
              {campaigns.length > 0 && (
                <div className="shrink-0">
                  <CampaignSelector
                    campaigns={campaigns}
                    selectedCampaignIds={selectedCampaignIds}
                    onSelectCampaigns={handleCampaignsChange}
                  />
                </div>
              )}

              {/* Clean Vertical Divider */}
              <div className="h-4 w-px bg-slate-300/80 shrink-0 hidden sm:block" />

              {/* Metadata Breadcrumbs: flex-1, never pushes or wraps the trigger button */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs text-[#0052FF] font-bold uppercase tracking-wider min-w-0 truncate">
                <span className="truncate">
                  {isAllSelected 
                    ? "ALL ORGANIZATIONS" 
                    : isSingleSelected 
                      ? (currentCampaign?.org_name || selectedOrg) 
                      : `${selectedCampaignsList.length} CAMPAIGNS SELECTED`}
                </span>
                <span className="text-slate-300 shrink-0">/</span>
                <span className="text-slate-500 font-semibold truncate shrink-0">
                  {isAllSelected 
                    ? "All Months" 
                    : isSingleSelected 
                      ? formatCleanMonth(currentCampaign?.campaign_month) 
                      : "Filtered View"}
                </span>
                {isSingleSelected && currentCampaign?.id && (
                  <>
                    <span className="text-slate-300 shrink-0">•</span>
                    <span className="text-slate-600 font-mono lowercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] shrink-0">
                      {currentCampaign.id}
                    </span>
                  </>
                )}
                {!isAllSelected && !isSingleSelected && (
                  <>
                    <span className="text-slate-300 shrink-0">•</span>
                    <span className="text-blue-700 bg-blue-50 font-semibold px-2 py-0.5 rounded-full border border-blue-200 text-[10px] shrink-0">
                      {deliverables.length} Deliverables
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Full Campaign Title (Dedicated Line, never truncated) */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-snug break-words">
                {activeDisplayTitle}
              </h1>
            </div>
          </div>

          {/* Module Tabs (Zero-delay Segmented Control with mobile touch horizontal scroll) */}
          <div className="w-full lg:w-auto overflow-x-auto no-scrollbar py-0.5">
            <div className="inline-flex items-center p-1 sm:p-1.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold shadow-xs min-w-max gap-1">
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
                  activeTab === "pipeline"
                    ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Kanban className="w-4 h-4 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Live </span>Execution Pipeline
                </span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
                  activeTab === "analytics"
                    ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Reel </span>Performance &amp; Analytics
                </span>
              </button>

              {(role === "SUPER_ADMIN" || role === "INTERNAL_OPS") && (
                <button
                  onClick={() => setActiveTab("financials")}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
                    activeTab === "financials"
                      ? "bg-indigo-700 text-white shadow-md shadow-indigo-700/25"
                      : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50"
                  }`}
                >
                  <PieChart className="w-4 h-4 shrink-0" />
                  <span>Agency ERP &amp; P&amp;L</span>
                </button>
              )}

              {(role === "SUPER_ADMIN" || role === "INTERNAL_OPS") && (
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
                    activeTab === "settings"
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Settings</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading Spinner State: Only displayed on initial cold load before data exists */}
        {isLoading && deliverables.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0052FF] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading live campaign status from database...</p>
          </div>
        ) : (
          <>
            {/* Executive KPIs */}
            <ExecutiveKpis
              deliverables={deliverables}
              isInternal={isInternal}
              role={role}
              campaignName={activeDisplayTitle}
            />

            {/* Tab 1: Live Execution Pipeline */}
            <div className={activeTab === "pipeline" ? "block" : "hidden"}>
              <CampaignPipelineView
                deliverables={deliverables}
                isInternal={isInternal}
                role={role}
                xceleratePoc={isAllSelected || !isSingleSelected ? "All Ops Leads" : (currentCampaign?.xcelerate_poc || "Rohan Mehra")}
                brandPoc={brandPocValue}
                paymentCycle={isAllSelected || !isSingleSelected ? "Multiple Cycles" : (currentCampaign?.brand_payment_cycle || "30 Days Net")}
                onDeliverableUpdated={loadData}
              />
            </div>

            {/* Tab 2: 7d / 15d / 30d Performance Analytics */}
            <div className={activeTab === "analytics" ? "block" : "hidden"}>
              <PerformanceAnalyticsView
                deliverables={deliverables}
                campaignName={activeDisplayTitle}
                role={role}
                isInternal={isInternal}
                onDeliverableUpdated={loadData}
              />
            </div>

            {/* Tab 3: Internal Agency ERP & Financials */}
            {(role === "SUPER_ADMIN" || role === "INTERNAL_OPS") && (
              <div className={activeTab === "financials" ? "block" : "hidden"}>
                <AgencyFinancialsView campaigns={campaigns} />
              </div>
            )}

            {/* Tab 4: Admin Settings & Credential Management */}
            {(role === "SUPER_ADMIN" || role === "INTERNAL_OPS") && (
              <div className={activeTab === "settings" ? "block" : "hidden"}>
                <AdminSettingsPanel
                  onCredentialsChanged={refreshCredentials}
                  campaigns={campaigns}
                  deliverables={deliverables}
                  onSyncTriggered={loadData}
                />
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/90 py-6 text-center text-xs text-slate-500 bg-white/60">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Xcelerate Media" className="h-5 w-auto" />
            <span className="font-semibold text-slate-600">&copy; 2026 Xcelerate Media. All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-500 text-[11px] font-semibold">
            <span>Central Database</span>
            <span>•</span>
            <span>Google Sheets Bi-directional Sync</span>
            <span>•</span>
            <span className="text-emerald-600">Zero Data Leak Guarantee</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
