"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Building2, 
  ArrowUpRight,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Globe,
  MapPin,
  Table,
  BarChart3,
  Video,
  Zap,
  Users,
  DollarSign,
  TrendingUp,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  Check,
  Calendar,
  CreditCard,
  FileText,
  ChevronDown,
  SlidersHorizontal
} from "lucide-react";
import { CampaignSummary, CreatorDeliverableBrandView, CreatorDeliverableInternal } from "@/lib/types";

interface AllCampaignsPortfolioViewProps {
  campaigns: CampaignSummary[];
  deliverables?: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  onSelectCampaign: (campaignId: string) => void;
  onOpenPipeline?: () => void;
}

type DisplayViewMode = "cards" | "matrix";
type StatusFilter = "all" | "completed" | "pending";

export const AllCampaignsPortfolioView: React.FC<AllCampaignsPortfolioViewProps> = React.memo(({
  campaigns,
  deliverables = [],
  onSelectCampaign,
  onOpenPipeline,
}) => {
  const [viewMode, setViewMode] = useState<DisplayViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<"brands" | "owners" | "months">("brands");
  const [sectionSearchQuery, setSectionSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignForModal, setSelectedCampaignForModal] = useState<any | null>(null);

  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Pre-index deliverables by campaign identifier for ultra-fast lookup
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
      if (d.org_name) {
        const orgKey = d.org_name.trim().toLowerCase();
        const arr = map.get(orgKey) || [];
        arr.push(d);
        map.set(orgKey, arr);
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

      // Views & Reach
      const totalViews = activeDeliverables.reduce((acc, d) => acc + (d.total_views || 0), 0) || (c.total_views || 0);
      const totalReach = activeDeliverables.reduce((acc, d) => acc + (d.account_reach || 0), 0) || (c.total_reach || 0);

      // Average Engagement Rate
      const erSum = activeDeliverables.reduce((acc, d) => acc + (d.engagement_rate || 0), 0);
      const avgEr = activeDeliverables.length > 0 ? (erSum / activeDeliverables.length).toFixed(1) : (c.avg_er ? c.avg_er.toFixed(1) : "4.8");

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
        totalReach,
        avgEr,
        tiers,
        paymentCycle: c.brand_payment_cycle || "Net 30",
        matchedDeliverables: activeDeliverables,
        rawCampaign: c
      };
    });
  }, [campaigns, deliverablesByCampaign]);

  // Unique brands list for filter
  const brandList = useMemo(() => {
    const counts = new Map<string, number>();
    campaignCards.forEach((c) => {
      const org = (c.org_name || "").trim();
      if (org && org !== "Unassigned" && org !== "Default Brand" && org !== "General") {
        counts.set(org, (counts.get(org) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [campaignCards]);

  // Unique execution leads/owners list for filter
  const ownerList = useMemo(() => {
    const counts = new Map<string, number>();
    campaignCards.forEach((c) => {
      const owner = (c.owner || "").trim();
      if (owner) {
        counts.set(owner, (counts.get(owner) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [campaignCards]);

  // Unique campaign months list for filter
  const monthList = useMemo(() => {
    const counts = new Map<string, number>();
    campaignCards.forEach((c) => {
      const month = (c.campaign_month || "").trim();
      if (month) {
        counts.set(month, (counts.get(month) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [campaignCards]);

  // Active section items filtered by small search inside dropdown
  const currentSectionItems = useMemo(() => {
    const q = sectionSearchQuery.toLowerCase().trim();
    let items: { name: string; count: number }[] = [];
    if (activeFilterSection === "brands") items = brandList;
    else if (activeFilterSection === "owners") items = ownerList;
    else if (activeFilterSection === "months") items = monthList;

    if (!q) return items;
    return items.filter(item => item.name.toLowerCase().includes(q));
  }, [activeFilterSection, brandList, ownerList, monthList, sectionSearchQuery]);

  // Counts for filter pills
  const totalCampaignsCount = campaignCards.length;
  const completedCampaignsCount = useMemo(() => campaignCards.filter(c => c.isCompleted).length, [campaignCards]);
  const pendingCampaignsCount = totalCampaignsCount - completedCampaignsCount;

  // Toggle selection functions for multi-select
  const handleToggleBrand = (brandName: string) => {
    setSelectedBrands(prev => prev.includes(brandName) ? prev.filter(b => b !== brandName) : [...prev, brandName]);
  };

  const handleToggleOwner = (ownerName: string) => {
    setSelectedOwners(prev => prev.includes(ownerName) ? prev.filter(o => o !== ownerName) : [...prev, ownerName]);
  };

  const handleToggleMonth = (monthName: string) => {
    setSelectedMonths(prev => prev.includes(monthName) ? prev.filter(m => m !== monthName) : [...prev, monthName]);
  };

  const handleClearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedOwners([]);
    setSelectedMonths([]);
    setSectionSearchQuery("");
  };

  const totalActiveFilterCount = selectedBrands.length + selectedOwners.length + selectedMonths.length;

  // Filtered Cards based on status, multiple brands, owners, months, and search query
  const filteredCampaignCards = useMemo(() => {
    return campaignCards.filter((card) => {
      // Multiple Brands filter
      if (selectedBrands.length > 0 && !selectedBrands.includes(card.org_name)) {
        return false;
      }

      // Multiple Owners filter
      if (selectedOwners.length > 0 && !selectedOwners.includes(card.owner)) {
        return false;
      }

      // Multiple Months filter
      if (selectedMonths.length > 0 && (!card.campaign_month || !selectedMonths.includes(card.campaign_month))) {
        return false;
      }

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
  }, [campaignCards, selectedBrands, selectedOwners, selectedMonths, statusFilter, searchQuery]);

  // Total summary rollups
  const totalExecutions = useMemo(() => deliverables.length || campaignCards.reduce((acc, c) => acc + c.executions, 0), [deliverables, campaignCards]);
  const totalRevenue = useMemo(() => campaignCards.reduce((acc, c) => acc + c.revenue, 0), [campaignCards]);
  const totalAggregatedViews = useMemo(() => campaignCards.reduce((acc, c) => acc + c.totalViews, 0), [campaignCards]);

  return (
    <div className="space-y-4 sm:space-y-5">
      
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SHOWCASE HEADER & REAL-TIME PORTFOLIO KPIS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="live-indicator-dot shrink-0" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
                  Xcelerate Global Execution Portfolio
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                All Campaigns &amp; Briefs Intelligence
              </h2>
              <p className="text-xs text-slate-300 font-medium max-w-2xl">
                Unified single-view breakdown across all client briefs, execution velocity, creator rosters, and live delivery stats.
              </p>
            </div>

            {/* Quick View Mode Switcher */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold self-start sm:self-auto shrink-0 shadow-lg">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Visual Cards</span>
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  viewMode === "matrix"
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Master Table</span>
              </button>
            </div>
          </div>

          {/* Aggregated KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-3 border-t border-white/10 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Briefs</span>
              <div className="text-lg font-black text-white mt-0.5">{totalCampaignsCount} Active</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                {completedCampaignsCount} completed • {pendingCampaignsCount} in workflow
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Managed Creators</span>
              <div className="text-lg font-black text-blue-300 mt-0.5">{totalExecutions} Creators</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Multi-tier talent rosters
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Aggregated Views</span>
              <div className="text-lg font-black text-emerald-400 mt-0.5">{formatViews(totalAggregatedViews)}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Reel impressions
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Managed Budget</span>
              <div className="text-lg font-black text-white mt-0.5">{formatLakhs(totalRevenue)}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Approved commercials
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Live Delivery Rate</span>
              <div className="text-lg font-black text-cyan-300 mt-0.5">
                {totalCampaignsCount > 0 ? Math.round((completedCampaignsCount / totalCampaignsCount) * 100) : 0}%
              </div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Across all agency briefs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 2. FILTER STRIP & ENHANCED MULTI-SECTION SEARCHABLE DROPDOWN */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs relative z-40 overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Pills & Multi-Section Filter Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 text-xs font-bold shrink-0">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                  statusFilter === "all"
                    ? "bg-[#0052FF] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({totalCampaignsCount})
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex items-center space-x-1 ${
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
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex items-center space-x-1 ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-amber-700"
                }`}
              >
                <span>⏳</span>
                <span>In Progress ({pendingCampaignsCount})</span>
              </button>
            </div>

            {/* Premium Searchable Multi-Section Dropdown Trigger (Anti-clipping, Beautiful UI) */}
            <div className="relative inline-block" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-2xs ${
                  totalActiveFilterCount > 0
                    ? "bg-blue-50 border-[#0052FF] text-[#0052FF]"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0052FF]" />
                <span>
                  {totalActiveFilterCount === 0
                    ? `Filters & Brands (${brandList.length})`
                    : totalActiveFilterCount === 1 && selectedBrands.length === 1
                    ? selectedBrands[0]
                    : `${totalActiveFilterCount} Filters Active`}
                </span>
                {totalActiveFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#0052FF] text-white text-[10px] font-bold flex items-center justify-center">
                    {totalActiveFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Custom Popover Dropdown Panel (Never Clips, Top-Full Positioned with Safe Boundaries) */}
              {isFilterDropdownOpen && (
                <div 
                  className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-w-[95vw] rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 p-3.5 space-y-3"
                  style={{ minWidth: "290px" }}
                >
                  {/* Dropdown Header with Reset */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center space-x-1.5 font-black text-slate-900">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0052FF]" />
                      <span>Portfolio Filters</span>
                      {totalActiveFilterCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-[#0052FF] rounded-full">
                          {totalActiveFilterCount} active
                        </span>
                      )}
                    </div>
                    {totalActiveFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Multiple Section Option Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setActiveFilterSection("brands"); setSectionSearchQuery(""); }}
                      className={`py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-1 ${
                        activeFilterSection === "brands"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Brands</span>
                      <span className="text-[10px] text-slate-400">({brandList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveFilterSection("owners"); setSectionSearchQuery(""); }}
                      className={`py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-1 ${
                        activeFilterSection === "owners"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Owners</span>
                      <span className="text-[10px] text-slate-400">({ownerList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveFilterSection("months"); setSectionSearchQuery(""); }}
                      className={`py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-1 ${
                        activeFilterSection === "months"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Months</span>
                      <span className="text-[10px] text-slate-400">({monthList.length})</span>
                    </button>
                  </div>

                  {/* Small Search Option Inside Dropdown */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sectionSearchQuery}
                      onChange={(e) => setSectionSearchQuery(e.target.value)}
                      placeholder={`Search ${activeFilterSection}...`}
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]"
                    />
                    {sectionSearchQuery && (
                      <button
                        onClick={() => setSectionSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Select Helpers for Current Section */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
                    <span>
                      {activeFilterSection === "brands" ? `${selectedBrands.length} brands selected` :
                       activeFilterSection === "owners" ? `${selectedOwners.length} owners selected` :
                       `${selectedMonths.length} months selected`}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeFilterSection === "brands") setSelectedBrands(brandList.map(b => b.name));
                          else if (activeFilterSection === "owners") setSelectedOwners(ownerList.map(o => o.name));
                          else if (activeFilterSection === "months") setSelectedMonths(monthList.map(m => m.name));
                        }}
                        className="text-[#0052FF] hover:underline cursor-pointer font-bold"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeFilterSection === "brands") setSelectedBrands([]);
                          else if (activeFilterSection === "owners") setSelectedOwners([]);
                          else if (activeFilterSection === "months") setSelectedMonths([]);
                        }}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Multi-Select Checkbox List with Dynamic Section Items */}
                  <div className="max-h-52 overflow-y-auto custom-modal-scroll space-y-1 pr-1">
                    {currentSectionItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No matching {activeFilterSection}
                      </div>
                    ) : (
                      currentSectionItems.map((item) => {
                        const isChecked = 
                          activeFilterSection === "brands" ? selectedBrands.includes(item.name) :
                          activeFilterSection === "owners" ? selectedOwners.includes(item.name) :
                          selectedMonths.includes(item.name);

                        const toggleAction = () => {
                          if (activeFilterSection === "brands") handleToggleBrand(item.name);
                          else if (activeFilterSection === "owners") handleToggleOwner(item.name);
                          else handleToggleMonth(item.name);
                        };

                        return (
                          <div
                            key={item.name}
                            onClick={toggleAction}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                              isChecked ? "bg-blue-50 text-[#0052FF] font-bold" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                isChecked ? "bg-[#0052FF] border-[#0052FF] text-white" : "border-slate-300 bg-white"
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate" title={item.name}>{item.name}</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 shrink-0">
                              {item.count}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {totalActiveFilterCount === 0 ? "Showing all briefs" : `${totalActiveFilterCount} filters active`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen(false)}
                      className="px-3 py-1 rounded-lg bg-[#0052FF] text-white text-[11px] font-bold hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns, owners..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {totalActiveFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
            <span className="text-[10.5px] font-bold text-slate-400 mr-1">Active:</span>
            {selectedBrands.map(brand => (
              <span key={brand} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-blue-50 text-[#0052FF] border border-blue-200 text-[10px] font-bold">
                <span>Brand: {brand}</span>
                <button onClick={() => handleToggleBrand(brand)} className="hover:text-blue-800 cursor-pointer p-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {selectedOwners.map(owner => (
              <span key={owner} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                <span>Owner: {owner}</span>
                <button onClick={() => handleToggleOwner(owner)} className="hover:text-indigo-900 cursor-pointer p-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {selectedMonths.map(month => (
              <span key={month} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <span>Month: {month}</span>
                <button onClick={() => handleToggleMonth(month)} className="hover:text-emerald-900 cursor-pointer p-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={handleClearAllFilters}
              className="text-[10.5px] font-bold text-slate-500 hover:text-rose-600 px-1 py-0.5 hover:underline cursor-pointer ml-1"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 3. VISUAL CARDS GRID (COMPACT SIZE, 4 CARDS PER ROW, DEDICATED SCROLLBAR) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {viewMode === "cards" && (
        <div className="space-y-3">
          {filteredCampaignCards.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No campaigns match your filter or search query</p>
              <p className="text-xs text-slate-400">Try switching filter pills, resetting section selections, or clearing search terms.</p>
            </div>
          ) : (
            <>
              {/* Dedicated Scroll Container with Custom Sleek Scrollbar to prevent page elongation */}
              <div 
                className="max-h-[580px] xl:max-h-[640px] overflow-y-auto custom-portfolio-scroll pr-2 space-y-3"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
              >
                {/* 4 Cards Per Row Grid (Compact, High-Density, Perfectly Proportioned) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2.5 sm:gap-3">
                  {filteredCampaignCards.map((card) => (
                    <div 
                      key={card.id}
                      onClick={() => setSelectedCampaignForModal(card)}
                      className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all space-y-2 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center space-x-1 flex-wrap gap-y-1 min-w-0">
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[9px] font-bold border border-slate-200/60 shrink-0">
                              {card.displayId}
                            </span>
                            {card.isCompleted ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-bold flex items-center space-x-0.5 shrink-0">
                                <span>✓</span>
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] font-bold flex items-center space-x-0.5 shrink-0">
                                <span>⏳</span>
                                <span>{card.pendingCount} Pending</span>
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0052FF] text-[8.5px] font-bold shrink-0">
                              {card.executions} Creators ↗
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCampaign(card.id);
                              onOpenPipeline?.();
                            }}
                            className="px-2 py-0.5 rounded-lg border border-slate-200 text-[9.5px] font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0052FF] transition-all cursor-pointer shadow-2xs shrink-0"
                            title="Filter dashboard and open in pipeline"
                          >
                            Filter
                          </button>
                        </div>

                        {/* Campaign Title & Owner */}
                        <div>
                          <h4 className="text-xs sm:text-[13px] font-black text-slate-900 tracking-tight leading-snug group-hover:text-[#0052FF] transition-colors truncate" title={card.campaign_name}>
                            {card.campaign_name}
                          </h4>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center space-x-1 truncate">
                            <span>Owner: <strong className="text-slate-700 font-semibold">{card.owner}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 truncate">{card.campaign_month || "Active"}</span>
                          </div>
                        </div>

                        {/* 3-Column Metrics Strip (STRICTLY NO MARGIN) */}
                        <div className="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-slate-50/90 border border-slate-100 text-center">
                          <div>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">Executions</span>
                            <span className="text-[11.5px] font-black text-slate-900 mt-0.5 block">{card.executions}</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">Budget</span>
                            <span className="text-[11.5px] font-black text-slate-900 mt-0.5 block">{formatLakhs(card.revenue)}</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">Live Rate</span>
                            <span className="text-[11.5px] font-black text-emerald-600 mt-0.5 block">{card.progressPct}%</span>
                          </div>
                        </div>

                        {/* Progress Bar Strip */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9.5px]">
                            <span className={`font-bold truncate max-w-[120px] ${card.isCompleted ? "text-emerald-700" : "text-slate-600"}`}>
                              {card.isCompleted ? "All Completed" : `${card.pendingCount} Pending`}
                            </span>
                            <span className="font-bold text-slate-700 font-mono text-[9.5px]">
                              {card.progressPct}% ({card.completedCount}/{card.executions})
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
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
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-auto">
                        <span className="font-bold text-[#0052FF] group-hover:underline flex items-center space-x-1">
                          <span>View {card.executions} Creators</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </span>

                        <div className="flex items-center space-x-1">
                          {card.tiers.slice(0, 2).map((tier, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold text-[7.5px] uppercase tracking-wider border border-slate-200/60"
                            >
                              {tier}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scroll Container Info Footer */}
              <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-medium px-4 shadow-2xs">
                <span>Showing <strong>{filteredCampaignCards.length}</strong> of {totalCampaignsCount} campaigns</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">Scroll through the cards container above • Click any card for detailed dossier</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 4. MASTER TABLE MATRIX VIEW */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {viewMode === "matrix" && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">Full Campaigns Executive Matrix</h4>
              <p className="text-xs text-slate-500 font-medium">Single-view tabular breakdown of all briefs, delivery stages, and commercials.</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Showing {filteredCampaignCards.length} Campaigns
            </span>
          </div>

          <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-modal-scroll rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Campaign Name &amp; Client</th>
                  <th className="py-3 px-3.5">Month</th>
                  <th className="py-3 px-3.5">Owner / POC</th>
                  <th className="py-3 px-3.5">Creators</th>
                  <th className="py-3 px-3.5">Budget</th>
                  <th className="py-3 px-3.5">Aggregated Views</th>
                  <th className="py-3 px-3.5">Delivery Progress</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaignCards.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCampaignForModal(c)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-extrabold text-slate-900 text-xs truncate max-w-sm">
                        {c.campaign_name}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[11px] text-[#0052FF] font-bold">{c.org_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">• {c.displayId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-semibold">{c.campaign_month || "—"}</td>
                    <td className="py-3 px-3.5 text-slate-700 font-medium">{c.owner}</td>
                    <td className="py-3 px-3.5 font-extrabold text-slate-900">{c.executions}</td>
                    <td className="py-3 px-3.5 font-extrabold text-slate-900">{formatLakhs(c.revenue)}</td>
                    <td className="py-3 px-3.5 font-extrabold text-[#0052FF]">{formatViews(c.totalViews)}</td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${c.isCompleted ? "bg-emerald-500" : "bg-blue-600"}`} 
                            style={{ width: `${c.progressPct}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-700">{c.progressPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        c.isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        {c.isCompleted ? "Completed" : "In Progress"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCampaign(c.id);
                          onOpenPipeline?.();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-[#0052FF] text-[#0052FF] hover:text-white border border-blue-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        Open Pipeline ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 5. SLIDE-OUT CAMPAIGN DOSSIER MODAL / INSPECTOR */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {selectedCampaignForModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedCampaignForModal(null)}
        >
          <div 
            className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-slate-50 to-white">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#0052FF] font-mono text-[10px] font-extrabold">
                    {selectedCampaignForModal.displayId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedCampaignForModal.isCompleted 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}>
                    {selectedCampaignForModal.isCompleted ? "✓ Completed" : "⏳ In Progress"}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• {selectedCampaignForModal.campaign_month || "Active"}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedCampaignForModal.campaign_name}
                </h3>
              </div>

              <button 
                onClick={() => setSelectedCampaignForModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 custom-modal-scroll">
              
              {/* Campaign Quick Facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Brand Client</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{selectedCampaignForModal.org_name}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Execution Lead</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{selectedCampaignForModal.owner}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Campaign Budget</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{formatLakhs(selectedCampaignForModal.revenue)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Payment Terms</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{selectedCampaignForModal.paymentCycle}</span>
                </div>
              </div>

              {/* Progress & Delivery Status */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#0052FF]">Deliverables Execution Funnel</span>
                  <span className="text-slate-700 font-mono">
                    {selectedCampaignForModal.completedCount} of {selectedCampaignForModal.executions} Live ({selectedCampaignForModal.progressPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${selectedCampaignForModal.isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-[#0052FF] to-[#00C2FF]"}`}
                    style={{ width: `${selectedCampaignForModal.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Creator Deliverables Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Creator Roster ({selectedCampaignForModal.matchedDeliverables.length} Creators)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Direct creator delivery status</span>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  {selectedCampaignForModal.matchedDeliverables.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      Deliverables synced from Central Database ({selectedCampaignForModal.executions} Creators registered).
                    </div>
                  ) : (
                    selectedCampaignForModal.matchedDeliverables.map((item: any, i: number) => (
                      <div key={item.id || i} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-extrabold text-slate-900">{item.creator_name}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 font-bold">{item.category || "Creator"}</span>
                            <span>•</span>
                            <span>{item.niche || "General"}</span>
                            {item.followers_count > 0 && (
                              <>
                                <span>•</span>
                                <span>{formatViews(item.followers_count)} Followers</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.execution_status === "Completed" || item.live_link 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {item.execution_status === "Completed" || item.live_link ? "Live ✓" : (item.execution_status || "In Workflow")}
                          </span>

                          {item.live_link && (
                            <a
                              href={item.live_link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg text-[#0052FF] hover:bg-blue-50 transition-colors"
                              title="Watch Live Reel"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
              <span className="text-xs text-slate-500 font-medium">
                Click below to drill down into the creator delivery pipeline.
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectCampaign(selectedCampaignForModal.id);
                  onOpenPipeline?.();
                  setSelectedCampaignForModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Filter &amp; Open in Live Pipeline</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
