"use client";

import React, { useState, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  ShieldCheck, 
  Users, 
  Building2, 
  ArrowUpRight,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Megaphone,
  Layers,
  Globe,
  MapPin,
  Table,
  Eye,
  BarChart3,
  ChevronRight,
  Video,
  Award,
  Zap,
  Check
} from "lucide-react";
import { CampaignSummary, CreatorDeliverableBrandView, CreatorDeliverableInternal } from "@/lib/types";

interface AgencyFinancialsViewProps {
  campaigns: CampaignSummary[];
  deliverables?: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  onSelectCampaign?: (campaignId: string) => void;
}

type SubTab = "overview" | "campaigns" | "categories" | "niches" | "languages" | "locations" | "matrix";
type StatusFilter = "all" | "completed" | "pending";

export const AgencyFinancialsView: React.FC<AgencyFinancialsViewProps> = React.memo(({
  campaigns,
  deliverables = [],
  onSelectCampaign,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("campaigns");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const formatCurrency = (val: number) => "₹" + val.toLocaleString("en-IN");

  const formatLakhs = (val: number) => {
    if (!val || val === 0) return "₹0";
    if (val >= 10_000_000) {
      return "₹" + (val / 10_000_000).toFixed(1) + "Cr";
    }
    if (val >= 100_000) {
      return "₹" + (val / 100_000).toFixed(1) + "L";
    }
    if (val >= 1_000) {
      return "₹" + (val / 1_000).toFixed(1) + "K";
    }
    return "₹" + val.toLocaleString("en-IN");
  };

  const formatViews = (val: number) => {
    if (!val || val === 0) return "0";
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
    if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
    return val.toLocaleString("en-IN");
  };

  // Helper to map clean XM-style display ID
  const getDisplayId = (id: string, idx: number) => {
    if (id.startsWith("XM")) return id;
    const cleanNum = Math.abs(id.split("").reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0) % 90000 + 10000);
    return `XM0${cleanNum.toString().slice(-4)}`;
  };

  // Pre-index deliverables by campaign identifier for ultra-fast aggregation
  const deliverablesByCampaign = useMemo(() => {
    const map = new Map<string, (CreatorDeliverableBrandView | CreatorDeliverableInternal)[]>();
    for (const d of deliverables) {
      if (d.campaign_id) {
        const arr = map.get(d.campaign_id) || [];
        arr.push(d);
        map.set(d.campaign_id, arr);
      }
      if (d.campaign_name) {
        const key = d.campaign_name.trim().toLowerCase();
        const arr = map.get(key) || [];
        arr.push(d);
        map.set(key, arr);
      }
    }
    return map;
  }, [deliverables]);

  // Comprehensive Campaign Cards Model (with derived real deliverables data)
  const campaignCards = useMemo(() => {
    return campaigns.map((c, idx) => {
      // Find matching deliverables
      const matched = deliverablesByCampaign.get(c.id) || 
                      deliverablesByCampaign.get((c.campaign_name || "").trim().toLowerCase()) || 
                      deliverablesByCampaign.get((c.org_name || "").trim().toLowerCase()) || [];

      // Filter active non-dropped deliverables
      const isStatusDrop = (val: any) => {
        if (!val) return false;
        const s = String(val).trim().toLowerCase();
        return s === "drop" || s === "dropped" || s === "cancelled" || s === "cancel";
      };

      const activeDeliverables = matched.filter(d => 
        !isStatusDrop(d.execution_status) && 
        !isStatusDrop(d.script_status) && 
        !isStatusDrop(d.first_draft_status) && 
        !isStatusDrop(d.final_video_status)
      );

      const executions = activeDeliverables.length > 0 
        ? activeDeliverables.length 
        : (c.deliverables_count || 1);

      // Count completed
      const completedCount = activeDeliverables.filter(d => 
        d.execution_status === "Completed" || Boolean(d.live_link)
      ).length;

      // Pending count
      const isCardCompleted = c.status === "Completed" || (completedCount >= executions && executions > 0);
      const pendingCount = isCardCompleted ? 0 : Math.max(0, executions - completedCount);
      const progressPct = executions > 0 ? Math.round((completedCount / executions) * 100) : 0;

      // Commercial budget
      const revenue = activeDeliverables.reduce((acc, d) => acc + (d.brand_cost || 0), 0);

      // Views
      const totalViews = activeDeliverables.reduce((acc, d) => acc + (d.total_views || 0), 0) || (c.total_views || 0);

      // Distinct creator tiers
      const tiersSet = new Set<string>();
      activeDeliverables.forEach(d => {
        if (d.category && d.category !== "Unspecified") {
          tiersSet.add(d.category);
        }
      });
      const tiers = Array.from(tiersSet);
      if (tiers.length === 0) tiers.push("Nano", "Micro");

      // Execution Owner / POC
      const owner = (activeDeliverables[0] as CreatorDeliverableInternal)?.execution_owner 
        || (c.execution_owners && c.execution_owners.length > 0 ? c.execution_owners[0] : null)
        || c.xcelerate_poc 
        || "Riya";

      return {
        id: c.id,
        displayId: getDisplayId(c.id, idx),
        campaign_name: c.campaign_name || c.org_name,
        org_name: c.org_name,
        campaign_month: c.campaign_month,
        client_type: c.client_type,
        owner,
        isCompleted: isCardCompleted,
        pendingCount,
        executions,
        completedCount,
        progressPct,
        revenue,
        totalViews,
        tiers,
        paymentCycle: c.brand_payment_cycle || "Net 30",
        rawCampaign: c
      };
    });
  }, [campaigns, deliverablesByCampaign]);

  // Counts for filter pills
  const totalCampaignsCount = campaignCards.length;
  const completedCampaignsCount = useMemo(() => campaignCards.filter(c => c.isCompleted).length, [campaignCards]);
  const pendingCampaignsCount = totalCampaignsCount - completedCampaignsCount;

  // Filtered Cards based on status and search query
  const filteredCampaignCards = useMemo(() => {
    return campaignCards.filter((card) => {
      // Status filter
      if (statusFilter === "completed" && !card.isCompleted) return false;
      if (statusFilter === "pending" && card.isCompleted) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = card.campaign_name.toLowerCase().includes(q);
        const matchesOrg = card.org_name.toLowerCase().includes(q);
        const matchesOwner = card.owner.toLowerCase().includes(q);
        const matchesId = card.displayId.toLowerCase().includes(q) || card.id.toLowerCase().includes(q);
        const matchesMonth = (card.campaign_month || "").toLowerCase().includes(q);
        if (!matchesName && !matchesOrg && !matchesOwner && !matchesId && !matchesMonth) return false;
      }

      return true;
    });
  }, [campaignCards, statusFilter, searchQuery]);

  // Aggregated Category-wise breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; views: number; budget: number; campaigns: Set<string> }>();
    for (const d of deliverables) {
      const cat = d.category || "General";
      const existing = map.get(cat) || { count: 0, views: 0, budget: 0, campaigns: new Set<string>() };
      existing.count += 1;
      existing.views += (d.total_views || 0);
      existing.budget += (d.brand_cost || 0);
      if (d.campaign_name) existing.campaigns.add(d.campaign_name);
      map.set(cat, existing);
    }
    return Array.from(map.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      views: stats.views,
      budget: stats.budget,
      campaignsCount: stats.campaigns.size,
    })).sort((a, b) => b.count - a.count);
  }, [deliverables]);

  // Aggregated Niche-wise breakdown
  const nicheBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; views: number; budget: number; campaigns: Set<string> }>();
    for (const d of deliverables) {
      const niche = (d.niche && d.niche.trim()) ? d.niche.trim() : "Lifestyle & General";
      const existing = map.get(niche) || { count: 0, views: 0, budget: 0, campaigns: new Set<string>() };
      existing.count += 1;
      existing.views += (d.total_views || 0);
      existing.budget += (d.brand_cost || 0);
      if (d.campaign_name) existing.campaigns.add(d.campaign_name);
      map.set(niche, existing);
    }
    return Array.from(map.entries()).map(([niche, stats]) => ({
      niche,
      count: stats.count,
      views: stats.views,
      budget: stats.budget,
      campaignsCount: stats.campaigns.size,
    })).sort((a, b) => b.count - a.count);
  }, [deliverables]);

  // Aggregated Language-wise breakdown
  const languageBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; views: number; budget: number }>();
    for (const d of deliverables) {
      const lang = (d.language && d.language.trim()) ? d.language.trim() : "Hindi / English";
      const existing = map.get(lang) || { count: 0, views: 0, budget: 0 };
      existing.count += 1;
      existing.views += (d.total_views || 0);
      existing.budget += (d.brand_cost || 0);
      map.set(lang, existing);
    }
    return Array.from(map.entries()).map(([language, stats]) => ({
      language,
      count: stats.count,
      views: stats.views,
      budget: stats.budget,
    })).sort((a, b) => b.count - a.count);
  }, [deliverables]);

  // Aggregated City/State breakdown
  const locationBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; views: number; budget: number }>();
    for (const d of deliverables) {
      const loc = (d.city && d.city.trim() && d.city !== "Pan-India") ? d.city.trim() : (d.state && d.state.trim() ? d.state.trim() : "Pan-India Hub");
      const existing = map.get(loc) || { count: 0, views: 0, budget: 0 };
      existing.count += 1;
      existing.views += (d.total_views || 0);
      existing.budget += (d.brand_cost || 0);
      map.set(loc, existing);
    }
    return Array.from(map.entries()).map(([location, stats]) => ({
      location,
      count: stats.count,
      views: stats.views,
      budget: stats.budget,
    })).sort((a, b) => b.count - a.count);
  }, [deliverables]);

  // Total summary rollups
  const totalExecutions = useMemo(() => deliverables.length || campaignCards.reduce((acc, c) => acc + c.executions, 0), [deliverables, campaignCards]);
  const totalRevenue = useMemo(() => campaignCards.reduce((acc, c) => acc + c.revenue, 0), [campaignCards]);
  const totalAggregatedViews = useMemo(() => campaignCards.reduce((acc, c) => acc + c.totalViews, 0), [campaignCards]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white border border-blue-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-[#0052FF]" />
            <span>Xcelerate Pulse Agency ERP: Commercials &amp; Operations Intelligence</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Internal Operations: Full campaign profitability, creator payouts, execution velocity, and brand presentations.
          </p>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-[#0052FF] border border-blue-200 font-extrabold flex items-center space-x-1.5 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0052FF]" />
          <span>Restricted Leadership Access</span>
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP SUB-NAVIGATION TABS (Exact match to reference design) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto no-scrollbar py-0.5">
        <div className="inline-flex items-center p-1 sm:p-1.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold shadow-xs min-w-max gap-1">
          
          {/* Tab 1: Overview */}
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "overview"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </button>

          {/* Tab 2: Campaign-Wise (Hero Tab) */}
          <button
            onClick={() => setActiveSubTab("campaigns")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "campaigns"
                ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Campaign-Wise</span>
            <span className={`px-2 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              activeSubTab === "campaigns" ? "bg-white text-[#0052FF]" : "bg-slate-100 text-slate-700"
            }`}>
              {totalCampaignsCount}
            </span>
          </button>

          {/* Tab 3: Category-Wise */}
          <button
            onClick={() => setActiveSubTab("categories")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "categories"
                ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Category-Wise</span>
          </button>

          {/* Tab 4: Niche-Wise */}
          <button
            onClick={() => setActiveSubTab("niches")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "niches"
                ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Niche-Wise</span>
            <span className={`px-2 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              activeSubTab === "niches" ? "bg-white text-[#0052FF]" : "bg-slate-100 text-slate-700"
            }`}>
              {nicheBreakdown.length || 40}
            </span>
          </button>

          {/* Tab 5: Language-Wise */}
          <button
            onClick={() => setActiveSubTab("languages")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "languages"
                ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Language-Wise</span>
          </button>

          {/* Tab 6: State / City */}
          <button
            onClick={() => setActiveSubTab("locations")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "locations"
                ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>State / City</span>
          </button>

          {/* Tab 7: All Executions Matrix */}
          <button
            onClick={() => setActiveSubTab("matrix")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0 ${
              activeSubTab === "matrix"
                ? "bg-indigo-700 text-white shadow-md shadow-indigo-700/25"
                : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50"
            }`}
          >
            <Table className="w-4 h-4 shrink-0" />
            <span>All Executions Matrix</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 1. OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Total Active Briefs</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">{totalCampaignsCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">{completedCampaignsCount} completed • {pendingCampaignsCount} in flight</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Total Executions</span>
              <div className="text-2xl font-black text-[#0052FF] tracking-tight mt-1">{totalExecutions}</div>
              <div className="text-[11px] text-slate-500 mt-1">Managed deliverables</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Managed Budget</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">{formatLakhs(totalRevenue)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Client commercials</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Total Views Logged</span>
              <div className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{formatViews(totalAggregatedViews)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Audience impressions</div>
            </div>
          </div>

          {/* Execution Velocity & Readiness Funnel */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#0052FF]" />
              <span>Agency Execution Pipeline Velocity</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">1. Scripting Stage</span>
                <span className="text-lg font-black text-[#0052FF] mt-1 block">
                  {deliverables.filter(d => d.script_status === "Approved").length} Approved
                </span>
                <span className="text-[11px] text-slate-500">of {deliverables.length} briefs</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">2. First Drafts</span>
                <span className="text-lg font-black text-purple-700 mt-1 block">
                  {deliverables.filter(d => d.first_draft_status === "Approved").length} Cleared
                </span>
                <span className="text-[11px] text-slate-500">Quality checked</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">3. Final Videos</span>
                <span className="text-lg font-black text-amber-700 mt-1 block">
                  {deliverables.filter(d => d.final_video_status === "Approved").length} Ready
                </span>
                <span className="text-[11px] text-slate-500">Client signed off</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">4. Live Content</span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">
                  {deliverables.filter(d => Boolean(d.live_link)).length} Live Reels
                </span>
                <span className="text-[11px] text-slate-500">Publishing complete</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 2. CAMPAIGN-WISE (Exact Visual Card Grid from Reference) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "campaigns" && (
        <div className="space-y-5">
          {/* Section Header & Interactive Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Campaign &amp; Brief Aggregated Performance
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Analysis aggregated by individual campaign brief with deliverables, execution progress, and creator teams.
              </p>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Pills */}
              <div className="inline-flex items-center p-1 rounded-xl bg-white border border-slate-200 text-xs font-bold shadow-2xs">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    statusFilter === "all"
                      ? "bg-[#0052FF] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({totalCampaignsCount})
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center space-x-1 ${
                    statusFilter === "completed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  <span>✓</span>
                  <span>Completed ({completedCampaignsCount})</span>
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center space-x-1 ${
                    statusFilter === "pending"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-amber-700"
                  }`}
                >
                  <span>⏳</span>
                  <span>In Progress ({pendingCampaignsCount})</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search briefs, owners..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid (3 columns desktop, exactly matching screenshot) */}
          {filteredCampaignCards.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No campaigns match your filter or search</p>
              <p className="text-xs text-slate-400">Try switching filter tabs or clearing your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaignCards.map((card) => (
                <div 
                  key={card.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all space-y-3.5 flex flex-col justify-between"
                >
                  {/* Top Meta Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                          {card.displayId}
                        </span>
                        {card.isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center space-x-1">
                            <span>✓</span>
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center space-x-1">
                            <span>⏳</span>
                            <span>{card.pendingCount} Pending</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectCampaign?.(card.id)}
                          className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0052FF] hover:bg-blue-100 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <span>{card.executions} Creators</span>
                          <span>↗</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectCampaign?.(card.id)}
                        className="px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs shrink-0"
                      >
                        Filter
                      </button>
                    </div>

                    {/* Campaign Title & Owner */}
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight leading-snug truncate" title={card.campaign_name}>
                        {card.campaign_name}
                      </h4>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Owner: <span className="font-semibold text-slate-700">{card.owner}</span>
                      </div>
                    </div>

                    {/* 3-Column Metrics Strip (STRICTLY NO MARGIN) */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Executions</span>
                        <span className="text-sm font-black text-slate-900 mt-0.5 block">{card.executions}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revenue</span>
                        <span className="text-sm font-black text-slate-900 mt-0.5 block">{formatLakhs(card.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Rate</span>
                        <span className="text-sm font-black text-emerald-600 mt-0.5 block">{card.progressPct}%</span>
                      </div>
                    </div>

                    {/* Progress Bar Strip */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${card.isCompleted ? "text-emerald-700" : "text-slate-600"}`}>
                          {card.isCompleted ? "All Executions Completed" : `${card.pendingCount} Executions Pending`}
                        </span>
                        <span className="font-bold text-slate-700 font-mono">
                          {card.progressPct}% ({card.completedCount}/{card.executions})
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            card.isCompleted 
                              ? "bg-emerald-500" 
                              : "bg-gradient-to-r from-[#0052FF] to-[#00C2FF]"
                          }`}
                          style={{ width: `${card.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
                    <button
                      type="button"
                      onClick={() => onSelectCampaign?.(card.id)}
                      className="text-xs font-bold text-[#0052FF] hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <span>View {card.executions} Creators</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {card.tiers.slice(0, 3).map((tier, tIdx) => (
                        <span 
                          key={tIdx} 
                          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] uppercase tracking-wider border border-slate-200/60"
                        >
                          {tier}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 3. CATEGORY-WISE */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "categories" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-black text-slate-900 tracking-tight">Creator Tier &amp; Category Distribution</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Breakdown of talent rosters across Nano, Micro, Macro, and Mega tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-[#0052FF] border border-blue-200">
                    {cat.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{cat.campaignsCount} Campaigns</span>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{cat.count} Creators</div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Views: <strong className="text-slate-900 font-bold">{formatViews(cat.views)}</strong></span>
                  <span>Spend: <strong className="text-slate-900 font-bold">{formatLakhs(cat.budget)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 4. NICHE-WISE */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "niches" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-black text-slate-900 tracking-tight">Niche &amp; Domain Expertise</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Creator specialization across Lifestyle, Fashion, Tech, Fitness, Beauty, and Finance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {nicheBreakdown.map((item) => (
              <div key={item.niche} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 truncate max-w-[150px]" title={item.niche}>
                    {item.niche}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {item.count} Creators
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <span>{formatViews(item.views)} Views</span>
                  <span>{formatLakhs(item.budget)} Commercial</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 5. LANGUAGE-WISE */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "languages" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-black text-slate-900 tracking-tight">Vernacular &amp; Linguistic Reach</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multilingual creator campaigns delivering localized regional resonance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {languageBreakdown.map((item) => (
              <div key={item.language} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">{item.language}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0052FF]">
                    {item.count} Creators
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <span>{formatViews(item.views)} Impressions</span>
                  <span>{formatLakhs(item.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 6. STATE / CITY */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "locations" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-black text-slate-900 tracking-tight">Geographic Footprint across India</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tier 1, Tier 2, and Tier 3 city penetration across major creator hubs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {locationBreakdown.map((item) => (
              <div key={item.location} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">{item.location}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                    {item.count} Creators
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <span>{formatViews(item.views)} Views</span>
                  <span>{formatLakhs(item.budget)} Commercial</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: 7. ALL EXECUTIONS MATRIX */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "matrix" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#0052FF]" />
                <span>Active Campaigns Portfolio &amp; P&amp;L Health</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Showing {filteredCampaignCards.length} of {campaigns.length} campaigns
              </p>
            </div>

            {/* Quick Table Search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaign, brand, or month..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]"
              />
            </div>
          </div>

          {/* Dedicated Internal Scrollable Table Container */}
          <div className="max-h-[460px] overflow-y-auto overflow-x-auto custom-modal-scroll rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300/80 text-slate-700 font-bold uppercase text-[11px] shadow-2xs">
                <tr>
                  <th className="py-3 px-3.5">Campaign Name &amp; Client</th>
                  <th className="py-3 px-3.5">Month</th>
                  <th className="py-3 px-3.5">Creators</th>
                  <th className="py-3 px-3.5">Aggregated Views</th>
                  <th className="py-3 px-3.5">Payment Terms</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaignCards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium text-xs">
                      No matching campaigns found
                    </td>
                  </tr>
                ) : (
                  filteredCampaignCards.map((c) => {
                    const hasCustomTitle =
                      c.campaign_name &&
                      c.campaign_name.trim().toLowerCase() !== c.org_name.trim().toLowerCase();

                    return (
                      <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-extrabold text-slate-900 text-xs truncate max-w-sm">
                            {hasCustomTitle ? c.campaign_name : c.org_name}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[11px] text-[#0052FF] font-bold">
                              {c.org_name}
                            </span>
                            {c.client_type && c.client_type.trim() && (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200/60 uppercase">
                                {c.client_type}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {c.displayId}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-semibold">
                          {c.campaign_month || "—"}
                        </td>
                        <td className="py-3 px-3.5 font-extrabold text-slate-900">
                          {c.executions} Creators
                        </td>
                        <td className="py-3 px-3.5 font-extrabold text-[#0052FF]">
                          {(c.totalViews || 0).toLocaleString()} Views
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-medium">
                          {c.paymentCycle}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {c.isCompleted ? "Completed" : "In Progress"}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectCampaign?.(c.id)}
                            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0052FF] text-[11px] font-bold border border-blue-200 transition-all cursor-pointer shadow-2xs"
                          >
                            Inspect ↗
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
});
