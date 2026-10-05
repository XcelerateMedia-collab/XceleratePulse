"use client";

import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from "react";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  FileText, 
  Video, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Flame, 
  SlidersHorizontal,
  Table as TableIcon,
  Kanban,
  Eye,
  Calendar,
  Package,
  MailCheck,
  FolderOpen,
  Sparkles,
  Share2,
  CheckCircle2,
  Camera,
  Download,
  ArrowUpDown,
  FileSpreadsheet,
  Building2,
  Trash2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Briefcase,
  Activity,
  Layers,
  Zap,
  UserCheck,
  Users
} from "lucide-react";
import { 
  CreatorDeliverableBrandView, 
  CreatorDeliverableInternal, 
  CategoryTier, 
  ScriptStatus, 
  DraftStatus, 
  ExecutionStatus 
} from "@/lib/types";
import { updateDeliverableWithAutomation, deleteDeliverable } from "@/lib/db/actions";
import { PerformanceMetricsEditor } from "@/components/analytics/PerformanceMetricsEditor";
import { calculateCreatorMilestones } from "@/lib/milestones";
import { ScreenshotLightboxModal, ScreenshotLightboxState } from "@/components/analytics/ScreenshotLightboxModal";
import { getCreatorProofScreenshots } from "@/lib/screenshot-utils";

interface DropdownOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  badgeClass?: string;
}

interface CustomFilterDropdownProps {
  id: string;
  label: string;
  value?: string;
  selectedValues?: string[];
  options: DropdownOption[];
  onChange?: (val: string) => void;
  onMultiChange?: (vals: string[]) => void;
  multiSelect?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
}

/**
 * Professional, compact, scrollable dropdown filter with multi-select, search, and counts
 */
const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = ({
  id,
  label,
  value,
  selectedValues,
  options,
  onChange,
  onMultiChange,
  multiSelect = true,
  enableSearch = true,
  searchPlaceholder,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize selected values
  const selectedList = useMemo(() => {
    if (multiSelect) {
      if (!selectedValues || selectedValues.length === 0 || selectedValues.includes("ALL")) {
        return [];
      }
      return selectedValues;
    }
    return value && value !== "ALL" ? [value] : [];
  }, [multiSelect, selectedValues, value]);

  const isCustomActive = selectedList.length > 0;

  // Selected option objects
  const selectedOptions = useMemo(() => {
    return options.filter((o) => selectedList.includes(o.value));
  }, [options, selectedList]);

  // Dynamic Trigger Label
  const triggerLabel = useMemo(() => {
    if (!isCustomActive) return label;
    if (selectedList.length === 1) {
      const match = options.find((o) => o.value === selectedList[0]);
      return match ? match.label : selectedList[0];
    }
    const shortLabel = label.replace(/^All\s+/i, "");
    return `${selectedList.length} ${shortLabel}`;
  }, [isCustomActive, selectedList, options, label]);

  // Total count of selected items
  const totalSelectedCount = useMemo(() => {
    if (!isCustomActive) return undefined;
    return selectedOptions.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [isCustomActive, selectedOptions]);

  // Filter options based on embedded search
  const filteredOptions = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => 
      opt.value === "ALL" || opt.label.toLowerCase().includes(q)
    );
  }, [options, searchFilter]);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearchFilter("");
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleToggleOption = (optVal: string) => {
    if (!multiSelect) {
      onChange?.(optVal);
      setIsOpen(false);
      return;
    }

    if (optVal === "ALL") {
      onMultiChange?.([]);
      return;
    }

    let next: string[];
    if (selectedList.includes(optVal)) {
      next = selectedList.filter((v) => v !== optVal);
    } else {
      next = [...selectedList, optVal];
    }

    onMultiChange?.(next);
  };

  const handleSelectAll = () => {
    const allSpecific = options.filter(o => o.value !== "ALL").map(o => o.value);
    onMultiChange?.(allSpecific);
  };

  const handleClearAll = () => {
    if (multiSelect) {
      onMultiChange?.([]);
    } else {
      onChange?.("ALL");
    }
  };

  const isAllSelected = useMemo(() => {
    const specificOptions = options.filter(o => o.value !== "ALL");
    return specificOptions.length > 0 && specificOptions.every(o => selectedList.includes(o.value));
  }, [options, selectedList]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border cursor-pointer whitespace-nowrap shadow-2xs select-none ${
          isCustomActive
            ? "bg-blue-50 text-[#0052FF] border-[#0052FF]/60 shadow-xs ring-1 ring-[#0052FF]/20"
            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate max-w-[130px] sm:max-w-[170px]">
          {triggerLabel}
        </span>
        {isCustomActive && totalSelectedCount !== undefined && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#0052FF] text-white font-mono">
            {totalSelectedCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#0052FF]" : "text-slate-400"
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-2xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3.5 bottom-6 sm:bottom-auto sm:inset-x-auto sm:absolute sm:left-0 sm:right-auto sm:top-full mt-1.5 w-auto sm:w-72 max-w-none sm:max-w-[90vw] rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>{label}</span>
              <div className="flex items-center space-x-2">
                {isCustomActive && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                {multiSelect && !isAllSelected && options.length > 2 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-bold text-[#0052FF] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>

            {/* In-Dropdown Search Option */}
            {enableSearch && options.length > 4 && (
              <div className="p-1.5 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={searchPlaceholder || `Search ${label.toLowerCase()}...`}
                    className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#0052FF] focus:outline-none transition-all"
                    autoFocus
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable List */}
            <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isAllOption = opt.value === "ALL";
                  const isSelected = isAllOption 
                    ? !isCustomActive 
                    : selectedList.includes(opt.value);

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleToggleOption(opt.value)}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between space-x-2 transition-all cursor-pointer text-left group ${
                        isSelected
                          ? "bg-blue-50/80 text-[#0052FF] font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate pr-2">
                        {multiSelect && !isAllOption ? (
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              isSelected
                                ? "bg-[#0052FF] border-[#0052FF] text-white shadow-2xs"
                                : "border-slate-300 bg-white group-hover:border-slate-400"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        ) : (
                          opt.icon && <span className="shrink-0">{opt.icon}</span>
                        )}
                        <span className="truncate">{opt.label}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {opt.count !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                              opt.badgeClass ||
                              (isSelected
                                ? "bg-[#0052FF]/10 text-[#0052FF]"
                                : "bg-slate-100 text-slate-600")
                            }`}
                          >
                            {opt.count}
                          </span>
                        )}
                        {!multiSelect && isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};



interface CampaignPipelineViewProps {
  deliverables: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  isInternal: boolean;
  role?: import("@/lib/types").Role;
  xceleratePoc: string;
  brandPoc: string;
  paymentCycle: string;
  onDeliverableUpdated?: () => void;
}

export const CampaignPipelineView: React.FC<CampaignPipelineViewProps> = React.memo(({
  deliverables,
  isInternal,
  role = "BRAND_CLIENT",
  xceleratePoc,
  brandPoc,
  paymentCycle,
  onDeliverableUpdated,
}) => {
  // Role-based permission flags
  const isAdmin = role === "SUPER_ADMIN" || role === "INTERNAL_OPS";
  const isEmployee = role === "EMPLOYEE";
  const isPerformanceAnalyst = role === "PERFORMANCE_ANALYST";
  const canDelete = isAdmin; // Only admins can delete
  const canEditStages = isAdmin || isEmployee; // Admins and assigned employees can advance stages
  const canEditMetrics = isAdmin || isEmployee || isPerformanceAnalyst; // All internal roles can fill metrics
  const hasBrandPoc = Boolean(
    brandPoc &&
    brandPoc.trim() !== "" &&
    brandPoc.trim().toUpperCase() !== "N/A" &&
    brandPoc.trim() !== "Brand Manager"
  );

  const [viewMode, setViewMode] = useState<"table" | "kanban" | "cards">("table");

  // Automatically select high-polish native app cards view on mobile screens (< 768px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("cards");
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string[]>([]);
  const [xceleratePocFilter, setXceleratePocFilter] = useState<string[]>([]);
  const [brandPocFilter, setBrandPocFilter] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<CreatorDeliverableBrandView | CreatorDeliverableInternal | null>(null);
  const [lightboxScreenshot, setLightboxScreenshot] = useState<ScreenshotLightboxState | null>(null);
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);

  const [sortField, setSortField] = useState<string>("default");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State for Master Table (Reduces DOM overhead from 25,000 to ~2,000 nodes for 0ms interaction)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Trigger quick automated status cascade
  const handleQuickCascade = async (updates: Partial<CreatorDeliverableInternal>) => {
    if (!selectedCreator) return;
    setIsAutomating(true);
    try {
      const res = await updateDeliverableWithAutomation(selectedCreator.id, updates);
      if (res.success && res.deliverable) {
        setAutomationLogs(res.automationsApplied);
        setSelectedCreator(res.deliverable);
        if (onDeliverableUpdated) {
          onDeliverableUpdated();
        }
      }
    } catch (err) {
      console.error("Failed to execute status cascade:", err);
    } finally {
      setIsAutomating(false);
    }
  };

  // Permanently delete a deliverable/creator
  const handleDeleteCreator = async (creatorId: string, creatorName: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${creatorName}" from the database?`)) {
      return;
    }
    try {
      const res = await deleteDeliverable(creatorId);
      if (res.success) {
        if (selectedCreator && selectedCreator.id === creatorId) {
          setSelectedCreator(null);
        }
        if (onDeliverableUpdated) {
          onDeliverableUpdated();
        }
      } else {
        alert("Failed to delete creator: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error deleting creator: " + err.message);
    }
  };

  // Derive unique campaign/brand options for consolidated or multi-campaign views
  const campaignOptions = useMemo(() => {
    const map = new Map<string, number>();
    deliverables.forEach((d) => {
      const name = (d.campaign_name || d.org_name || "").trim();
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        value: name,
        label: name,
        count,
      }));
  }, [deliverables]);

  // Compute status counts for dropdown badges
  const statusCounts = useMemo(() => {
    let completed = 0;
    let inWorkflow = 0;
    let stage1 = 0;
    let stage2 = 0;
    let stage3 = 0;
    let revision = 0;
    let hold = 0;
    let dropped = 0;
    let withMetrics = 0;
    let noMetrics = 0;

    deliverables.forEach((d) => {
      const drop = Boolean(
        d.execution_status === "Drop" ||
        d.script_status === "Drop" ||
        d.first_draft_status === "Drop" ||
        d.final_video_status === "Drop" ||
        d.confirmation_mail_status === "Drop"
      );

      const hasMetrics =
        (d.total_views || 0) > 0 ||
        (d.likes || 0) > 0 ||
        (d.account_reach || 0) > 0 ||
        ((d as any).day7_views || 0) > 0 ||
        ((d as any).day15_views || 0) > 0 ||
        ((d as any).day30_views || 0) > 0 ||
        Boolean(d.live_link);

      if (hasMetrics && !drop) {
        withMetrics++;
      } else if (!drop) {
        noMetrics++;
      }

      if (drop) {
        dropped++;
        return;
      }

      if (d.execution_status === "Completed" || Boolean(d.live_link)) {
        completed++;
      } else if (d.execution_status === "Hold") {
        hold++;
      } else {
        inWorkflow++;
      }

      if (d.script_status !== "Approved" && !d.live_link) stage1++;
      if (d.script_status === "Approved" && d.final_video_status !== "Approved" && !d.live_link) stage2++;
      if (d.final_video_status === "Approved" && !d.live_link) stage3++;
      if (d.first_draft_status?.toLowerCase().includes("revision") || d.first_draft_status?.toLowerCase().includes("reshoot")) revision++;
    });

    return {
      total: deliverables.length,
      completed,
      inWorkflow,
      stage1,
      stage2,
      stage3,
      revision,
      hold,
      dropped,
      withMetrics,
      noMetrics,
    };
  }, [deliverables]);

  // Compute category tier counts
  const categoryCounts = useMemo(() => {
    let mega = 0;
    let macro = 0;
    let micro = 0;
    let nano = 0;

    deliverables.forEach((d) => {
      const cat = (d.category || "").toLowerCase();
      const fc = d.followers_count || 0;
      if (cat === "mega" || fc >= 1_000_000) mega++;
      else if (cat === "macro" || (fc >= 100_000 && fc < 1_000_000)) macro++;
      else if (cat === "micro" || (fc >= 10_000 && fc < 100_000)) micro++;
      else nano++;
    });

    return {
      total: deliverables.length,
      mega,
      macro,
      micro,
      nano,
    };
  }, [deliverables]);

  // Pre-index proof screenshots per creator for instant O(1) table rendering
  const proofsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCreatorProofScreenshots>>();
    for (let i = 0; i < deliverables.length; i++) {
      map.set(deliverables[i].id, getCreatorProofScreenshots(deliverables[i]));
    }
    return map;
  }, [deliverables]);

  // Pre-calculate creator milestones once per deliverables update for O(1) instant lookups
  const milestonesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCreatorMilestones>>();
    for (let i = 0; i < deliverables.length; i++) {
      map.set(deliverables[i].id, calculateCreatorMilestones(deliverables[i]));
    }
    return map;
  }, [deliverables]);

  // Dropdown Options
  const statusDropdownOptions: DropdownOption[] = useMemo(() => {
    return [
      {
        value: "ALL",
        label: "All Deliverables",
        count: statusCounts.total,
        icon: <Layers className="w-3.5 h-3.5 text-slate-500" />,
      },
      {
        value: "COMPLETED",
        label: "Completed Execution (Live)",
        count: statusCounts.completed,
        icon: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs"></span>,
        badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      },
      {
        value: "IN_WORKFLOW",
        label: "In Workflow / In Progress",
        count: statusCounts.inWorkflow,
        icon: <span className="w-2.5 h-2.5 rounded-full bg-[#0052FF] shrink-0 shadow-2xs"></span>,
        badgeClass: "bg-blue-50 text-[#0052FF] border border-blue-200",
      },
      {
        value: "STAGE_1",
        label: "1. Scripting Stage",
        count: statusCounts.stage1,
        icon: <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        badgeClass: "bg-amber-50 text-amber-700",
      },
      {
        value: "STAGE_2",
        label: "2. Draft & Review",
        count: statusCounts.stage2,
        icon: <Video className="w-3.5 h-3.5 text-cyan-500 shrink-0" />,
        badgeClass: "bg-cyan-50 text-cyan-700",
      },
      {
        value: "STAGE_3",
        label: "3. Video Approved",
        count: statusCounts.stage3,
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />,
        badgeClass: "bg-teal-50 text-teal-700",
      },
      {
        value: "REVISION",
        label: "Under Revision / Reshoot",
        count: statusCounts.revision,
        icon: <RefreshCw className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
        badgeClass: "bg-purple-50 text-purple-700",
      },
      {
        value: "HOLD",
        label: "On Hold",
        count: statusCounts.hold,
        icon: <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
        badgeClass: "bg-slate-100 text-slate-600",
      },
      {
        value: "WITH_METRICS",
        label: "With Performance Metrics",
        count: statusCounts.withMetrics,
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
        badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200",
      },
      {
        value: "NO_METRICS",
        label: "No Metrics Logged (Pending)",
        count: statusCounts.noMetrics,
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
      },
      {
        value: "DROP",
        label: "Dropped Creators",
        count: statusCounts.dropped,
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        badgeClass: "bg-rose-50 text-rose-700",
      },
    ];
  }, [statusCounts]);

  const categoryDropdownOptions: DropdownOption[] = useMemo(() => {
    return [
      {
        value: "ALL",
        label: "All Categories",
        count: categoryCounts.total,
        icon: <Sparkles className="w-3.5 h-3.5 text-slate-400" />,
      },
      {
        value: "Mega",
        label: "Mega (1M+)",
        count: categoryCounts.mega,
        icon: <span className="w-2 h-2 rounded-full bg-purple-500"></span>,
      },
      {
        value: "Macro",
        label: "Macro (100K - 1M)",
        count: categoryCounts.macro,
        icon: <span className="w-2 h-2 rounded-full bg-indigo-500"></span>,
      },
      {
        value: "Micro",
        label: "Micro (10K - 100K)",
        count: categoryCounts.micro,
        icon: <span className="w-2 h-2 rounded-full bg-blue-500"></span>,
      },
      {
        value: "Nano",
        label: "Nano (<10K)",
        count: categoryCounts.nano,
        icon: <span className="w-2 h-2 rounded-full bg-slate-400"></span>,
      },
    ];
  }, [categoryCounts]);

  // Derive unique campaign/brief options with counts
  const campaignDropdownOptions: DropdownOption[] = useMemo(() => {
    const map = new Map<string, number>();
    deliverables.forEach((d) => {
      const name = (d.brief_name || d.campaign_name || d.org_name || "").trim();
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    });

    const items = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        value: name,
        label: name,
        count,
        icon: <Building2 className="w-3.5 h-3.5 text-indigo-500" />,
      }));

    return [
      {
        value: "ALL",
        label: "All Campaigns & Briefs",
        count: deliverables.length,
        icon: <Briefcase className="w-3.5 h-3.5 text-slate-400" />,
      },
      ...items,
    ];
  }, [deliverables]);

  // Derive unique Xcelerate POC options with deliverable counts
  const xceleratePocOptions: DropdownOption[] = useMemo(() => {
    const map = new Map<string, number>();
    deliverables.forEach((d) => {
      const poc = (d.execution_owner || (d as any).xcelerate_poc || "").trim();
      if (poc) {
        map.set(poc, (map.get(poc) || 0) + 1);
      }
    });

    const items = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        value: name,
        label: name,
        count,
        icon: <UserCheck className="w-3.5 h-3.5 text-blue-500" />,
      }));

    return [
      {
        value: "ALL",
        label: "All Xcelerate POCs",
        count: deliverables.length,
        icon: <UserCheck className="w-3.5 h-3.5 text-slate-400" />,
      },
      ...items,
    ];
  }, [deliverables]);

  // Derive unique Brand POC options with deliverable counts
  const brandPocOptions: DropdownOption[] = useMemo(() => {
    const map = new Map<string, number>();
    let naCount = 0;
    deliverables.forEach((d) => {
      const bp = (d.brand_agency_poc || "").trim();
      if (bp && bp.toUpperCase() !== "N/A" && bp !== "Brand Manager") {
        map.set(bp, (map.get(bp) || 0) + 1);
      } else {
        naCount++;
      }
    });

    const items = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        value: name,
        label: name,
        count,
        icon: <Users className="w-3.5 h-3.5 text-emerald-500" />,
      }));

    if (naCount > 0) {
      items.push({
        value: "N/A",
        label: "Unassigned / N/A",
        count: naCount,
        icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
      });
    }

    return [
      {
        value: "ALL",
        label: "All Brand POCs",
        count: deliverables.length,
        icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
      },
      ...items,
    ];
  }, [deliverables]);

  // Dynamic POC labels displayed in top summary cards
  const displayXceleratePoc = useMemo(() => {
    if (xceleratePocFilter.length === 1) return xceleratePocFilter[0];
    if (xceleratePocFilter.length > 1) return `${xceleratePocFilter.length} POCs Selected`;
    return xceleratePoc || "All Ops Leads";
  }, [xceleratePocFilter, xceleratePoc]);

  const displayBrandPoc = useMemo(() => {
    if (brandPocFilter.length === 1) return brandPocFilter[0];
    if (brandPocFilter.length > 1) return `${brandPocFilter.length} POCs Selected`;
    return hasBrandPoc ? brandPoc.trim() : "Multiple POCs";
  }, [brandPocFilter, hasBrandPoc, brandPoc]);

  const isFilterActive = 
    searchQuery.trim() !== "" || 
    (categoryFilter.length > 0 && !categoryFilter.includes("ALL")) || 
    (stageFilter.length > 0 && !stageFilter.includes("ALL")) || 
    (campaignFilter.length > 0 && !campaignFilter.includes("ALL")) ||
    (xceleratePocFilter.length > 0 && !xceleratePocFilter.includes("ALL")) ||
    (brandPocFilter.length > 0 && !brandPocFilter.includes("ALL"));

  const handleCategoryFilterChange = (vals: string[]) => {
    setCategoryFilter(vals);
    setCurrentPage(1);
  };

  const handleStageFilterChange = (vals: string[]) => {
    setStageFilter(vals);
    setCurrentPage(1);
  };

  const handleCampaignFilterChange = (vals: string[]) => {
    setCampaignFilter(vals);
    setCurrentPage(1);
  };

  const handleXceleratePocFilterChange = (vals: string[]) => {
    setXceleratePocFilter(vals);
    setCurrentPage(1);
  };

  const handleBrandPocFilterChange = (vals: string[]) => {
    setBrandPocFilter(vals);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter([]);
    setStageFilter([]);
    setCampaignFilter([]);
    setXceleratePocFilter([]);
    setBrandPocFilter([]);
    setCurrentPage(1);
  };

  // Filtered deliverables (Using deferredSearchQuery for 60fps responsive UI)
  const filtered = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    return deliverables.filter((item) => {
      // 1. Text Search across creator, niche, city, spec, campaign name, brand/org, POCs
      const matchesSearch = 
        !q ||
        (item.creator_name && item.creator_name.toLowerCase().includes(q)) ||
        (item.niche && item.niche.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q)) ||
        (item.deliverables && item.deliverables.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.campaign_name && item.campaign_name.toLowerCase().includes(q)) ||
        (item.brief_name && item.brief_name.toLowerCase().includes(q)) ||
        (item.org_name && item.org_name.toLowerCase().includes(q)) ||
        (item.execution_owner && item.execution_owner.toLowerCase().includes(q)) ||
        ((item as any).xcelerate_poc && (item as any).xcelerate_poc.toLowerCase().includes(q)) ||
        (item.brand_agency_poc && item.brand_agency_poc.toLowerCase().includes(q)) ||
        (item.script_status && item.script_status.toLowerCase().includes(q)) ||
        (item.first_draft_status && item.first_draft_status.toLowerCase().includes(q)) ||
        (item.execution_status && item.execution_status.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Campaign / Brief Filter (Multi-select)
      if (campaignFilter.length > 0 && !campaignFilter.includes("ALL")) {
        const matchesCamp = campaignFilter.some((cf) => {
          const cfLower = cf.toLowerCase().trim();
          return (
            (item.campaign_name && item.campaign_name.trim().toLowerCase() === cfLower) ||
            (item.brief_name && item.brief_name.trim().toLowerCase() === cfLower) ||
            (item.org_name && item.org_name.trim().toLowerCase() === cfLower) ||
            (item.campaign_id && item.campaign_id.trim().toLowerCase() === cfLower)
          );
        });
        if (!matchesCamp) return false;
      }

      // 3. Xcelerate POC Filter (Multi-select)
      if (xceleratePocFilter.length > 0 && !xceleratePocFilter.includes("ALL")) {
        const matchesPoc = xceleratePocFilter.some((poc) => {
          const pocLower = poc.toLowerCase().trim();
          const owner = (item.execution_owner || "").toLowerCase().trim();
          const xPoc = ((item as any).xcelerate_poc || "").toLowerCase().trim();
          return owner === pocLower || xPoc === pocLower;
        });
        if (!matchesPoc) return false;
      }

      // 4. Brand / Agency POC Filter (Multi-select)
      if (brandPocFilter.length > 0 && !brandPocFilter.includes("ALL")) {
        const matchesBrandPoc = brandPocFilter.some((bp) => {
          const bpLower = bp.toLowerCase().trim();
          const itemBp = (item.brand_agency_poc || "").toLowerCase().trim();
          if (bpLower === "n/a" || bpLower === "unassigned") {
            return !itemBp || itemBp === "n/a" || itemBp === "unassigned";
          }
          return itemBp === bpLower;
        });
        if (!matchesBrandPoc) return false;
      }

      // 5. Creator Category Tier Filter (Multi-select)
      if (categoryFilter.length > 0 && !categoryFilter.includes("ALL")) {
        const cat = (item.category || "").trim().toLowerCase();
        const matchesCat = categoryFilter.some((cVal) => {
          const cLower = cVal.toLowerCase();
          return (
            cat === cLower ||
            (cLower === "mega" && item.followers_count >= 1_000_000) ||
            (cLower === "macro" && item.followers_count >= 100_000 && item.followers_count < 1_000_000) ||
            (cLower === "micro" && item.followers_count >= 10_000 && item.followers_count < 100_000) ||
            (cLower === "nano" && item.followers_count < 10_000)
          );
        });
        if (!matchesCat) return false;
      }

      // 6. Execution & Workflow Status Filter (Multi-select)
      if (stageFilter.length > 0 && !stageFilter.includes("ALL")) {
        const isDropped = Boolean(
          item.execution_status === "Drop" ||
          item.script_status === "Drop" ||
          item.first_draft_status === "Drop" ||
          item.final_video_status === "Drop" ||
          item.confirmation_mail_status === "Drop"
        );

        const matchesSt = stageFilter.some((stVal) => {
          if (stVal === "ALL") return true;
          if (stVal === "ACTIVE") return !isDropped;
          if (stVal === "DROP") return isDropped;
          if (stVal === "COMPLETED" || stVal === "LIVE") {
            return !isDropped && (item.execution_status === "Completed" || Boolean(item.live_link));
          }
          if (stVal === "IN_WORKFLOW" || stVal === "IN_PROGRESS" || stVal === "On Going") {
            return !isDropped && item.execution_status !== "Completed" && !item.live_link && item.execution_status !== "Hold";
          }
          if (stVal === "STAGE_1") return !isDropped && item.script_status !== "Approved" && !item.live_link;
          if (stVal === "STAGE_2") return !isDropped && item.script_status === "Approved" && item.final_video_status !== "Approved" && !item.live_link;
          if (stVal === "STAGE_3") return !isDropped && item.final_video_status === "Approved" && !item.live_link;
          if (stVal === "REVISION") return !isDropped && Boolean(item.first_draft_status?.toLowerCase().includes("revision") || item.first_draft_status?.toLowerCase().includes("reshoot"));
          if (stVal === "WITH_METRICS" || stVal === "HAS_METRICS") {
            return !isDropped && (
              (item.total_views || 0) > 0 ||
              (item.likes || 0) > 0 ||
              (item.account_reach || 0) > 0 ||
              ((item as any).day7_views || 0) > 0 ||
              ((item as any).day15_views || 0) > 0 ||
              ((item as any).day30_views || 0) > 0 ||
              Boolean(item.live_link)
            );
          }
          if (stVal === "NO_METRICS" || stVal === "AWAITING_METRICS") {
            return !isDropped && (
              (!item.total_views || item.total_views === 0) &&
              (!item.likes || item.likes === 0) &&
              (!item.account_reach || item.account_reach === 0) &&
              (!((item as any).day7_views) || (item as any).day7_views === 0) &&
              (!((item as any).day15_views) || (item as any).day15_views === 0) &&
              (!((item as any).day30_views) || (item as any).day30_views === 0) &&
              !item.live_link
            );
          }
          if (stVal === "HOLD") return !isDropped && item.execution_status === "Hold";
          return item.execution_status === stVal;
        });

        if (!matchesSt) return false;
      }

      return true;
    });
  }, [
    deliverables, 
    deferredSearchQuery, 
    campaignFilter, 
    xceleratePocFilter, 
    brandPocFilter, 
    categoryFilter, 
    stageFilter
  ]);

  // Sorted list for table view
  const sortedAndFiltered = useMemo(() => {
    if (sortField === "default") return filtered;
    return [...filtered].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortField === "name") {
        valA = a.creator_name.toLowerCase();
        valB = b.creator_name.toLowerCase();
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === "followers") {
        valA = a.followers_count || 0;
        valB = b.followers_count || 0;
      }
      if (sortField === "cost") {
        valA = a.brand_cost || 0;
        valB = b.brand_cost || 0;
      }
      if (sortField === "status") {
        valA = a.execution_status || "";
        valB = b.execution_status || "";
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [filtered, sortField, sortOrder]);

  // Pagination Calculations for Master Table (Instant 0ms render with 25 rows by default)
  const totalPages = pageSize === -1 ? 1 : (Math.ceil(sortedAndFiltered.length / pageSize) || 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = pageSize === -1 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = pageSize === -1 ? sortedAndFiltered.length : Math.min(startIndex + pageSize, sortedAndFiltered.length);
  const paginatedDeliverables = pageSize === -1 ? sortedAndFiltered : sortedAndFiltered.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const isItemDropped = (d: {
    execution_status?: string | null;
    script_status?: string | null;
    first_draft_status?: string | null;
    final_video_status?: string | null;
    confirmation_mail_status?: string | null;
  }) => {
    return Boolean(
      d.execution_status === "Drop" ||
      d.script_status === "Drop" ||
      d.first_draft_status === "Drop" ||
      d.final_video_status === "Drop" ||
      d.confirmation_mail_status === "Drop"
    );
  };

  // Export filtered deliverables to CSV
  const exportPipelineCsv = () => {
    const headers = [
      "Creator Name", "Category", "Followers", "Niche", "City", "Deliverables",
      "Script Status", "1st Draft Status", "Execution Status", "Brand Commercial (INR)", "Live Link"
    ];

    const rows = filtered.map(d => [
      `"${d.creator_name}"`,
      `"${d.category}"`,
      d.followers_count,
      `"${d.niche}"`,
      `"${d.city || "Pan-India"}"`,
      `"${d.deliverables}"`,
      `"${d.script_status}"`,
      `"${d.first_draft_status}"`,
      `"${d.execution_status}"`,
      d.brand_cost,
      `"${d.live_link || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Xcelerate_Pipeline_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kanban column buckets derived from FILTERED deliverables (only computed when Kanban view is active)
  const column1Items = useMemo(
    () => viewMode === "kanban" ? filtered.filter((d) => !isItemDropped(d) && d.script_status !== "Approved" && !d.live_link) : [],
    [filtered, viewMode]
  );
  const column2Items = useMemo(
    () => viewMode === "kanban" ? filtered.filter((d) => !isItemDropped(d) && d.script_status === "Approved" && d.final_video_status !== "Approved" && !d.live_link) : [],
    [filtered, viewMode]
  );
  const column3Items = useMemo(
    () => viewMode === "kanban" ? filtered.filter((d) => !isItemDropped(d) && d.final_video_status === "Approved" && !d.live_link) : [],
    [filtered, viewMode]
  );
  const column4Items = useMemo(
    () => viewMode === "kanban" ? filtered.filter((d) => !isItemDropped(d) && Boolean(d.live_link)) : [],
    [filtered, viewMode]
  );
  const column5Items = useMemo(
    () => viewMode === "kanban" ? filtered.filter((d) => isItemDropped(d)) : [],
    [filtered, viewMode]
  );

  // Status badges
  const getScriptStatusBadge = (status: ScriptStatus) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Approved</span>
          </span>
        );
      case "Approval Pending":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Review Pending</span>
          </span>
        );
      case "Drop":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Dropped</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Script Pending</span>;
    }
  };

  const getDraftStatusBadge = (status: DraftStatus) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Approved</span>
          </span>
        );
      case "Sent For Revision/Reshoot":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw className="w-3 h-3 text-purple-600" />
            <span>In Revision</span>
          </span>
        );
      case "Revision/Reshoot Done":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-[#007BFF] border border-cyan-200">
            <CheckCircle2 className="w-3 h-3 text-[#007BFF]" />
            <span>Revision Done</span>
          </span>
        );
      case "Approval Pending":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Draft Review</span>
          </span>
        );
      case "Feedback Pending":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">Feedback Needed</span>;
      case "Drop":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Dropped</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Draft Pending</span>;
    }
  };

  const getExecutionBadge = (item: CreatorDeliverableBrandView) => {
    if (isItemDropped(item)) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span>Dropped</span>
        </span>
      );
    }
    if (item.live_link) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-[#0052FF] border border-blue-200 shadow-xs">
          <span className="live-indicator-dot"></span>
          <span>LIVE</span>
        </span>
      );
    }
    if (item.execution_status === "Completed") {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
    }
    if (item.execution_status === "Hold") {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">On Hold</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50/70 text-[#0052FF] border border-blue-200/60">On Going</span>;
  };

  const formatFollowers = (count: number) => {
    if (!count || count <= 0) return "—";
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + "M";
    if (count >= 1_000) return (count / 1_000).toFixed(0) + "K";
    return count.toLocaleString();
  };

  const formatCurrency = (val: number) => "₹" + val.toLocaleString("en-IN");
  const formatNumber = (num: number) => (!num || num <= 0 ? "0" : num.toLocaleString("en-IN"));

  /**
   * Strips all time and timestamp components (e.g., T18:30:00.000Z or 18:30:00) so ONLY the date is displayed.
   */
  const formatDateOnly = (val?: string | null): string => {
    if (!val) return "";
    const s = String(val).trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.split("T")[0].trim();
    if (/^\d{4}-\d{2}-\d{2}\s/.test(s)) return s.split(/\s+/)[0].trim();
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s/.test(s)) return s.split(/\s+/)[0].trim();
    return s;
  };

  /**
   * Resolves and formats external links (Google Docs, Drive files/folders, PDFs, web links)
   */
  const getScriptLinkInfo = (url?: string) => {
    if (!url || !url.trim()) return null;
    const raw = url.trim();
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    const lower = raw.toLowerCase();
    let label = "View Doc ↗";
    if (lower.includes(".pdf") || lower.includes("/pdf")) {
      label = "View PDF ↗";
    } else if (lower.includes("drive.google.com/drive/folders")) {
      label = "Drive Folder ↗";
    } else if (lower.includes("drive.google.com")) {
      label = "Drive File ↗";
    } else if (lower.includes("docs.google.com/document")) {
      label = "View Doc ↗";
    }
    return { href, label };
  };

  return (
    <div className="space-y-4">
      
      {/* Campaign Metadata & POC Header Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 w-full sm:w-auto">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Xcelerate POC</div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5 mt-0.5">
              <span>{displayXceleratePoc}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0052FF] border border-blue-200 font-bold">Agency Lead</span>
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Brand / Agency POC</div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5 mt-0.5">
              <span>{displayBrandPoc}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Client Lead</span>
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Cycle</div>
            <div className="text-sm font-bold text-slate-800 mt-0.5">
              {paymentCycle || "Standard Net 30"}
            </div>
          </div>
        </div>

        {/* View Mode Switcher — Cards / Master Table / Pipeline */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "cards"
                ? "bg-white text-[#0052FF] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Creator cards overview"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Cards View</span>
            <span className="sm:hidden">Cards</span>
          </button>

          <button
            onClick={() => setViewMode("table")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-[#0052FF] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Desktop tabular view"
          >
            <TableIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Master Table</span>
            <span className="sm:hidden">Table</span>
          </button>

          <button
            onClick={() => setViewMode("kanban")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "kanban"
                ? "bg-white text-[#0052FF] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Kanban stage progression"
          >
            <Kanban className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Stage Pipeline</span>
            <span className="sm:hidden">Pipeline</span>
          </button>
        </div>
      </div>

      {/* Professional Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {/* Search Bar with Clear Icon */}
        <div className="relative flex-1 min-w-[220px] max-w-lg">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search creator name, niche, city, campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-7 rounded-xl bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0052FF] text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Controls Row — Compact, Perfectly Aligned h-9 Controls */}
        <div className="flex items-center flex-wrap gap-2 justify-start lg:justify-end">
          {/* Campaign / Brief Filter */}
          <CustomFilterDropdown
            id="campaign-filter-dropdown"
            label="All Campaigns"
            selectedValues={campaignFilter}
            options={campaignDropdownOptions}
            onMultiChange={handleCampaignFilterChange}
            multiSelect={true}
            enableSearch={true}
            searchPlaceholder="Search campaigns & briefs..."
            icon={<Briefcase className="w-3.5 h-3.5 text-slate-500" />}
          />

          {/* Xcelerate POC Filter */}
          {xceleratePocOptions.length > 1 && (
            <CustomFilterDropdown
              id="xcelerate-poc-filter-dropdown"
              label="Xcelerate POC"
              selectedValues={xceleratePocFilter}
              options={xceleratePocOptions}
              onMultiChange={handleXceleratePocFilterChange}
              multiSelect={true}
              enableSearch={true}
              searchPlaceholder="Search Xcelerate POCs..."
              icon={<UserCheck className="w-3.5 h-3.5 text-slate-500" />}
            />
          )}

          {/* Brand POC Filter */}
          {brandPocOptions.length > 1 && (
            <CustomFilterDropdown
              id="brand-poc-filter-dropdown"
              label="Brand POC"
              selectedValues={brandPocFilter}
              options={brandPocOptions}
              onMultiChange={handleBrandPocFilterChange}
              multiSelect={true}
              enableSearch={true}
              searchPlaceholder="Search Brand POCs..."
              icon={<Users className="w-3.5 h-3.5 text-slate-500" />}
            />
          )}

          {/* Execution & Workflow Status Filter (Key Requirement) */}
          <CustomFilterDropdown
            id="status-filter-dropdown"
            label="All Statuses"
            selectedValues={stageFilter}
            options={statusDropdownOptions}
            onMultiChange={handleStageFilterChange}
            multiSelect={true}
            enableSearch={true}
            searchPlaceholder="Search statuses..."
            icon={<Activity className="w-3.5 h-3.5 text-slate-500" />}
          />

          {/* Creator Category Tier Filter */}
          <CustomFilterDropdown
            id="category-filter-dropdown"
            label="All Categories"
            selectedValues={categoryFilter}
            options={categoryDropdownOptions}
            onMultiChange={handleCategoryFilterChange}
            multiSelect={true}
            enableSearch={true}
            searchPlaceholder="Search categories..."
            icon={<Layers className="w-3.5 h-3.5 text-slate-500" />}
          />

          {/* Reset Filters Pill (Only visible when active) */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-9 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200/80 flex items-center space-x-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Reset all active filters"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Showing Count & Export CSV Row */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
            <div className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center text-xs text-slate-600 whitespace-nowrap font-medium select-none shadow-2xs flex-1 sm:flex-initial justify-center sm:justify-start">
              <span>
                Showing <strong className="text-slate-900 font-bold">{filtered.length}</strong> of {deliverables.length}
              </span>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={exportPipelineCsv}
              className="h-9 flex items-center space-x-1.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-98 shrink-0"
              title="Download CSV report of current filtered view"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Master Table View (Cinematic Light Studio) */}
      {viewMode === "table" && (
        <div className="w-full">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          {/* Mobile Swipe Guidance Banner */}
          <div className="sm:hidden px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/80 flex items-center justify-between text-xs text-[#0052FF] font-semibold">
            <span>👉 Swipe table sideways to view all stages</span>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className="px-2 py-0.5 rounded-md bg-[#0052FF] text-white font-bold text-[10px] shadow-2xs hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Cards View
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[460px] custom-scrollbar touch-pan-x">
            <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300/80 shadow-2xs">
              <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th 
                  className="py-3 px-4 min-w-[210px] cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort("name")}
                  title="Click to sort by creator name"
                >
                  <div className="flex items-center space-x-1">
                    <span>Creator Profile</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 min-w-[150px] cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort("followers")}
                  title="Click to sort by followers"
                >
                  <div className="flex items-center space-x-1">
                    <span>Audience &amp; Region</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[130px]">Deliverables</th>
                <th className="py-3 px-3 min-w-[110px]">Logistics</th>
                <th className="py-3 px-3 min-w-[110px]">Stage 1: Script</th>
                <th className="py-3 px-3 min-w-[110px]">Stage 2: 1st Draft</th>
                <th className="py-3 px-3 min-w-[180px]">Stage 3: Go-Live</th>
                <th 
                  className="py-3 px-3 min-w-[95px] cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort("status")}
                  title="Click to sort by execution status"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                {isInternal ? (
                  <>
                    <th className="py-3 px-3 min-w-[95px] text-indigo-700 font-bold">Creator Cost</th>
                    <th className="py-3 px-3 min-w-[95px] text-[#0052FF] font-bold">Gross Margin</th>
                    <th className="py-3 px-3 min-w-[100px] text-slate-700">Phone</th>
                  </>
                ) : isPerformanceAnalyst ? (
                  <>
                    <th className="py-3 px-3 min-w-[90px] text-[#0052FF] font-bold">Total Views</th>
                    <th className="py-3 px-3 min-w-[80px] text-emerald-600 font-bold">ER (%)</th>
                    <th className="py-3 px-3 min-w-[90px] text-slate-700 font-bold">Reach</th>
                  </>
                ) : (
                  <th 
                    className="py-3 px-3 min-w-[95px] text-slate-700 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort("cost")}
                    title="Click to sort by commercial"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Commercial</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                <th className="py-3 px-4 min-w-[90px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedDeliverables.map((item) => {
                const internalItem = item as CreatorDeliverableInternal;

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer border-b border-slate-100"
                    onClick={() => setSelectedCreator(item)}
                  >
                    {/* Creator Profile */}
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0052FF] to-[#00C2FF] text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                          {item.creator_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          {/* Line 1: Creator Name, Profile Link, Niche, Status */}
                          <div className="flex items-center space-x-2 truncate">
                            <span className={`font-extrabold text-[13px] text-slate-900 group-hover:text-[#0052FF] transition-colors truncate ${
                              isItemDropped(item) ? "line-through text-slate-400 decoration-rose-400" : ""
                            }`}>
                              {item.creator_name}
                            </span>
                            {item.profile_url && (
                              <a
                                href={item.profile_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-[#0052FF] transition-colors shrink-0"
                                title="Open creator profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5 inline" />
                              </a>
                            )}
                            {item.niche && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70 shrink-0">
                                {item.niche}
                              </span>
                            )}
                            {isItemDropped(item) && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold uppercase tracking-wider shrink-0">
                                Dropped
                              </span>
                            )}
                          </div>

                          {/* Line 2: Campaign Context & Clear POC Ownership */}
                          <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-500 truncate">
                            {/* Brand / Campaign Badge */}
                            {(() => {
                              const brandLabel = (item.org_name && item.org_name !== "Unassigned")
                                ? item.org_name
                                : (item.campaign_name && item.campaign_name !== "Consolidated Campaign" ? item.campaign_name : null);
                              if (!brandLabel) return null;
                              return (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50/90 text-[#0052FF] border border-blue-200/70 shrink-0 flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5 text-[#0052FF] shrink-0" />
                                  <span>{brandLabel}</span>
                                </span>
                              );
                            })()}

                            {/* Brand / Agency POC (Client Lead) */}
                            {item.brand_agency_poc && 
                             item.brand_agency_poc.trim() !== "" && 
                             item.brand_agency_poc.toUpperCase() !== "N/A" && 
                             item.brand_agency_poc.toLowerCase() !== "unassigned" && 
                             item.brand_agency_poc !== "Brand Manager" && (
                              <span 
                                className="text-[9.5px] px-2 py-0.5 rounded-md bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 font-medium shrink-0 flex items-center gap-1"
                                title={`Brand / Agency POC: ${item.brand_agency_poc}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="text-emerald-600 font-bold text-[9px]">Client:</span>
                                <span className="font-semibold">{item.brand_agency_poc}</span>
                              </span>
                            )}

                            {/* Xcelerate POC / Execution Owner (Agency Lead) */}
                            {isInternal && ((item as CreatorDeliverableInternal).execution_owner || item.xcelerate_poc) && (
                              <span 
                                className="text-[9.5px] px-2 py-0.5 rounded-md bg-amber-50/90 text-amber-900 border border-amber-200/80 font-medium shrink-0 flex items-center gap-1"
                                title={`Agency Lead: ${(item as CreatorDeliverableInternal).execution_owner || item.xcelerate_poc}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                <span className="text-amber-600 font-bold text-[9px]">Lead:</span>
                                <span className="font-semibold">{(item as CreatorDeliverableInternal).execution_owner || item.xcelerate_poc}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Demographics */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      {item.followers_count > 0 ? (
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.category === "Mega" 
                              ? "bg-blue-100 text-[#0052FF] border border-blue-300"
                              : item.category === "Macro"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {item.category && item.category !== "Unspecified" ? item.category : "Creator"}
                          </span>
                          <span className="text-slate-800 font-bold">
                            {formatFollowers(item.followers_count)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-slate-400 font-medium italic">
                            Followers Unspecified
                          </span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1 truncate max-w-[150px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 inline" />
                        <span className="truncate">{item.city ? `${item.city}` : "India"}</span>
                        <span>•</span>
                        <span className="truncate">{item.language || "English"}</span>
                      </div>
                    </td>

                    {/* Deliverable Spec */}
                    <td className="py-3 px-3 align-middle">
                      <div className="text-slate-800 font-medium max-w-[140px] truncate" title={item.deliverables}>
                        {item.deliverables}
                      </div>
                    </td>

                    {/* Logistics */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      <div className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                        <Package className="w-3.5 h-3.5 text-[#0052FF]" />
                        <span>{item.product_status || "Not Applicable"}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mail: {item.confirmation_mail_status || "Pending"}
                      </div>
                    </td>

                    {/* Stage 1: Script */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      <div>{getScriptStatusBadge(item.script_status)}</div>
                      {(() => {
                        const info = getScriptLinkInfo(item.script_link);
                        if (!info) return null;
                        return (
                          <a
                            href={info.href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 text-[11px] text-[#0052FF] font-semibold hover:underline mt-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{info.label}</span>
                          </a>
                        );
                      })()}
                      {item.script_approval_date && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Approved: {formatDateOnly(item.script_approval_date)}
                        </div>
                      )}
                    </td>

                    {/* Stage 2: 1st Draft */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      <div>{getDraftStatusBadge(item.first_draft_status)}</div>
                      {item.revision_drive_link && (
                        <a
                          href={item.revision_drive_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-[11px] text-purple-600 font-semibold hover:underline mt-1"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>Drive Revisions ↗</span>
                        </a>
                      )}
                      {item.first_draft_date && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Date: {formatDateOnly(item.first_draft_date)}
                        </div>
                      )}
                    </td>

                    {/* Stage 3: Live Link & Milestones */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      {item.live_link ? (
                        <div className="space-y-1 min-w-[160px]">
                          {/* 1. Watch Reel Action Capsule with Live Pulse (Top Line, aligned with Stage 1 & 2 pills) */}
                          <div className="flex items-center space-x-1.5">
                            <a
                              href={item.live_link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0052FF] border border-blue-200 text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                              title="Watch Reel on Instagram"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] animate-pulse"></span>
                              <Video className="w-3.5 h-3.5 text-[#0052FF]" />
                              <span>Watch Reel</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </div>

                          {/* 2. Systematic Live Date (Matches Stage 1 Approved & Stage 2 Date format) */}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Live: {formatDateOnly(item.live_date) || "Active"}
                          </div>

                          {/* 3. Systematic Capsule Boxes Container (Milestone Tag + Verified Proofs) */}
                          {(() => {
                            const ms = milestonesMap.get(item.id) || calculateCreatorMilestones(item);
                            const creatorProofs = proofsMap.get(item.id) || [];
                            const hasMilestone = ms.allMilestonesCompleted || ms.nextActionMilestone;
                            const hasProofs = creatorProofs.length > 0;

                            if (!hasMilestone && !hasProofs) return null;

                            return (
                              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                {/* Milestone Capsule Box */}
                                {ms.allMilestonesCompleted ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                    <span>🏆 30D Done</span>
                                  </span>
                                ) : ms.hasActionRequired && ms.nextActionMilestone ? (
                                  <span
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black border shadow-2xs ${
                                      ms.nextActionMilestone.isOverdue
                                        ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                                        : "bg-amber-50 text-amber-900 border-amber-300"
                                    }`}
                                  >
                                    <Zap className="w-2.5 h-2.5" />
                                    <span>{ms.nextActionMilestone.tag} Due</span>
                                  </span>
                                ) : ms.nextActionMilestone ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs">
                                    <span>{ms.nextActionMilestone.tag} in {ms.nextActionMilestone.daysRemaining}d</span>
                                  </span>
                                ) : null}

                                {/* Verified Proofs Capsule Box */}
                                {hasProofs && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxScreenshot({
                                        urls: creatorProofs.map((p) => p.url),
                                        currentIndex: 0,
                                        title: `${item.creator_name} - Verified Proofs`,
                                        tag: `📷 ${creatorProofs.length} Proof${creatorProofs.length > 1 ? "s" : ""}`,
                                      });
                                    }}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50/90 hover:bg-blue-100 text-[#0052FF] border border-blue-200 cursor-pointer shadow-2xs transition-colors hover:border-blue-400"
                                    title="Click to view verified screenshot proofs"
                                  >
                                    <Camera className="w-3 h-3 text-[#0052FF]" />
                                    <span>{creatorProofs.length} Proof{creatorProofs.length > 1 ? "s" : ""}</span>
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : isItemDropped(item) ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Dropped</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Pending Live
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      {getExecutionBadge(item)}
                    </td>

                    {/* Commercials or Performance Metrics (Role-Gated) */}
                    {isInternal ? (
                      <>
                        <td className="py-3 px-3 font-semibold text-slate-800 align-middle">
                          {isItemDropped(item) ? (
                            <span className="text-slate-400 line-through">₹0</span>
                          ) : (
                            formatCurrency(internalItem.creator_cost || 0)
                          )}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[#0052FF] align-middle">
                          {isItemDropped(item) ? (
                            <span className="text-slate-400 line-through">₹0</span>
                          ) : (
                            formatCurrency(internalItem.gross_margin || 0)
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-700 font-medium whitespace-nowrap align-middle">
                          {internalItem.phone_number || "—"}
                        </td>
                      </>
                    ) : isPerformanceAnalyst ? (
                      <>
                        <td className="py-3 px-3 font-extrabold text-slate-900 align-middle">
                          {formatNumber(item.total_views || 0)}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-600 align-middle">
                          {item.engagement_rate || 0}%
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 align-middle">
                          {formatNumber(item.account_reach || 0)}
                        </td>
                      </>
                    ) : (
                      <td className="py-3 px-3 font-extrabold text-slate-900 align-middle">
                        {isItemDropped(item) ? (
                          <div>
                            <span className="text-slate-400 line-through font-normal">{formatCurrency(item.brand_cost || 0)}</span>
                            <div className="text-[10px] text-rose-600 font-bold">Released</div>
                          </div>
                        ) : (
                          formatCurrency(item.brand_cost || 0)
                        )}
                      </td>
                    )}

                    {/* Action */}
                    <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCreator(item);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                            isPerformanceAnalyst
                              ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-2xs"
                              : "bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#0052FF]"
                          }`}
                        >
                          {isPerformanceAnalyst ? (
                            <>
                              <Camera className="w-3 h-3 text-emerald-600" />
                              <span>Metrics</span>
                            </>
                          ) : (
                            <span>Inspect</span>
                          )}
                        </button>
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCreator(item.id, item.creator_name);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="Remove creator from database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isInternal ? 12 : 10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Filter className="w-7 h-7 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-700">No creators match your current filter selection</p>
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-[#0052FF] font-bold hover:underline cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {sortedAndFiltered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-500 font-medium">
              <span>
                Showing <strong className="text-slate-900 font-bold">{startIndex + 1}</strong> to{" "}
                <strong className="text-slate-900 font-bold">{endIndex}</strong> of{" "}
                <strong className="text-slate-900 font-bold">{sortedAndFiltered.length}</strong> creators
              </span>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs focus:outline-none focus:border-[#0052FF]"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>All ({sortedAndFiltered.length})</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && pageSize !== -1 && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1 px-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (safeCurrentPage <= 3) {
                      pageNum = i + 1;
                    } else if (safeCurrentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = safeCurrentPage - 2 + i;
                    }

                    const isCurrent = pageNum === safeCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer ${
                          isCurrent
                            ? "bg-[#0052FF] text-white shadow-xs"
                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* App-Style Cards View Mode (Tailored for Mobile & Touch Devices) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "cards" && (
        <div className="w-full">
        {filtered.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6 text-[#0052FF]" />
            </div>
            <p className="text-sm font-bold text-slate-800">No creators match your current filter selection</p>
            <p className="text-xs text-slate-500">Try adjusting your search query, category, or stage filter.</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {paginatedDeliverables.map((item) => {
              const internalItem = item as CreatorDeliverableInternal;
              const ms = milestonesMap.get(item.id) || calculateCreatorMilestones(item);
              const creatorProofs = proofsMap.get(item.id) || [];
              const hasLiveMetrics = (item.total_views || 0) > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedCreator(item)}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer active:scale-[0.99] relative overflow-hidden"
                >
                  {/* Top Row: Avatar, Creator Info, Execution Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052FF] to-cyan-500 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {item.creator_name ? item.creator_name.charAt(0).toUpperCase() : "C"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {item.creator_name}
                          </h4>
                          {item.profile_url && (
                            <a
                              href={item.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-[#0052FF] transition-colors shrink-0"
                              title="Open Instagram Profile"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0052FF] font-bold text-[10px] border border-blue-200/60">
                            {item.category && item.category !== "Unspecified" ? item.category : "Creator"}
                            {item.followers_count > 0 ? ` • ${formatFollowers(item.followers_count)}` : ""}
                          </span>
                          {(item.niche || item.city || (item.language && item.language.trim())) && (
                            <span className="text-slate-400 text-[10px]">
                              {[item.niche, item.city, item.language?.trim()].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {getExecutionBadge(item)}
                    </div>
                  </div>

                  {/* Campaign & Deliverables Scope Chips */}
                  <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                    {item.org_name && item.org_name !== "Unassigned" && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {item.org_name}
                      </span>
                    )}
                    {item.campaign_name && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50/70 text-blue-700 font-semibold text-[10px] border border-blue-200/50">
                        {item.campaign_name}
                      </span>
                    )}
                    {item.brand_agency_poc && 
                     item.brand_agency_poc.trim() !== "" && 
                     item.brand_agency_poc.toUpperCase() !== "N/A" && 
                     item.brand_agency_poc.toLowerCase() !== "unassigned" && 
                     item.brand_agency_poc !== "Brand Manager" && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60 flex items-center gap-1" title="Brand / Agency POC">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {item.brand_agency_poc}
                      </span>
                    )}
                    {isInternal && ((item as CreatorDeliverableInternal).execution_owner || item.xcelerate_poc) && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200/60 flex items-center gap-1" title="Execution Lead">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {(item as CreatorDeliverableInternal).execution_owner || item.xcelerate_poc}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 font-medium text-[10px] border border-slate-200/70">
                      {item.deliverables || "Standard Deliverable"}
                    </span>
                  </div>

                  {/* 4-Stage Execution Pipeline Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                    {/* Stage 1: Script */}
                    <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">1. Script</span>
                      <div>{getScriptStatusBadge(item.script_status)}</div>
                      {item.script_approval_date && (
                        <div className="text-[9px] text-slate-400">
                          {formatDateOnly(item.script_approval_date)}
                        </div>
                      )}
                      {(() => {
                        const info = getScriptLinkInfo(item.script_link);
                        if (!info) return null;
                        return (
                          <a
                            href={info.href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 text-[10px] text-[#0052FF] font-bold hover:underline"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>{info.label}</span>
                          </a>
                        );
                      })()}
                    </div>

                    {/* Stage 2: 1st Draft */}
                    <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">2. 1st Draft</span>
                      <div>{getDraftStatusBadge(item.first_draft_status)}</div>
                      {item.first_draft_date && (
                        <div className="text-[9px] text-slate-400">
                          {formatDateOnly(item.first_draft_date)}
                        </div>
                      )}
                      {item.revision_drive_link && (
                        <a
                          href={item.revision_drive_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-[10px] text-purple-600 font-bold hover:underline"
                        >
                          <FolderOpen className="w-2.5 h-2.5" />
                          <span>Revisions ↗</span>
                        </a>
                      )}
                    </div>

                    {/* Stage 3: Final Video */}
                    <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">3. Final Video</span>
                      <div>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.final_video_status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {item.final_video_status === "Approved" ? "✓ Approved" : "Pending"}
                        </span>
                      </div>
                      {item.video_approval_date && (
                        <div className="text-[9px] text-slate-400">
                          {formatDateOnly(item.video_approval_date)}
                        </div>
                      )}
                    </div>

                    {/* Stage 4: Go-Live */}
                    <div className="p-2 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#0052FF] block">4. Go-Live</span>
                      {item.live_link ? (
                        <>
                          <a
                            href={item.live_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-[#0052FF] text-white font-bold text-[10px] shadow-2xs hover:bg-blue-600 transition-colors"
                          >
                            <Video className="w-3 h-3" />
                            <span>Watch Reel ↗</span>
                          </a>
                          <div className="text-[9px] text-slate-500 font-medium">
                            Live: {formatDateOnly(item.live_date) || "Active"}
                          </div>
                        </>
                      ) : isItemDropped(item) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Dropped
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Pending Live
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Milestones & Proof Badges Row */}
                  {(ms.allMilestonesCompleted || ms.nextActionMilestone || creatorProofs.length > 0) && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      {ms.allMilestonesCompleted && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🏆 30D Milestone Complete
                        </span>
                      )}
                      {ms.hasActionRequired && ms.nextActionMilestone && (
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                          ms.nextActionMilestone.isOverdue
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : "bg-amber-50 text-amber-900 border-amber-300"
                        }`}>
                          <Zap className="w-2.5 h-2.5" />
                          <span>{ms.nextActionMilestone.tag} Overdue / Due</span>
                        </span>
                      )}
                      {!ms.allMilestonesCompleted && !ms.hasActionRequired && ms.nextActionMilestone && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          {ms.nextActionMilestone.tag} in {ms.nextActionMilestone.daysRemaining}d
                        </span>
                      )}
                      {creatorProofs.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxScreenshot({
                              urls: creatorProofs.map((p) => p.url),
                              currentIndex: 0,
                              title: `${item.creator_name} - Verified Proofs`,
                              tag: `📷 ${creatorProofs.length} Proof${creatorProofs.length > 1 ? "s" : ""}`,
                            });
                          }}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#0052FF] border border-blue-200 shadow-2xs hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3 h-3 text-[#0052FF]" />
                          <span>{creatorProofs.length} Verified Proof{creatorProofs.length > 1 ? "s" : ""}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Performance Metrics Bar (If Views Logged) */}
                  {hasLiveMetrics && (
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-gradient-to-r from-blue-50/50 to-emerald-50/40 border border-blue-100 text-center">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total Views</span>
                        <span className="text-xs font-black text-slate-900">{formatFollowers(item.total_views)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Engagement</span>
                        <span className="text-xs font-black text-emerald-700">{item.engagement_rate}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Reach</span>
                        <span className="text-xs font-black text-[#0052FF]">{formatFollowers(item.account_reach || 0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Footer Action Strip */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isInternal 
                        ? (isItemDropped(item) ? "Gross Margin: ₹0 (Dropped)" : `Gross Margin: ${formatCurrency(internalItem.gross_margin || 0)}`)
                        : isPerformanceAnalyst 
                        ? `Performance: ${formatNumber(item.total_views || 0)} Views • ${item.engagement_rate || 0}% ER`
                        : (isItemDropped(item) ? "Budget: ₹0 (Dropped)" : `Budget: ${formatCurrency(item.brand_cost || 0)}`)
                      }
                    </span>
                    <div className="flex items-center space-x-1 text-[#0052FF] font-bold text-xs">
                      <span>View Full Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Cards View Pagination Controls */}
            {sortedAndFiltered.length > 0 && (
              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-slate-500 font-medium">
                  <span>
                    Showing <strong className="text-slate-900 font-bold">{startIndex + 1}</strong> to{" "}
                    <strong className="text-slate-900 font-bold">{endIndex}</strong> of{" "}
                    <strong className="text-slate-900 font-bold">{sortedAndFiltered.length}</strong>
                  </span>
                </div>

                {totalPages > 1 && pageSize !== -1 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={safeCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="px-2 text-xs font-bold text-slate-800">
                      Page {safeCurrentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={safeCurrentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {/* Stage Progression Funnel / Kanban View */}
      {viewMode === "kanban" && (
        <div className="w-full">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-2xl glass-panel-light border border-slate-200/90 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052FF] flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6 text-[#0052FF]" />
            </div>
            <p className="text-sm font-bold text-slate-800">No creators match your current filter selection</p>
            <p className="text-xs text-slate-500">Try adjusting your search query, category, or stage filter.</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
        <div className="space-y-2.5">
          {/* Mobile Stage Progression Quick Carousel / Tab Selector */}
          <div className="md:hidden space-y-1.5 mb-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
              <span className="flex items-center space-x-1">
                <Kanban className="w-3 h-3 text-[#0052FF]" />
                <span>Stage Progression ({deliverables.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">Swipe or tap tab</span>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => {
                  document.getElementById("kanban-column-1")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center space-x-1.5 shrink-0 shadow-2xs hover:border-blue-300 cursor-pointer active:scale-95 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span>1. Scripting</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">{column1Items.length}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById("kanban-column-2")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center space-x-1.5 shrink-0 shadow-2xs hover:border-purple-300 cursor-pointer active:scale-95 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                <span>2. Drafts</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">{column2Items.length}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById("kanban-column-3")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center space-x-1.5 shrink-0 shadow-2xs hover:border-emerald-300 cursor-pointer active:scale-95 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>3. Approved</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">{column3Items.length}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById("kanban-column-4")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-all border ${
                  column4Items.length > 0
                    ? "bg-blue-50 border-blue-200 text-[#0052FF]"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                <span className="live-indicator-dot shrink-0"></span>
                <span>4. Live &amp; Stats</span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                  column4Items.length > 0 ? "bg-blue-100 text-[#0052FF]" : "bg-slate-100 text-slate-700"
                }`}>{column4Items.length}</span>
              </button>

              {column5Items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("kanban-column-5")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center space-x-1.5 shrink-0 shadow-2xs hover:border-rose-300 cursor-pointer active:scale-95 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                  <span>5. Dropped</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-mono text-[10px] font-bold">{column5Items.length}</span>
                </button>
              )}
            </div>
          </div>

          <div className={`flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-3 sm:gap-3.5 pb-3 md:pb-0 no-scrollbar md:grid-cols-2 lg:grid-cols-3 ${column5Items.length > 0 ? "xl:grid-cols-5" : "xl:grid-cols-4"} items-start`}>
            
            {/* Column 1: Onboarding & Scripting */}
            <div id="kanban-column-1" className="flex flex-col bg-slate-100/70 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 w-[86vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs mb-2 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">1. Scripting Stage</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {column1Items.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px] md:min-h-[460px] pr-1">
                {column1Items.length > 0 ? (
                  column1Items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedCreator(item)}
                      className="p-3 rounded-2xl glass-panel-light glass-panel-light-hover cursor-pointer"
                    >
                      {/* Brand & Campaign Pill */}
                      {(item.org_name || item.campaign_name) && (
                        <div className="flex items-center space-x-1 text-[9px] font-semibold mb-1 truncate">
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#0052FF] border border-blue-200/60 font-bold truncate max-w-[85px]">
                            {(item.org_name && item.org_name !== "Unassigned") ? item.org_name : (item.campaign_name || "Brand")}
                          </span>
                          {item.campaign_name && item.org_name && item.org_name !== "Unassigned" && (
                            <span className="text-slate-400 truncate max-w-[95px]" title={item.campaign_name}>
                              • {item.campaign_name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-slate-900 truncate" title={item.creator_name}>{item.creator_name}</span>
                        {item.category && item.category !== "Unspecified" && item.followers_count > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 text-[#0052FF] font-black shrink-0">{item.category}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {item.niche || "General"} {item.followers_count > 0 ? `• ${formatFollowers(item.followers_count)}` : ""}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {getScriptStatusBadge(item.script_status)}
                        {(() => {
                          const info = getScriptLinkInfo(item.script_link);
                          if (!info) return null;
                          return (
                            <a 
                              href={info.href}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[11px] text-[#0052FF] font-semibold hover:underline flex items-center space-x-1 shrink-0"
                            >
                              <FileText className="w-3 h-3" />
                              <span>{info.label.replace(" ↗", "")}</span>
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-medium">
                    No creators matching filters
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Video 1st Draft & Revisions */}
            <div id="kanban-column-2" className="flex flex-col bg-slate-100/70 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 w-[86vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs mb-2 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">2. Draft &amp; Reshoot</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {column2Items.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px] md:min-h-[460px] pr-1">
                {column2Items.length > 0 ? (
                  column2Items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedCreator(item)}
                      className="p-3 rounded-2xl glass-panel-light glass-panel-light-hover cursor-pointer"
                    >
                      {/* Brand & Campaign Pill */}
                      {(item.org_name || item.campaign_name) && (
                        <div className="flex items-center space-x-1 text-[9px] font-semibold mb-1 truncate">
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#0052FF] border border-blue-200/60 font-bold truncate max-w-[85px]">
                            {(item.org_name && item.org_name !== "Unassigned") ? item.org_name : (item.campaign_name || "Brand")}
                          </span>
                          {item.campaign_name && item.org_name && item.org_name !== "Unassigned" && (
                            <span className="text-slate-400 truncate max-w-[95px]" title={item.campaign_name}>
                              • {item.campaign_name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-slate-900 truncate" title={item.creator_name}>{item.creator_name}</span>
                        {item.category && item.category !== "Unspecified" && item.followers_count > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 text-[#0052FF] font-black shrink-0">{item.category}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {item.niche || "General"} {item.followers_count > 0 ? `• ${formatFollowers(item.followers_count)}` : ""}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {getDraftStatusBadge(item.first_draft_status)}
                        {item.revision_drive_link && (
                          <a 
                            href={item.revision_drive_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[11px] text-purple-600 font-semibold hover:underline flex items-center space-x-1 shrink-0"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Revisions</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-medium">
                    No creators matching filters
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Final Video Approved */}
            <div id="kanban-column-3" className="flex flex-col bg-slate-100/70 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 w-[86vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs mb-2 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">3. Video Approved</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {column3Items.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px] md:min-h-[460px] pr-1">
                {column3Items.length > 0 ? (
                  column3Items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedCreator(item)}
                      className="p-3 rounded-2xl glass-panel-light glass-panel-light-hover cursor-pointer"
                    >
                      {/* Brand & Campaign Pill */}
                      {(item.org_name || item.campaign_name) && (
                        <div className="flex items-center space-x-1 text-[9px] font-semibold mb-1 truncate">
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#0052FF] border border-blue-200/60 font-bold truncate max-w-[85px]">
                            {(item.org_name && item.org_name !== "Unassigned") ? item.org_name : (item.campaign_name || "Brand")}
                          </span>
                          {item.campaign_name && item.org_name && item.org_name !== "Unassigned" && (
                            <span className="text-slate-400 truncate max-w-[95px]" title={item.campaign_name}>
                              • {item.campaign_name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-slate-900 truncate" title={item.creator_name}>{item.creator_name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0">Approved</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{item.deliverables}</div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-[11px] text-emerald-700 font-bold truncate">Ready For Live</span>
                        <span className="text-[9px] text-slate-400 shrink-0">{formatDateOnly(item.video_approval_date)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-medium">
                    No creators matching filters
                  </div>
                )}
              </div>
            </div>

            {/* Column 4: Live Content & Analytics */}
            <div id="kanban-column-4" className="flex flex-col bg-slate-100/70 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 w-[86vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs mb-2 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="live-indicator-dot"></span>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">4. Live &amp; Analytics</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0052FF] font-mono">
                  {column4Items.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px] md:min-h-[460px] pr-1">
                {column4Items.length > 0 ? (
                  column4Items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedCreator(item)}
                      className="p-3 rounded-2xl glass-panel-light glass-panel-light-hover cursor-pointer border-blue-200 bg-blue-50/20"
                    >
                      {/* Brand & Campaign Pill */}
                      {(item.org_name || item.campaign_name) && (
                        <div className="flex items-center space-x-1 text-[9px] font-semibold mb-1 truncate">
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#0052FF] border border-blue-200/60 font-bold truncate max-w-[85px]">
                            {(item.org_name && item.org_name !== "Unassigned") ? item.org_name : (item.campaign_name || "Brand")}
                          </span>
                          {item.campaign_name && item.org_name && item.org_name !== "Unassigned" && (
                            <span className="text-slate-400 truncate max-w-[95px]" title={item.campaign_name}>
                              • {item.campaign_name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-slate-900 truncate" title={item.creator_name}>{item.creator_name}</span>
                        <span className="text-[9px] px-2 py-0.2 rounded-full bg-blue-100 text-[#0052FF] font-black flex items-center space-x-1 shrink-0">
                          <span className="live-indicator-dot"></span>
                          <span>LIVE</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between font-semibold">
                        <span className="truncate">{item.total_views > 0 ? `${(item.total_views / 1000).toFixed(0)}K Views` : "Collecting stats"}</span>
                        <span className="text-emerald-700 font-extrabold shrink-0">{item.engagement_rate}% ER</span>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-blue-100 flex items-center justify-between gap-1 text-[11px]">
                        <a 
                          href={item.live_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] text-[#0052FF] font-bold hover:underline flex items-center space-x-1 shrink-0"
                        >
                          <Video className="w-3 h-3" />
                          <span>Watch Reel</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="text-[9px] text-slate-400">Live: {formatDateOnly(item.live_date)}</span>
                          {(() => {
                            const creatorProofs = getCreatorProofScreenshots(item);
                            if (creatorProofs.length === 0) return null;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxScreenshot({
                                    urls: creatorProofs.map(p => p.url),
                                    currentIndex: 0,
                                    title: `${item.creator_name} - Verified Proofs`,
                                    tag: `📷 ${creatorProofs.length} Proof${creatorProofs.length > 1 ? "s" : ""}`
                                  });
                                }}
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-[#0052FF] border border-blue-200 cursor-pointer shadow-2xs transition-colors"
                                title="Click to view verified screenshot proofs"
                              >
                                <Camera className="w-2.5 h-2.5" />
                                <span>{creatorProofs.length}</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Milestone Tracking Badge on Kanban Card */}
                      {(() => {
                        const ms = calculateCreatorMilestones(item);
                        if (ms.allMilestonesCompleted) {
                          return (
                            <div className="mt-1.5 flex items-center justify-between px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              <span>🏆 All Done</span>
                              <span className="text-[9px] font-mono font-medium">Day {ms.daysSinceLive}</span>
                            </div>
                          );
                        }
                        if (ms.hasActionRequired && ms.nextActionMilestone) {
                          return (
                            <div className={`mt-1.5 flex items-center justify-between px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              ms.nextActionMilestone.isOverdue
                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                : "bg-amber-50 text-amber-900 border-amber-300"
                            }`}>
                              <span className="flex items-center space-x-1 truncate pr-1">
                                <Zap className="w-3 h-3 shrink-0" />
                                <span className="truncate">{ms.nextActionMilestone.shortLabel} {ms.nextActionMilestone.isOverdue ? `(${Math.abs(ms.nextActionMilestone.daysRemaining)}d ago)` : "Due Today"}</span>
                              </span>
                              <span className="text-[9px] font-medium font-mono shrink-0">{ms.nextActionMilestone.formattedTargetDate}</span>
                            </div>
                          );
                        }
                        if (ms.nextActionMilestone) {
                          return (
                            <div className="mt-1.5 flex items-center justify-between px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-semibold border border-slate-200">
                              <span className="truncate pr-1">{ms.nextActionMilestone.shortLabel} in {ms.nextActionMilestone.daysRemaining}d</span>
                              <span className="text-[9px] font-medium font-mono shrink-0">{ms.nextActionMilestone.formattedTargetDate}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-medium">
                    No creators matching filters
                  </div>
                )}
              </div>
            </div>

            {/* Column 5: Dropped / Withdrawn Creators (Displayed conditionally) */}
            {column5Items.length > 0 && (
              <div id="kanban-column-5" className="flex flex-col bg-slate-100/70 p-2 sm:p-2.5 rounded-2xl border border-rose-200/80 w-[86vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none">
                <div className="p-3 rounded-xl bg-white border border-rose-200 flex items-center justify-between shadow-xs mb-2 shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-black text-rose-900 uppercase tracking-wider">5. Dropped</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-mono">
                    {column5Items.length}
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px] md:min-h-[460px] pr-1">
                  {column5Items.map(item => {
                    const dropStageText = 
                      item.confirmation_mail_status === "Drop" ? "Dropped at Confirmation" :
                      item.script_status === "Drop" ? "Dropped at Script" :
                      item.first_draft_status === "Drop" ? "Dropped at 1st Draft" :
                      item.final_video_status === "Drop" ? "Dropped at Final Video" :
                      "Dropped Mid-Pipeline";

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedCreator(item)}
                        className="p-3 rounded-2xl glass-panel-light glass-panel-light-hover cursor-pointer border-rose-200/90 bg-rose-50/20"
                      >
                        {/* Brand & Campaign Pill */}
                        {(item.org_name || item.campaign_name) && (
                          <div className="flex items-center space-x-1 text-[9px] font-semibold mb-1 truncate">
                            <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200/60 font-bold truncate max-w-[85px]">
                              {(item.org_name && item.org_name !== "Unassigned") ? item.org_name : (item.campaign_name || "Brand")}
                            </span>
                            {item.campaign_name && item.org_name && item.org_name !== "Unassigned" && (
                              <span className="text-slate-500 truncate max-w-[95px]" title={item.campaign_name}>
                                • {item.campaign_name}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-xs text-slate-800 line-through decoration-rose-400 truncate pr-1">{item.creator_name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">
                            Dropped
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                          {item.niche || "General"} {item.followers_count > 0 ? `• ${formatFollowers(item.followers_count)}` : ""}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-rose-100/80 flex items-center justify-between text-[11px]">
                          <span className="text-[10px] font-semibold text-rose-700 flex items-center space-x-1 truncate">
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{dropStageText}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
           CREATOR DEEP DIVE MODAL / INSPECTION DIALOG (WORLD-CLASS CLEAN UI)
           ═══════════════════════════════════════════════════════════ */}
      {selectedCreator && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setSelectedCreator(null)}
        >
          <div 
            className="w-full max-w-2xl lg:max-w-3xl rounded-3xl bg-white border border-slate-200/90 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* ── Modal Header: Systematic, Crisp & High Prestige ── */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white shrink-0 gap-3">
              <div className="flex items-start space-x-3 sm:space-x-3.5 min-w-0">
                {/* Gradient Avatar with Glow */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#0052FF] via-[#0066FF] to-[#00C2FF] text-white font-black flex items-center justify-center text-lg sm:text-xl shadow-md shadow-blue-500/20 shrink-0 border border-white/20">
                  {selectedCreator.creator_name ? selectedCreator.creator_name.charAt(0).toUpperCase() : "C"}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  {/* Creator Name & Tier Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                      {selectedCreator.creator_name}
                    </h3>
                    {selectedCreator.category && selectedCreator.category !== "Unspecified" ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider shrink-0">
                        {selectedCreator.category}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0052FF] border border-blue-200 tracking-wide shrink-0">
                        Verified Creator
                      </span>
                    )}
                    {selectedCreator.followers_count > 0 && (
                      <span className="text-xs font-bold text-slate-500 shrink-0">
                        {formatFollowers(selectedCreator.followers_count)} Followers
                      </span>
                    )}
                  </div>

                  {/* Brand & Campaign Context Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#0052FF] text-[11px] font-bold border border-blue-200/80">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[130px]">
                        {(selectedCreator.org_name && selectedCreator.org_name !== "Unassigned")
                          ? selectedCreator.org_name
                          : (selectedCreator.campaign_name || "Brand Partner")}
                      </span>
                      {selectedCreator.client_type && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 uppercase ml-0.5 font-bold">
                          {selectedCreator.client_type}
                        </span>
                      )}
                    </span>

                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                      <FolderOpen className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[160px] sm:max-w-none">{selectedCreator.campaign_name || "Consolidated Campaign"}</span>
                      {selectedCreator.campaign_month && (
                        <span className="text-slate-400 font-normal">
                          • {selectedCreator.campaign_month}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Meta Strip (Clean without empty parentheses or trailing dots) */}
                  <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-2 flex-wrap">
                    {selectedCreator.niche && <span>{selectedCreator.niche}</span>}
                    {selectedCreator.niche && (selectedCreator.city || (selectedCreator.language && selectedCreator.language.trim())) && <span>•</span>}
                    <span>{selectedCreator.city || "Pan-India"}</span>
                    {selectedCreator.language && selectedCreator.language.trim() && (
                      <span>({selectedCreator.language.trim()})</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedCreator(null)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-bold transition-all flex items-center justify-center cursor-pointer shrink-0 mt-0.5"
                title="Close Inspector"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>

            {/* ── Scrollable Modal Body ── */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1 custom-modal-scroll">

              {/* Dropped Creator Alert Banner */}
              {isItemDropped(selectedCreator) && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900 shadow-2xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-extrabold text-rose-900">Creator Status: Dropped / Cancelled</span>
                    <p className="text-rose-700 text-[11px] leading-relaxed">
                      This creator was marked as dropped between execution stages. Their commercial allocation has been released from active spend.
                    </p>
                  </div>
                </div>
              )}

              {/* ── 1. Systematic Stage Progress Stepper (2x2 on Mobile, 4-in-line on Desktop) ── */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#0052FF]" />
                    <span>Execution Stage Timeline</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">4-Stage Pipeline Verification</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  {/* Stage 1 */}
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    selectedCreator.confirmation_mail_status === "Drop"
                      ? "bg-rose-50/90 border-rose-200 text-rose-800"
                      : "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                  }`}>
                    <div className="text-[9px] uppercase font-extrabold tracking-wider opacity-70">1. Brief</div>
                    <div className="text-xs font-black mt-0.5 truncate">
                      {selectedCreator.confirmation_mail_status === "Drop" ? "Dropped" : "Mail Sent"}
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    selectedCreator.script_status === "Drop"
                      ? "bg-rose-50/90 border-rose-200 text-rose-800"
                      : selectedCreator.script_status === "Approved"
                      ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                      : "bg-amber-50/90 border-amber-200 text-amber-800"
                  }`}>
                    <div className="text-[9px] uppercase font-extrabold tracking-wider opacity-70">2. Script</div>
                    <div className="text-xs font-black mt-0.5 truncate">
                      {selectedCreator.script_status || "Pending"}
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    selectedCreator.first_draft_status === "Drop"
                      ? "bg-rose-50/90 border-rose-200 text-rose-800"
                      : selectedCreator.final_video_status === "Approved"
                      ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                      : "bg-purple-50/90 border-purple-200 text-purple-800"
                  }`}>
                    <div className="text-[9px] uppercase font-extrabold tracking-wider opacity-70">3. 1st Draft</div>
                    <div className="text-xs font-black mt-0.5 truncate">
                      {selectedCreator.first_draft_status || "Pending"}
                    </div>
                  </div>

                  {/* Stage 4 */}
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    isItemDropped(selectedCreator)
                      ? "bg-rose-50/90 border-rose-200 text-rose-800"
                      : selectedCreator.live_link
                      ? "bg-blue-50/90 border-blue-200 text-[#0052FF]"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}>
                    <div className="text-[9px] uppercase font-extrabold tracking-wider opacity-70">4. Go-Live</div>
                    <div className="text-xs font-black mt-0.5 truncate">
                      {isItemDropped(selectedCreator) ? "Dropped" : selectedCreator.live_link ? "Live Reel" : "Pending"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. Deliverables Scope & Content Strategy ── */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Package className="w-4 h-4 text-[#0052FF]" />
                    <span>Deliverable Scope &amp; Content Strategy</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedCreator.product_status || "Deliverable Confirmed"}
                  </span>
                </div>

                {/* 2-Column Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <Video className="w-3 h-3 text-[#0052FF]" />
                      <span>Deliverables Format</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-1 leading-snug break-words">
                      {selectedCreator.deliverables || "1 Dedicated Reel + 2 Stories with Link"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Creator Niche &amp; Tier</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-1 flex items-center space-x-1.5">
                      <span>{selectedCreator.niche || "General"}</span>
                      <span>•</span>
                      <span>{selectedCreator.category || "Creator"}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <Building2 className="w-3 h-3 text-[#0052FF]" />
                      <span>Brand / Agency Partner</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-1">
                      {(selectedCreator.org_name && selectedCreator.org_name !== "Unassigned") 
                        ? selectedCreator.org_name 
                        : (selectedCreator.campaign_name || "Direct Client")}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <FolderOpen className="w-3 h-3 text-slate-500" />
                      <span>Campaign Context</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-1 truncate">
                      {selectedCreator.campaign_name || "Consolidated Campaign"}
                      {selectedCreator.campaign_month && (
                        <span className="text-slate-500 font-semibold ml-1">
                          ({selectedCreator.campaign_month})
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedCreator.brand_agency_poc && 
                   selectedCreator.brand_agency_poc.trim() !== "" && 
                   selectedCreator.brand_agency_poc.toUpperCase() !== "N/A" && 
                   selectedCreator.brand_agency_poc.toLowerCase() !== "unassigned" && 
                   selectedCreator.brand_agency_poc !== "Brand Manager" && (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center space-x-1">
                        <Users className="w-3 h-3 text-emerald-600" />
                        <span>Brand / Agency POC</span>
                      </div>
                      <div className="font-extrabold text-emerald-900 mt-1 flex items-center space-x-1.5">
                        <span>{selectedCreator.brand_agency_poc}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                          Client Lead
                        </span>
                      </div>
                    </div>
                  )}

                  {(((selectedCreator as any).execution_owner) || selectedCreator.xcelerate_poc) && (
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                      <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center space-x-1">
                        <UserCheck className="w-3 h-3 text-amber-600" />
                        <span>Xcelerate Execution Lead</span>
                      </div>
                      <div className="font-extrabold text-amber-900 mt-1 flex items-center space-x-1.5">
                        <span>{(selectedCreator as any).execution_owner || selectedCreator.xcelerate_poc}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold uppercase">
                          Agency Lead
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Milestone Approval Dates Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold">Script Approved</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5 truncate">
                      {formatDateOnly(selectedCreator.script_approval_date) || "Pending"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold">1st Draft Approved</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5 truncate">
                      {formatDateOnly(selectedCreator.first_draft_date) || "Pending"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-semibold">Live Date</div>
                    <div className="text-xs font-black text-[#0052FF] mt-0.5 truncate">
                      {formatDateOnly(selectedCreator.live_date) || "Awaiting Live"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 3. Performance Spotlight ── */}
              {selectedCreator.total_views > 0 ? (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-blue-50/20 to-white border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      <Flame className="w-4 h-4 text-emerald-600" />
                      <span>Live Engagement &amp; Performance</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                      Live Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Views</div>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        {formatFollowers(selectedCreator.total_views)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engagement Rate</div>
                      <div className="text-sm font-black text-emerald-700 mt-0.5">
                        {selectedCreator.engagement_rate}%
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reactions</div>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        {formatFollowers((selectedCreator.likes || 0) + (selectedCreator.comments || 0) + (selectedCreator.saves || 0) + (selectedCreator.shares || 0))}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Reach</div>
                      <div className="text-sm font-black text-[#0052FF] mt-0.5">
                        {formatFollowers(selectedCreator.account_reach || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 via-slate-50 to-white border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>Performance Metrics &amp; Milestone Data</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                      Awaiting Metrics
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Official reel views, reach, reactions, and milestone snapshot proofs have not been logged for this creator yet.
                  </p>
                </div>
              )}

              {/* ── 4. Verified Screenshot Proofs (Clean Robust Gallery) ── */}
              {(() => {
                const creatorProofs = getCreatorProofScreenshots(selectedCreator);
                if (creatorProofs.length > 0) {
                  return (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                          <Camera className="w-4 h-4 text-[#0052FF]" />
                          <span>Verified Screenshot Proofs ({creatorProofs.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                          Tap thumbnail to inspect full resolution
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {creatorProofs.map((proof, idx) => (
                          <div
                            key={idx}
                            onClick={() => setLightboxScreenshot({
                              urls: creatorProofs.map(p => p.url),
                              currentIndex: idx,
                              title: proof.title,
                              tag: proof.badge
                            })}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer aspect-video shadow-2xs hover:border-[#0052FF] transition-all flex flex-col justify-between"
                          >
                            <img
                              src={proof.url}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                            {/* Sleek Fallback Card if Drive/Thumbnail doesn't load */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-[#00C2FF] flex items-center justify-center mb-1">
                                <Camera className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-200 truncate max-w-full">{proof.badge}</span>
                              <span className="text-[9px] text-blue-400 mt-0.5 flex items-center space-x-0.5">
                                <Eye className="w-2.5 h-2.5" />
                                <span>Inspect Proof</span>
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2 pointer-events-none">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white border border-white/10">
                                {proof.badge}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-slate-500 font-medium">
                      <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>No verified insight screenshots attached yet.</span>
                    </div>
                    {canEditMetrics && (
                      <span className="text-[11px] font-bold text-[#0052FF] shrink-0">
                        Upload below ↓
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* ── 5. Performance Metrics Editor (Internal Roles) ── */}
              {canEditMetrics && (
                <PerformanceMetricsEditor
                  creator={selectedCreator as CreatorDeliverableInternal}
                  onSaved={(updatedCreator) => {
                    setSelectedCreator(updatedCreator);
                    if (onDeliverableUpdated) onDeliverableUpdated();
                  }}
                  isReadOnly={false}
                />
              )}

              {/* ── 6. Internal Ops Stage Controls (Xcelerate Team Only) ── */}
              {canEditStages && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white border border-indigo-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#0052FF]" />
                      <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        Internal Ops Stage Controls
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                      Admin Override
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Manually advance creator execution stage and trigger status cascades directly.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      disabled={isAutomating}
                      onClick={() => handleQuickCascade({ script_status: "Approved" })}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-800 hover:text-emerald-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      ✓ Mark Script Approved
                    </button>

                    <button
                      disabled={isAutomating}
                      onClick={() => handleQuickCascade({ first_draft_status: "Approved" })}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-xs font-bold text-slate-800 hover:text-purple-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      ✓ Mark 1st Draft Approved
                    </button>

                    <button
                      disabled={isAutomating}
                      onClick={() => handleQuickCascade({ 
                        live_link: selectedCreator.live_link || "https://instagram.com/reel/live-content-sample",
                        execution_status: "Completed" 
                      })}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-800 hover:text-[#0052FF] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      🚀 Set Live (Complete)
                    </button>

                    <button
                      disabled={isAutomating}
                      onClick={() => handleQuickCascade({ first_draft_status: "Sent For Revision/Reshoot" })}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-xs font-bold text-slate-800 hover:text-amber-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      ↺ Request Revision
                    </button>
                  </div>

                  {automationLogs.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-100/60 border border-blue-200 text-[11px] text-slate-800 space-y-1 animate-in fade-in">
                      <div className="font-extrabold text-[#0052FF] flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Stage Cascade Applied to Database:</span>
                      </div>
                      <ul className="list-disc list-inside text-slate-700 pl-1 font-medium space-y-0.5">
                        {automationLogs.map((log, i) => (
                          <li key={i}>{log}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ── 7. Asset Links Grid ── */}
              {role === "PERFORMANCE_ANALYST" ? (
                selectedCreator.live_link ? (
                  <a
                    href={selectedCreator.live_link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 hover:border-[#0052FF] text-left transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-[#0052FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 group-hover:text-[#0052FF] transition-colors flex items-center space-x-1">
                          <span>View Live Post on Instagram</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">Tap to open Reel, check verified views, and copy insights</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#0052FF] bg-white px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs shrink-0 hidden sm:inline">
                      Open Reel ↗
                    </span>
                  </a>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs flex items-center space-x-2">
                    <Video className="w-4 h-4 text-slate-300" />
                    <span>Awaiting Go-Live Reel URL from Creator</span>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {selectedCreator.script_link ? (
                    <a
                      href={selectedCreator.script_link.startsWith("http") ? selectedCreator.script_link : `https://${selectedCreator.script_link}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all block shadow-xs"
                    >
                      <div className="text-slate-500 text-xs flex items-center justify-between font-semibold">
                        <span>Script Document / Asset</span>
                        <ExternalLink className="w-3 h-3 text-[#0052FF]" />
                      </div>
                      <div className="text-[#0052FF] text-xs font-extrabold mt-1 flex items-center space-x-1.5">
                        <FileText className="w-4 h-4" />
                        <span>{getScriptLinkInfo(selectedCreator.script_link)?.label || "Open Document ↗"}</span>
                      </div>
                    </a>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                      Script link not attached
                    </div>
                  )}

                  {selectedCreator.revision_drive_link ? (
                    <a
                      href={selectedCreator.revision_drive_link}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition-all block shadow-xs"
                    >
                      <div className="text-slate-500 text-xs flex items-center justify-between font-semibold">
                        <span>Drafts &amp; Revisions</span>
                        <ExternalLink className="w-3 h-3 text-purple-600" />
                      </div>
                      <div className="text-purple-700 text-xs font-extrabold mt-1 flex items-center space-x-1.5">
                        <FolderOpen className="w-4 h-4" />
                        <span>Open Drive Folder</span>
                      </div>
                    </a>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                      Revision link not attached
                    </div>
                  )}

                  {selectedCreator.live_link ? (
                    <a
                      href={selectedCreator.live_link}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 hover:border-blue-400 text-left transition-all block shadow-xs"
                    >
                      <div className="text-slate-500 text-xs flex items-center justify-between font-semibold">
                        <span>Live Post</span>
                        <ExternalLink className="w-3 h-3 text-[#0052FF]" />
                      </div>
                      <div className="text-[#0052FF] text-xs font-extrabold mt-1 flex items-center space-x-1.5">
                        <Video className="w-4 h-4" />
                        <span>View Live Content</span>
                      </div>
                    </a>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                      Awaiting Go-Live
                    </div>
                  )}
                </div>
              )}

              {/* ── 8. Confidential Agency Section (Internal Ops Only) ── */}
              {isAdmin && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black text-[#0052FF] uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confidential Agency Commercials (Hidden From Brand)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                    <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 shadow-2xs">
                      <span className="text-slate-500 font-semibold text-[10px] uppercase">Creator Cost:</span>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {isItemDropped(selectedCreator) ? (
                          <span className="text-slate-400 line-through">₹0 (Dropped)</span>
                        ) : (
                          formatCurrency((selectedCreator as CreatorDeliverableInternal).creator_cost || 0)
                        )}
                      </p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 shadow-2xs">
                      <span className="text-slate-500 font-semibold text-[10px] uppercase">Gross Margin:</span>
                      <p className="text-sm font-extrabold text-[#0052FF] mt-0.5">
                        {isItemDropped(selectedCreator) ? (
                          <span className="text-slate-400 line-through">₹0 (Dropped)</span>
                        ) : (
                          formatCurrency((selectedCreator as CreatorDeliverableInternal).gross_margin || 0)
                        )}
                      </p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 shadow-2xs">
                      <span className="text-slate-500 font-semibold text-[10px] uppercase">Phone:</span>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-[#0052FF]" />
                        <span>{(selectedCreator as CreatorDeliverableInternal).phone_number || "Not on file"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 9. Employee Execution & Invoicing Telemetry (Modern Enterprise Card) ── */}
              {isAdmin && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                      <FileSpreadsheet className="w-4 h-4 text-[#0052FF]" />
                      <span>Employee Execution &amp; Invoicing Telemetry</span>
                    </div>
                    {(selectedCreator as CreatorDeliverableInternal).source_sheet && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100/70 text-[#0052FF] font-bold">
                        {(selectedCreator as CreatorDeliverableInternal).source_sheet}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-0.5">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Execution Owner</div>
                      <div className="text-xs font-black text-slate-900 mt-0.5 truncate">
                        {(selectedCreator as CreatorDeliverableInternal).execution_owner || "Unassigned"}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brief Name</div>
                      <div className="text-xs font-black text-slate-900 mt-0.5 truncate" title={(selectedCreator as CreatorDeliverableInternal).brief_name}>
                        {(selectedCreator as CreatorDeliverableInternal).brief_name || "N/A"}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creator Pay Cycle</div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {(selectedCreator as CreatorDeliverableInternal).creator_payment_cycle ? `${(selectedCreator as CreatorDeliverableInternal).creator_payment_cycle} Days` : "Net 30"}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Status</div>
                      <div className="text-xs font-black text-emerald-700 mt-0.5">
                        {(selectedCreator as CreatorDeliverableInternal).invoice_status || "Pending"}
                      </div>
                    </div>
                  </div>

                  {/* Invoicing details & links */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(selectedCreator as CreatorDeliverableInternal).invoice_direct_link && (
                        <a
                          href={(selectedCreator as CreatorDeliverableInternal).invoice_direct_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold transition-all shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#0052FF]" />
                          <span>Open Invoice Form</span>
                        </a>
                      )}

                      {(selectedCreator as CreatorDeliverableInternal).invoice_pdf_link && (
                        <a
                          href={(selectedCreator as CreatorDeliverableInternal).invoice_pdf_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold transition-all shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0052FF]" />
                          <span>Invoice PDF</span>
                        </a>
                      )}
                    </div>

                    {(selectedCreator as CreatorDeliverableInternal).unique_id && (
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200/80">
                        ID: {(selectedCreator as CreatorDeliverableInternal).unique_id}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── 10. Logistics & Address ── */}
              {role !== "PERFORMANCE_ANALYST" && selectedCreator.address && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1 text-xs">
                  <div className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0052FF]" />
                    <span>Product Gifting &amp; Shipping Logistics:</span>
                  </div>
                  <p className="text-slate-600 pl-5 font-medium leading-relaxed">
                    {selectedCreator.address}
                  </p>
                </div>
              )}

              {/* ── 11. Assigned Campaign POCs ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xcelerate Operations Lead</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{xceleratePoc}</div>
                  <div className="text-[10px] text-[#0052FF] font-semibold mt-0.5">Campaign Execution &amp; Creator Management</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Brand Partner</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{displayBrandPoc}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {hasBrandPoc ? "External Direct Comms & Approvals" : "No Brand Contact Assigned"}
                  </div>
                </div>
              </div>

            </div>

            {/* ── Modal Footer: Responsive, Spacious, Never Clips Buttons ── */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium justify-between sm:justify-start">
                <span className="font-semibold text-slate-600">Execution Status:</span>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0052FF] border border-blue-200 font-black text-xs">
                  {selectedCreator.execution_status}
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                {canDelete && (
                  <button
                    onClick={() => {
                      const id = selectedCreator.id;
                      const name = selectedCreator.creator_name;
                      handleDeleteCreator(id, name);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs shrink-0"
                    title="Permanently remove creator from database"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCreator(null)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all cursor-pointer shadow-xs text-center"
                >
                  Close Inspector
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Lightbox Modal for Screenshots ── */}
      <ScreenshotLightboxModal 
        state={lightboxScreenshot} 
        onClose={() => setLightboxScreenshot(null)} 
      />

    </div>
  );
});
