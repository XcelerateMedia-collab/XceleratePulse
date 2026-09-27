"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { CampaignSummary } from "@/lib/types";
import { 
  Search, 
  ChevronDown, 
  Check, 
  Building2, 
  Calendar, 
  Users, 
  Layers, 
  X,
  Sparkles,
  Globe
} from "lucide-react";

interface CampaignSelectorProps {
  campaigns: CampaignSummary[];
  selectedCampaignId: string;
  onSelect: (campaignId: string) => void;
  className?: string;
}

export function formatCleanMonth(raw: string | null | undefined): string {
  if (!raw) return "Active Month";
  const s = String(raw).trim();
  if (s.includes("T") || /^\d{4}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  }
  return s;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = React.memo(({
  campaigns,
  selectedCampaignId,
  onSelect,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Total creator deliverables count across all campaigns
  const totalCreators = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + (c.deliverables_count || 0), 0);
  }, [campaigns]);

  // Extract unique brands for filter tabs
  const brandList = useMemo(() => {
    const counts = new Map<string, number>();
    campaigns.forEach((c) => {
      const org = c.org_name || "General";
      counts.set(org, (counts.get(org) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [campaigns]);

  // Filter campaigns by search query and selected brand
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (selectedBrandFilter !== "ALL" && c.org_name !== selectedBrandFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.campaign_name.toLowerCase().includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      const matchOrg = c.org_name.toLowerCase().includes(q);
      const matchMonth = formatCleanMonth(c.campaign_month).toLowerCase().includes(q);
      return matchName || matchId || matchOrg || matchMonth;
    });
  }, [campaigns, searchQuery, selectedBrandFilter]);

  // Close on click outside, Escape, or window scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handleScroll = () => {
      // Auto-close on scroll to prevent any floating/overlapping over the header
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("scroll", handleScroll, { passive: true });

      // Focus search input safely without triggering viewport jump
      setTimeout(() => {
        if (searchInputRef.current) {
          const currentY = window.scrollY;
          searchInputRef.current.focus({ preventScroll: true });
          if (window.scrollY !== currentY) {
            window.scrollTo(0, currentY);
          }
        }
      }, 30);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  const isAllSelected = selectedCampaignId === "ALL";

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Sleek, Compact Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none ${
          isOpen
            ? "bg-blue-50/90 border-[#0052FF] text-[#0052FF] ring-2 ring-blue-500/15"
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
        }`}
        title="Filter by campaign or view all"
      >
        <Layers className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
        <span className="text-[11px] sm:text-xs">
          {isAllSelected ? "All Campaigns" : "Switch Campaign"}
        </span>
        <span className="px-1.5 py-0.2 rounded-md bg-blue-100/80 text-[#0052FF] text-[10px] font-bold">
          {campaigns.length}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#0052FF]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu — mobile viewport-constrained and desktop positioned */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-2xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3.5 top-28 sm:inset-x-auto sm:absolute sm:left-0 sm:top-full mt-1.5 w-auto sm:w-[460px] max-w-none sm:max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 sm:z-30 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100vh-8rem)] flex flex-col">
          
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
                <span className="text-xs font-bold text-slate-900">Select Campaign View</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {campaigns.length} campaigns
              </span>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID (e.g. XM09042), or brand..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Brand Filter Pills */}
            {brandList.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedBrandFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    selectedBrandFilter === "ALL"
                      ? "bg-[#0052FF] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  All ({campaigns.length})
                </button>
                {brandList.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setSelectedBrandFilter(b.name)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                      selectedBrandFilter === b.name
                        ? "bg-[#0052FF] text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    {b.name} ({b.count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campaign List */}
          <div className="max-h-[240px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
            
            {/* 1. ALL CAMPAIGNS OPTION (Always available to see all data) */}
            {(!searchQuery || "all campaigns".includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                onClick={() => {
                  onSelect("ALL");
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  isAllSelected
                    ? "bg-blue-50/90 border border-blue-200 shadow-2xs text-[#0052FF]"
                    : "hover:bg-slate-50 border border-transparent hover:border-slate-200/60 text-slate-900"
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
                    <p className={`text-xs font-bold leading-tight ${
                      isAllSelected ? "text-[#0052FF]" : "text-slate-900"
                    }`}>
                      All Campaigns (Consolidated Overview)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <span className="font-mono font-bold px-1 py-0.2 rounded bg-blue-100/70 text-[#0052FF]">
                      ALL
                    </span>
                    <span>{campaigns.length} campaigns</span>
                    <span>•</span>
                    <span>{totalCreators} creators across all sheets</span>
                  </div>
                </div>

                {isAllSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#0052FF] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                )}
              </button>
            )}

            {filteredCampaigns.length > 0 && (
              <div className="border-t border-slate-100 my-1"></div>
            )}

            {/* Individual Campaigns */}
            {filteredCampaigns.length === 0 ? (
              <div className="py-6 text-center space-y-1.5">
                <Search className="w-5 h-5 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No matching campaigns</p>
                <p className="text-[11px] text-slate-400">
                  Try searching a different name, ID, or brand.
                </p>
              </div>
            ) : (
              filteredCampaigns.map((c) => {
                const isSelected = c.id === selectedCampaignId;
                const cleanMonth = formatCleanMonth(c.campaign_month);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 shadow-2xs text-[#0052FF]"
                        : "hover:bg-slate-50 border border-transparent hover:border-slate-200/60 text-slate-900"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      {/* Campaign Title */}
                      <p className={`text-xs font-bold leading-snug truncate ${
                        isSelected ? "text-[#0052FF]" : "text-slate-900"
                      }`}>
                        {c.campaign_name}
                      </p>

                      {/* Metadata Badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                          {c.id}
                        </span>

                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.org_name}</span>
                        </span>

                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{cleanMonth}</span>
                        </span>

                        {c.deliverables_count !== undefined && c.deliverables_count > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                            <Users className="w-2.5 h-2.5" />
                            <span>{c.deliverables_count} creators</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#0052FF] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="p-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between px-3 text-[10px] text-slate-500 font-medium">
            <span>Showing {filteredCampaigns.length} of {campaigns.length} campaigns</span>
            <span className="font-mono text-slate-400">Esc to close</span>
          </div>

        </div>
      </>
    )}
    </div>
  );
});
