"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CampaignSummary } from "@/lib/types";
import { 
  Search, 
  ChevronDown, 
  Check, 
  Layers, 
  X,
  Sparkles,
  Globe,
  CheckCheck
} from "lucide-react";

export interface CampaignSelectorProps {
  campaigns: CampaignSummary[];
  selectedCampaignIds?: string[];
  onSelectCampaigns?: (campaignIds: string[]) => void;
  // Backward compatibility with single-select callers
  selectedCampaignId?: string;
  onSelect?: (campaignId: string) => void;
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
  selectedCampaignIds,
  onSelectCampaigns,
  selectedCampaignId,
  onSelect,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize selected IDs
  const activeSelectedIds = useMemo(() => {
    if (selectedCampaignIds && selectedCampaignIds.length > 0) {
      return selectedCampaignIds;
    }
    if (selectedCampaignId) {
      return [selectedCampaignId];
    }
    return ["ALL"];
  }, [selectedCampaignIds, selectedCampaignId]);

  const isAllSelected = useMemo(() => {
    if (activeSelectedIds.length === 0) return true;
    if (activeSelectedIds.includes("ALL")) return true;
    if (campaigns.length > 0 && activeSelectedIds.length === campaigns.length) return true;
    return false;
  }, [activeSelectedIds, campaigns.length]);

  const selectedSet = useMemo(() => {
    return new Set(activeSelectedIds);
  }, [activeSelectedIds]);

  // Total creator deliverables count across all campaigns
  const totalCreators = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + (c.deliverables_count || 0), 0);
  }, [campaigns]);

  // Extract unique brands for filter tabs
  const brandList = useMemo(() => {
    const counts = new Map<string, number>();
    campaigns.forEach((c) => {
      const org = (c.org_name || "").trim();
      if (org && org !== "Unassigned" && org !== "Default Brand" && org !== "General") {
        counts.set(org, (counts.get(org) || 0) + 1);
      }
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
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("scroll", handleScroll, { passive: true });

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

  // Notification helper: invoke onSelectCampaigns if provided; only fall back to onSelect if onSelectCampaigns is NOT provided
  const notifyChange = useCallback((newIds: string[]) => {
    const normalized = newIds.length === 0 || newIds.includes("ALL") ? ["ALL"] : newIds;
    if (onSelectCampaigns) {
      onSelectCampaigns(normalized);
    } else if (onSelect) {
      onSelect(normalized[0] || "ALL");
    }
  }, [onSelectCampaigns, onSelect]);

  // Toggle "All Campaigns" mode
  const handleToggleAll = useCallback(() => {
    notifyChange(["ALL"]);
  }, [notifyChange]);

  // Toggle individual campaign inclusion
  const handleToggleCampaign = useCallback((campaignId: string) => {
    if (campaignId === "ALL") {
      notifyChange(["ALL"]);
      return;
    }

    if (isAllSelected) {
      // Transitioning from ALL to a single specific campaign
      notifyChange([campaignId]);
    } else {
      if (selectedSet.has(campaignId)) {
        const next = activeSelectedIds.filter((id) => id !== campaignId && id !== "ALL");
        if (next.length === 0) {
          notifyChange(["ALL"]);
        } else {
          notifyChange(next);
        }
      } else {
        const next = [...activeSelectedIds.filter((id) => id !== "ALL"), campaignId];
        if (next.length >= campaigns.length) {
          notifyChange(["ALL"]);
        } else {
          notifyChange(next);
        }
      }
    }
  }, [isAllSelected, selectedSet, activeSelectedIds, campaigns.length, notifyChange]);

  // Check if all visible campaigns are already selected
  const allVisibleSelected = useMemo(() => {
    if (filteredCampaigns.length === 0) return false;
    if (isAllSelected) return false;
    return filteredCampaigns.every((c) => selectedSet.has(c.id));
  }, [filteredCampaigns, isAllSelected, selectedSet]);

  // Toggle visible campaigns selection
  const handleToggleVisible = useCallback(() => {
    if (filteredCampaigns.length === 0) return;

    if (allVisibleSelected) {
      const visibleSet = new Set(filteredCampaigns.map((c) => c.id));
      const next = activeSelectedIds.filter((id) => !visibleSet.has(id) && id !== "ALL");
      if (next.length === 0) {
        notifyChange(["ALL"]);
      } else {
        notifyChange(next);
      }
    } else {
      const visibleIds = filteredCampaigns.map((c) => c.id);
      if (visibleIds.length === campaigns.length) {
        notifyChange(["ALL"]);
      } else {
        const nextSet = new Set(isAllSelected ? [] : activeSelectedIds.filter((id) => id !== "ALL"));
        visibleIds.forEach((id) => nextSet.add(id));
        const next = Array.from(nextSet);
        if (next.length >= campaigns.length) {
          notifyChange(["ALL"]);
        } else {
          notifyChange(next);
        }
      }
    }
  }, [filteredCampaigns, allVisibleSelected, campaigns.length, isAllSelected, activeSelectedIds, notifyChange]);

  // Reset filter back to ALL
  const handleResetToAll = useCallback(() => {
    notifyChange(["ALL"]);
  }, [notifyChange]);

  // Compute compact trigger button label
  const triggerLabel = useMemo(() => {
    if (isAllSelected) {
      return "All Campaigns";
    }
    if (activeSelectedIds.length === 1) {
      return "1 Campaign Selected";
    }
    return `${activeSelectedIds.length} Campaigns Selected`;
  }, [isAllSelected, activeSelectedIds.length]);

  const triggerBadge = useMemo(() => {
    if (isAllSelected) {
      return `${campaigns.length}`;
    }
    return `${activeSelectedIds.length} / ${campaigns.length}`;
  }, [isAllSelected, activeSelectedIds.length, campaigns.length]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none ${
          isOpen
            ? "bg-blue-50/90 border-[#0052FF] text-[#0052FF] ring-2 ring-blue-500/15"
            : !isAllSelected
              ? "bg-blue-50/70 border-blue-300 text-[#0052FF] hover:bg-blue-100/70"
              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
        }`}
        title="Filter by campaign or select multiple"
      >
        <Layers className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
        <span className="text-[11px] sm:text-xs font-bold truncate max-w-[140px] sm:max-w-[180px]">
          {triggerLabel}
        </span>
        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold shrink-0 ${
          !isAllSelected 
            ? "bg-[#0052FF] text-white" 
            : "bg-blue-100/80 text-[#0052FF]"
        }`}>
          {triggerBadge}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-[#0052FF]" : ""
          }`}
        />
      </button>

      {/* Shorter, Cleaner Popover */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-2xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3.5 top-28 sm:inset-x-auto sm:absolute sm:left-0 sm:top-full mt-1.5 w-auto sm:w-[420px] max-w-none sm:max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in duration-100 flex flex-col">
          
            {/* Header & Controls: Compact 2.5-spacing */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
                  <span className="text-xs font-bold text-slate-900">Select Campaigns</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isAllSelected
                      ? "bg-slate-200/70 text-slate-700"
                      : "bg-[#0052FF] text-white"
                  }`}>
                    {isAllSelected 
                      ? `All (${campaigns.length})` 
                      : `${activeSelectedIds.length} / ${campaigns.length}`}
                  </span>
                  {!isAllSelected && (
                    <button
                      type="button"
                      onClick={handleResetToAll}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact Instant Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaign, ID, or brand..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Brand Filter Pills & Inline Action Button */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBrandFilter("ALL")}
                    className={`px-2 py-0.5 rounded-md font-bold shrink-0 transition-all cursor-pointer ${
                      selectedBrandFilter === "ALL"
                        ? "bg-[#0052FF] text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    All ({campaigns.length})
                  </button>
                  {brandList.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setSelectedBrandFilter(b.name)}
                      className={`px-2 py-0.5 rounded-md shrink-0 transition-all cursor-pointer ${
                        selectedBrandFilter === b.name
                          ? "bg-[#0052FF] text-white shadow-2xs font-bold"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {b.name} ({b.count})
                    </button>
                  ))}
                </div>

                {filteredCampaigns.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleVisible}
                    className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold text-[#0052FF] hover:bg-blue-100/70 bg-blue-50 border border-blue-200/70 transition-colors cursor-pointer"
                    title={allVisibleSelected ? "Deselect visible" : "Select all visible"}
                  >
                    {allVisibleSelected ? (
                      <>
                        <X className="w-2.5 h-2.5" />
                        <span>Deselect ({filteredCampaigns.length})</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-2.5 h-2.5" />
                        <span>Select ({filteredCampaigns.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Campaign Checklist: Shorter, Compact Scrollable Container */}
            <div className="max-h-[200px] sm:max-h-[210px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              
              {/* Master Item: ALL CAMPAIGNS */}
              {(!searchQuery || "all campaigns".includes(searchQuery.toLowerCase())) && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className={`w-full text-left p-1.5 px-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer group ${
                    isAllSelected
                      ? "bg-blue-50/90 border border-blue-200/80 text-[#0052FF]"
                      : "hover:bg-slate-50 border border-transparent text-slate-800"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                      isAllSelected
                        ? "bg-[#0052FF] border-[#0052FF] text-white"
                        : "border-slate-300 bg-white group-hover:border-[#0052FF]"
                    }`}
                  >
                    {isAllSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold truncate ${
                      isAllSelected ? "text-[#0052FF]" : "text-slate-900"
                    }`}>
                      All Campaigns (Consolidated)
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                      {campaigns.length} campaigns • {totalCreators} creators
                    </span>
                  </div>
                </button>
              )}

              {filteredCampaigns.length > 0 && (
                <div className="border-t border-slate-100 my-0.5"></div>
              )}

              {/* Individual Campaign Items */}
              {filteredCampaigns.length === 0 ? (
                <div className="py-4 text-center space-y-1">
                  <Search className="w-4 h-4 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-500">No matching campaigns</p>
                </div>
              ) : (
                filteredCampaigns.map((c) => {
                  const isChecked = !isAllSelected && selectedSet.has(c.id);
                  const cleanMonth = formatCleanMonth(c.campaign_month);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleToggleCampaign(c.id)}
                      className={`w-full text-left p-1.5 px-2 rounded-lg transition-all flex items-start gap-2 cursor-pointer group ${
                        isChecked
                          ? "bg-blue-50/80 border border-blue-200 text-[#0052FF]"
                          : "hover:bg-slate-50 border border-transparent text-slate-800"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                          isChecked
                            ? "bg-[#0052FF] border-[#0052FF] text-white"
                            : "border-slate-300 bg-white group-hover:border-[#0052FF]"
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className={`text-xs font-semibold leading-tight truncate ${
                          isChecked ? "text-[#0052FF] font-bold" : "text-slate-900"
                        }`}>
                          {c.campaign_name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                          <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded text-[9px]">
                            {c.id}
                          </span>
                          <span>•</span>
                          <span className="truncate">{c.org_name}</span>
                          <span>•</span>
                          <span>{cleanMonth}</span>
                          {c.deliverables_count !== undefined && c.deliverables_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-blue-600">
                                {c.deliverables_count} {c.deliverables_count === 1 ? 'creator' : 'creators'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Slim Footer */}
            <div className="p-2 px-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
              <span>Showing {filteredCampaigns.length} of {campaigns.length}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono hidden sm:inline">Esc to close</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-[#0052FF] hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                >
                  {isAllSelected ? "View All" : `Done (${activeSelectedIds.length})`}
                </button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
});

CampaignSelector.displayName = "CampaignSelector";
