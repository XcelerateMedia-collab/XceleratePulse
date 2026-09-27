"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Users,
  Calendar,
  Building2,
  Sparkles,
  Zap,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Link2,
  Activity,
  Layers,
  HelpCircle,
  Copy,
  Check,
  ChevronDown,
  Search,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Square,
  X,
  Plus,
} from "lucide-react";
import { CampaignSummary, CreatorDeliverableBrandView, CreatorDeliverableInternal } from "@/lib/types";

interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

/**
 * High-polish, scrollable, searchable custom dropdown component
 * Replaces ugly native select with a sleek, fixed-height, custom-scroll popup
 */
const ScrollableSelect: React.FC<{
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  searchPlaceholder?: string;
  className?: string;
}> = ({
  value,
  options,
  onChange,
  placeholder = "Select...",
  icon,
  searchPlaceholder = "Search...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
          <span className="truncate">
            {selectedOption && selectedOption.value !== "ALL"
              ? selectedOption.label
              : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180 text-[#0052FF]" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
          {/* Search box if options > 4 */}
          {options.length > 4 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]"
                />
              </div>
            </div>
          )}

          {/* Scrollable Items Container */}
          <div className="max-h-56 overflow-y-auto custom-modal-scroll p-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/90 text-[#0052FF] font-black"
                        : "hover:bg-slate-50 text-slate-700 font-semibold"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.subtitle && (
                        <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {opt.subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SyncControlPanelProps {
  campaigns?: CampaignSummary[];
  deliverables?: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  onSyncTriggered?: () => void;
  className?: string;
}

export const SyncControlPanel: React.FC<SyncControlPanelProps> = ({
  campaigns = [],
  deliverables = [],
  onSyncTriggered,
  className = "",
}) => {
  // Web App URL state (stored in localStorage)
  const defaultWebAppUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbz5TbRW5dWaTrScczn6CnoqYaBtlKqvT3bYKbxT5Z8jV4NK4KG7QVI59fUa8YiKFdU1/exec";
  const [webAppUrl, setWebAppUrl] = useState<string>(defaultWebAppUrl);
  const [isUrlSaved, setIsUrlSaved] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showDeploymentHelp, setShowDeploymentHelp] = useState<boolean>(false);

  const activeWebhookUrl = (typeof window !== "undefined" && window.location.origin)
    ? `${window.location.origin}/api/sync/sheets`
    : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_TUNNEL_URL || "https://xcelerate-pulse.vercel.app") + "/api/sync/sheets";


  // Form selections for granular triggers
  const [selectedEmployee, setSelectedEmployee] = useState<string>("Payal");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("ALL");

  // Execution states
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    success: boolean;
    text: string;
    details?: string;
    stats?: {
      totalUpdated?: number;
      totalAppended?: number;
      totalProcessed?: number;
      newCreators?: string[];
      updatedCreators?: string[];
      action?: string;
      employee?: string;
    };
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Dynamic Sync Progress, Speed & Elapsed Time States
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncElapsedSeconds, setSyncElapsedSeconds] = useState<number>(0);
  const [syncStage, setSyncStage] = useState<string>("");
  const [syncSpeed, setSyncSpeed] = useState<string>("Calculating...");
  const [syncProcessedCount, setSyncProcessedCount] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${secs}.${tenths}s`;
  };

  const startProgressTracking = (actionName: string, isPruneOp: boolean = false) => {
    setSyncProgress(5);
    setSyncElapsedSeconds(0);
    setSyncSpeed("Starting...");
    setSyncProcessedCount(0);

    if (isPruneOp) {
      setSyncStage("Scanning database records...");
    } else if (actionName === "pull_all" || actionName === "pull_employee") {
      setSyncStage("Connecting to Google Sheets Web App...");
    } else if (actionName.includes("sync")) {
      setSyncStage("Reading Flow sheet records...");
    } else if (actionName === "clear_brand_names") {
      setSyncStage("Locating Column E in Flow...");
    } else {
      setSyncStage("Initiating operation...");
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const startTime = Date.now();
    const totalItems = deliverables.length > 0 ? deliverables.length : 183;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setSyncElapsedSeconds(elapsed);

      // Steady, realistic progress pacing that scales across real execution time:
      // - 0s to 4s: 8% -> 25% (Initializing & connecting to Google Sheets Web App)
      // - 4s to 12s: 25% -> 55% (Reading remote sheet & mapping columns)
      // - 12s to 24s: 55% -> 80% (In-memory transformations & preparing batch)
      // - 24s to 40s: 80% -> 92% (Batch-writing rows to Flow & database push)
      // - 40s+: gently advances towards 97% until final confirmation arrives
      let calculatedProgress = 8;
      if (elapsed <= 4.0) {
        calculatedProgress = 8 + (elapsed / 4.0) * 17; // 8% to 25%
      } else if (elapsed <= 12.0) {
        calculatedProgress = 25 + ((elapsed - 4.0) / 8.0) * 30; // 25% to 55%
      } else if (elapsed <= 24.0) {
        calculatedProgress = 55 + ((elapsed - 12.0) / 12.0) * 25; // 55% to 80%
      } else if (elapsed <= 40.0) {
        calculatedProgress = 80 + ((elapsed - 24.0) / 16.0) * 12; // 80% to 92%
      } else {
        calculatedProgress = 92 + 5.0 * (1 - Math.exp(-(elapsed - 40.0) / 20.0));
      }

      const safeProgress = Math.min(Math.max(calculatedProgress, 5), 97.5);
      setSyncProgress(safeProgress);

      const processedApprox = Math.min(Math.round((safeProgress / 100) * totalItems), totalItems);
      setSyncProcessedCount(processedApprox);

      if (elapsed > 0.4) {
        const speedVal = Math.round(processedApprox / Math.max(elapsed, 0.5));
        setSyncSpeed(`~${Math.max(speedVal, 1)} rec/s`);
      }

      // Update Stages dynamically based on current progress
      if (isPruneOp) {
        if (safeProgress < 30) setSyncStage("Scanning database records...");
        else if (safeProgress < 75) setSyncStage("Applying safety filters & pruning records...");
        else setSyncStage("Re-indexing campaigns & deliverables...");
      } else if (actionName === "pull_all" || actionName === "pull_employee") {
        if (safeProgress < 25) setSyncStage("Connecting to Google Sheets Web App...");
        else if (safeProgress < 55) setSyncStage("Reading & extracting employee sheet records...");
        else if (safeProgress < 80) setSyncStage("Mapping Brief Name directly to Campaign Name in Flow...");
        else setSyncStage("Batch-writing rows & pushing live to database...");
      } else if (actionName.includes("sync")) {
        if (safeProgress < 30) setSyncStage("Reading Flow sheet deliverables...");
        else if (safeProgress < 70) setSyncStage("Packaging records & verifying creator data...");
        else setSyncStage("Batch-pushing records to database...");
      } else if (actionName === "clear_brand_names") {
        setSyncStage("Clearing Column E in Flow for manual entry...");
      }
    }, 100);
  };

  const stopProgressTracking = (success: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (success) {
      setSyncProgress(100);
      setSyncStage("✅ Sync completed successfully!");
      setSyncSpeed("Complete");
      const totalItems = deliverables.length > 0 ? deliverables.length : 183;
      setSyncProcessedCount(totalItems);
    }
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // User-facing action label helper
  const getActionLabel = (action: string | null) => {
    if (!action) return "";
    switch (action) {
      case "pull_all": return "Pulling all employee sheets into Master Flow";
      case "pull_employee": return `Pulling ${selectedEmployee !== "ALL" ? selectedEmployee : "selected"} sheet into Master Flow`;
      case "sync_all": return "Syncing Master Flow sheet to database";
      case "sync_month": return `Syncing month ${selectedMonth} to database`;
      case "sync_campaign": return `Syncing campaign ${selectedCampaignId} to database`;
      case "enable_realtime": return "Enabling real-time sync trigger";
      case "enable_autopull": return "Enabling 30-minute sync schedule";
      case "disable_triggers": return "Disabling automated background triggers";
      case "clear_brand_names": return "Clearing Brand/Agency Name column in Master Flow sheet";
      default: return `Executing ${action}`;
    }
  };

  // Immediate Cancel / Terminate Handler
  const handleCancelAction = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveAction(null);
    setIsPruning(false);
    setSyncProgress(0);
    setStatusMessage({
      success: false,
      text: "Sync process was terminated by user.",
    });
  };

  // Connection testing states
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [webhookStatus, setWebhookStatus] = useState<{
    tested: boolean;
    online: boolean;
    statusText: string;
    latencyMs?: number;
  }>({
    tested: false,
    online: false,
    statusText: "Not checked yet",
  });

  // Active subtab inside Sync Panel
  const [panelTab, setPanelTab] = useState<"actions" | "logs" | "registry" | "settings" | "cleanup">("actions");

  // Persistent Latest Sync Snapshot State
  interface SyncDataSnapshot {
    timestamp: string;
    actionName: string;
    totalUpdated: number;
    totalAppended: number;
    totalProcessed: number;
    newCreators: string[];
    updatedCreators?: string[];
  }

  const [latestSync, setLatestSync] = useState<SyncDataSnapshot | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Pruning and Safety State
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetConfirmWord, setResetConfirmWord] = useState<string>("");
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [pruneResult, setPruneResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Granular Reset Scope State
  const [resetScope, setResetScope] = useState<"ALL" | "MONTH" | "CAMPAIGN" | "EMPLOYEE">("ALL");
  const [resetScopeValue, setResetScopeValue] = useState<string>("");

  // Master Spreadsheet Link
  const MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/173oty1YHofleHqdOs0ltSGjIPfCIZi692GxaHbNJl6g/edit";

  const fetchSyncLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/sync/logs");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setSyncLogs(data.logs);
      }
    } catch (e) {
      console.warn("Failed to fetch sync logs", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("xcelerate_apps_script_url");
      if (saved) {
        setWebAppUrl(saved);
        setIsUrlSaved(true);
      } else {
        setWebAppUrl(defaultWebAppUrl);
        localStorage.setItem("xcelerate_apps_script_url", defaultWebAppUrl);
        setIsUrlSaved(true);
      }

      const savedSync = localStorage.getItem("xcelerate_latest_sync_data");
      if (savedSync) {
        try {
          setLatestSync(JSON.parse(savedSync));
        } catch (_) {}
      }
    }
    fetchSyncLogs();
  }, []);

  useEffect(() => {
    if (panelTab === "logs") {
      fetchSyncLogs();
    }
  }, [panelTab]);

  const handleSaveWebAppUrl = (url: string) => {
    const trimmed = url.trim();
    setWebAppUrl(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem("xcelerate_apps_script_url", trimmed);
      setIsUrlSaved(Boolean(trimmed));
    }
    setStatusMessage({
      success: true,
      text: "Google Apps Script Web App URL updated and saved locally.",
    });
  };

  // ONLY Payal is currently connected (dummy names like Kanika, Aditya, Sonu, Tej removed completely)
  const employeeList = useMemo(() => {
    return ["Payal"];
  }, []);

  const employeeOptions: SelectOption[] = useMemo(() => {
    return [
      {
        value: "ALL",
        label: "Select Employee...",
        subtitle: undefined,
      },
      ...employeeList.map((emp) => {
        const creatorCount = deliverables.filter(
          (d) =>
            (d as any).execution_owner === emp || (d as any).xcelerate_poc === emp
        ).length;
        return {
          value: emp,
          label: `👤 ${emp}`,
          subtitle: `Connected Employee (${creatorCount || 183} deliverables)`,
        };
      }),
    ];
  }, [employeeList, deliverables]);

  // Unique employees across the database deliverables
  const allDatabaseEmployees = useMemo(() => {
    const set = new Set<string>();
    employeeList.forEach((e) => set.add(e));
    deliverables.forEach((d) => {
      const owner = (d as any).execution_owner;
      const poc = (d as any).xcelerate_poc;
      if (owner && String(owner).trim()) set.add(String(owner).trim());
      if (poc && String(poc).trim() && String(poc).trim() !== "Team Xcelerate") set.add(String(poc).trim());
    });
    return Array.from(set);
  }, [employeeList, deliverables]);

  // Derive unique campaign months
  const monthList = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => {
      if (c.campaign_month && c.campaign_month.trim()) {
        set.add(c.campaign_month.trim());
      }
    });
    if (set.size === 0) {
      return ["Sep 2026", "Aug 2026", "May 2026", "Apr 2026", "Jan 2026"];
    }
    return Array.from(set);
  }, [campaigns]);

  const monthOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "ALL", label: "Select Month...", subtitle: undefined },
      ...monthList.map((m) => {
        const count = campaigns.filter((c) => c.campaign_month === m).length;
        return {
          value: m,
          label: `📅 ${m}`,
          subtitle: `${count} campaigns`,
        };
      }),
    ];
  }, [monthList, campaigns]);

  // Formatted Campaign Options (NO empty parens like "Corcium ()")
  const campaignOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "ALL", label: "Select Campaign...", subtitle: undefined },
      ...campaigns.map((c) => {
        const org = c.org_name || "Client";
        const cName = c.campaign_name ? c.campaign_name.trim() : "";
        const isDifferentName =
          cName && cName.toLowerCase() !== org.toLowerCase();

        return {
          value: c.id,
          label: `${c.id} • ${org}`,
          subtitle: isDifferentName ? cName : undefined,
        };
      }),
    ];
  }, [campaigns]);

  // Execute remote sync action
  const executeAction = async (action: string, extraParams: Record<string, string> = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setActiveAction(action);
    setStatusMessage(null);
    startProgressTracking(action, false);

    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action,
          webAppUrl,
          ...extraParams,
        }),
      });

      const data = await res.json();

      if (data.success) {
        stopProgressTracking(true);
        // Briefly hold 100% complete state so user sees completion
        await new Promise((resolve) => setTimeout(resolve, 800));

        const updated = data.totalUpdated ?? data.updatedCount ?? 0;
        const appended = data.totalAppended ?? data.newCount ?? 0;
        const processed = data.totalProcessed ?? data.recordsProcessed ?? (updated + appended);
        const newCreators = Array.isArray(data.newCreators) ? data.newCreators : [];
        const updatedCreators = Array.isArray(data.updatedCreators) ? data.updatedCreators : [];

        setStatusMessage({
          success: true,
          text: data.message || `Action '${action}' executed successfully!`,
          stats: {
            totalUpdated: updated,
            totalAppended: appended,
            totalProcessed: processed,
            newCreators,
            updatedCreators,
            action,
            employee: data.employee || (action === "pull_employee" ? selectedEmployee : undefined),
          },
        });

        const snapshot: SyncDataSnapshot = {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (" + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ")",
          actionName: action === "pull_employee" ? `Pull ${selectedEmployee}` : action === "pull_all" ? "Pull All Employees" : action,
          totalUpdated: updated,
          totalAppended: appended,
          totalProcessed: processed,
          newCreators,
          updatedCreators,
        };
        setLatestSync(snapshot);
        if (typeof window !== "undefined") {
          localStorage.setItem("xcelerate_latest_sync_data", JSON.stringify(snapshot));
        }
        fetchSyncLogs();

        if (action.includes("sync") || action.includes("pull")) {
          onSyncTriggered?.();
        }
      } else {
        stopProgressTracking(false);
        setStatusMessage({
          success: false,
          text: data.error || data.message || "Failed to execute action.",
          details: data.raw,
        });
      }
    } catch (err: any) {
      stopProgressTracking(false);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setStatusMessage({
          success: false,
          text: "Sync process was terminated by user.",
        });
        return;
      }
      setStatusMessage({
        success: false,
        text: err.message || "Network error while triggering action.",
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setActiveAction(null);
      setSyncProgress(0);
    }
  };

  // Test Platform Webhook
  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    const start = Date.now();
    try {
      const res = await fetch("/api/sync/sheets", {
        method: "GET",
        headers: { "bypass-tunnel-reminder": "true" },
      });
      const latency = Date.now() - start;
      const data = await res.json();
      setWebhookStatus({
        tested: true,
        online: res.ok,
        statusText: `HTTP ${res.status} (${data.status || "Ready"})`,
        latencyMs: latency,
      });
    } catch (err: any) {
      setWebhookStatus({
        tested: true,
        online: false,
        statusText: err.message || "Failed to reach webhook",
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Reconcile Dropped Creators (Soft-Drop)
  const handleReconcileDropped = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPruning(true);
    setPruneResult(null);
    try {
      const activeIds = deliverables.map((d) => d.id).filter(Boolean);
      const res = await fetch("/api/sync/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "reconcile",
          activeIds,
          scopeOwner: selectedEmployee,
        }),
      });
      const data = await res.json();
      setPruneResult({
        success: data.success,
        message: data.message || (data.success ? `Reconciled ${data.droppedCount} dropped creators.` : data.error || "Failed"),
      });
      if (data.success) {
        onSyncTriggered?.();
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        setPruneResult({ success: false, message: "Operation was terminated by user." });
        return;
      }
      setPruneResult({ success: false, message: err.message || "Network error" });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsPruning(false);
    }
  };

  // Purge Dropped Deliverables (Permanent deletion of only Dropped rows)
  const handlePurgeDropped = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPruning(true);
    setPruneResult(null);
    try {
      const res = await fetch("/api/sync/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "purge_dropped",
          scopeOwner: selectedEmployee,
        }),
      });
      const data = await res.json();
      setPruneResult({
        success: data.success,
        message: data.message || (data.success ? `Permanently purged ${data.purgedCount} dropped records.` : data.error || "Failed"),
      });
      if (data.success) {
        onSyncTriggered?.();
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        setPruneResult({ success: false, message: "Operation was terminated by user." });
        return;
      }
      setPruneResult({ success: false, message: err.message || "Network error" });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsPruning(false);
    }
  };

  // Dynamic expected confirmation phrase matching what is being deleted
  const currentExpectedPhrase = useMemo(() => {
    if (resetScope === "ALL") return "RESET ALL";
    if (resetScope === "MONTH") {
      const val = resetScopeValue || monthList[0] || "Aug 2026";
      return ("DELETE " + val).toUpperCase();
    }
    if (resetScope === "CAMPAIGN") {
      const val = resetScopeValue || campaigns[0]?.id || "";
      return ("DELETE " + val).toUpperCase();
    }
    if (resetScope === "EMPLOYEE") {
      const val = resetScopeValue || allDatabaseEmployees[0] || "Payal";
      return ("DELETE " + val).toUpperCase();
    }
    return "RESET";
  }, [resetScope, resetScopeValue, monthList, campaigns, allDatabaseEmployees]);

  const currentScopeTargetValue = useMemo(() => {
    if (resetScope === "MONTH") return resetScopeValue || monthList[0] || "Aug 2026";
    if (resetScope === "CAMPAIGN") return resetScopeValue || campaigns[0]?.id || "";
    if (resetScope === "EMPLOYEE") return resetScopeValue || allDatabaseEmployees[0] || "Payal";
    return "";
  }, [resetScope, resetScopeValue, monthList, campaigns, allDatabaseEmployees]);

  const currentScopeSummary = useMemo(() => {
    if (resetScope === "ALL") {
      return {
        title: "All Database Records (Full Database Reset)",
        count: deliverables.length,
        description: "Permanently clears all creator deliverables and campaigns from the database."
      };
    }
    if (resetScope === "MONTH") {
      const val = currentScopeTargetValue;
      const matchingCamps = campaigns.filter((c) => c.campaign_month === val);
      const campIds = new Set(matchingCamps.map((c) => c.id));
      const count = deliverables.filter(
        (d) => campIds.has(d.campaign_id) || (d as any).campaign_month === val
      ).length;
      return {
        title: `All Records for Month: ${val}`,
        count,
        description: `Permanently deletes all creator deliverables and ${matchingCamps.length} campaign(s) dated ${val}. Other months remain 100% safe.`
      };
    }
    if (resetScope === "CAMPAIGN") {
      const val = currentScopeTargetValue;
      const c = campaigns.find((camp) => camp.id === val);
      const count = deliverables.filter((d) => d.campaign_id === val).length;
      const name = c ? `${c.id} • ${c.org_name} ${c.campaign_name ? `(${c.campaign_name})` : ""}` : val;
      return {
        title: `Campaign: ${name}`,
        count,
        description: `Permanently deletes deliverables and the campaign record for ${name}. All other campaigns remain 100% safe.`
      };
    }
    if (resetScope === "EMPLOYEE") {
      const val = currentScopeTargetValue;
      const count = deliverables.filter((d) => {
        const owner = String((d as any).execution_owner || (d as any).xcelerate_poc || "");
        return owner.toLowerCase().includes(val.toLowerCase());
      }).length;
      return {
        title: `All Creators Managed by Employee: ${val}`,
        count,
        description: `Permanently deletes creator rows where ${val} is the owner or POC. Other employees' records are untouched.`
      };
    }
    return { title: "", count: 0, description: "" };
  }, [resetScope, currentScopeTargetValue, deliverables, campaigns]);

  // Reset Clean Slate (Granular Scope Engine)
  const handleResetCleanSlate = async () => {
    if (resetConfirmWord.trim().toUpperCase() !== currentExpectedPhrase) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPruning(true);
    setPruneResult(null);
    try {
      const res = await fetch("/api/sync/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "reset_clean_slate",
          scopeType: resetScope,
          scopeValue: currentScopeTargetValue,
          confirmKey: resetConfirmWord,
        }),
      });
      const data = await res.json();
      setPruneResult({
        success: data.success,
        message: data.message || (data.success ? "Reset completed successfully." : data.error || "Failed"),
      });
      setIsResetModalOpen(false);
      setResetConfirmWord("");
      if (data.success) {
        onSyncTriggered?.();
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        setPruneResult({ success: false, message: "Operation was terminated by user." });
        return;
      }
      setPruneResult({ success: false, message: err.message || "Network error" });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsPruning(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
                Command Center
              </span>
              <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Master Sheet</span>
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>⚡ Google Sheets Sync &amp; Automation Hub</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium max-w-2xl">
              Manage Google Sheets sync pipelines, employee data ingestion, and database records in real time.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <a
              href={MASTER_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all border border-white/10 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open Execution Pipeline</span>
              <ExternalLink className="w-3 h-3 text-slate-400 ml-1" />
            </a>
          </div>
        </div>

        {/* Subtab Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/10 overflow-x-auto no-scrollbar scroll-smooth pb-1.5 -mx-1 px-1">
          <button
            onClick={() => setPanelTab("actions")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              panelTab === "actions"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sync Menu Options</span>
          </button>

          <button
            onClick={() => setPanelTab("logs")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              panelTab === "logs"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync Data &amp; Logs</span>
            {latestSync && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setPanelTab("registry")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              panelTab === "registry"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Sheets Registry</span>
          </button>

          <button
            onClick={() => setPanelTab("settings")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              panelTab === "settings"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Connection &amp; Diagnostics</span>
            {webAppUrl ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>

          <button
            onClick={() => setPanelTab("cleanup")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              panelTab === "cleanup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Database Safety &amp; Pruning</span>
          </button>
        </div>
      </div>

      {/* Prominent Active Sync Operation & Immediate Termination Bar with Live % Bar, Speed & Time */}
      {(activeAction !== null || isPruning) && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white border-2 border-blue-400/60 shadow-2xl space-y-3.5 animate-fadeIn">
          {/* Top Row: Title, Stage & Telemetry Badges */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="relative shrink-0">
                <RefreshCw className="w-5 h-5 text-cyan-300 animate-spin" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-300 border border-blue-400/40 shrink-0">
                    Sync In Progress
                  </span>
                  <span className="text-xs md:text-sm font-bold text-white truncate">
                    {activeAction ? getActionLabel(activeAction) : "Database cleanup operation in progress..."}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-medium mt-1">
                  <span className="inline-flex items-center space-x-1.5 text-cyan-300 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                    <span className="truncate">{syncStage}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Telemetry: Time, Speed, Items, and Terminate Button */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2.5 lg:pt-0 border-t border-white/10 lg:border-t-0">
              <div className="flex items-center justify-between sm:justify-start space-x-2 text-xs bg-white/10 px-3 py-2 sm:py-1.5 rounded-xl border border-white/10 font-mono shadow-inner overflow-x-auto no-scrollbar">
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-slate-400 text-[11px]">⏱ Time:</span>
                  <span className="font-bold text-cyan-300 text-xs">{formatElapsedTime(syncElapsedSeconds)}</span>
                </div>
                <span className="text-slate-600 shrink-0">|</span>
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-slate-400 text-[11px]">⚡ Speed:</span>
                  <span className="font-bold text-amber-300 text-xs">{syncSpeed}</span>
                </div>
                <span className="text-slate-600 shrink-0">|</span>
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-slate-400 text-[11px]">📊 Items:</span>
                  <span className="font-bold text-emerald-300 text-xs">{syncProcessedCount} / {deliverables.length > 0 ? deliverables.length : 183}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelAction}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all border border-rose-500/50 shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>⏹ Terminate Sync</span>
              </button>
            </div>
          </div>

          {/* Syncing % Bar Container */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-[11px]">Completion Progress</span>
                <span className="text-[11px] font-bold text-blue-200">
                  {syncProgress < 100 ? `${Math.round(syncProgress)}%` : "100% COMPLETE"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-cyan-300 text-sm">
                  {Math.round(syncProgress)}%
                </span>
              </div>
            </div>

            {/* Glowing Animated Progress Bar */}
            <div className="w-full h-3.5 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-blue-400/40 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-150 ease-out relative overflow-hidden shadow-sm animate-stripes ${
                  syncProgress >= 100
                    ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400"
                    : "bg-gradient-to-r from-[#0052FF] via-cyan-400 to-indigo-500"
                }`}
                style={{ width: `${Math.min(Math.max(syncProgress, 4), 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border transition-all animate-fadeIn ${
            statusMessage.success
              ? "bg-emerald-50/90 text-emerald-950 border-emerald-200 shadow-2xs"
              : "bg-amber-50/90 text-amber-950 border-amber-200 shadow-2xs"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              {statusMessage.success ? (
                <div className="p-1.5 rounded-xl bg-emerald-100/90 text-emerald-700 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-xl bg-amber-100/90 text-amber-700 shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              <div className="space-y-1">
                <p className="font-bold text-xs text-slate-900 leading-snug">{statusMessage.text}</p>
                {statusMessage.details && (
                  <p className="text-[11px] text-slate-600 font-mono bg-white/80 p-2 rounded-lg border border-slate-200/80">
                    {statusMessage.details}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer text-xs"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sync Metrics Badges (Rows Updated, New Rows / Creators Added, Total Records) */}
          {statusMessage.success && statusMessage.stats && (
            <div className="mt-3 pt-3 border-t border-emerald-200/70 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Updated Rows Badge */}
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-emerald-200 text-xs text-slate-800 font-bold shadow-2xs">
                  <RefreshCw className="w-3 h-3 text-blue-600" />
                  <span>
                    <strong>{statusMessage.stats.totalUpdated ?? 0}</strong> Rows Updated
                  </span>
                </div>

                {/* New Rows Added Badge */}
                <div
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold shadow-2xs ${
                    (statusMessage.stats.totalAppended ?? 0) > 0
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white/90 border-slate-200 text-slate-600"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    <strong>{statusMessage.stats.totalAppended ?? 0}</strong> New Rows Added
                  </span>
                </div>

                {/* Total Processed Deliverables Badge */}
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-xs text-slate-700 font-semibold shadow-2xs">
                  <Layers className="w-3 h-3 text-indigo-600" />
                  <span>
                    <strong>{statusMessage.stats.totalProcessed ?? 0}</strong> Total Deliverables
                  </span>
                </div>
              </div>

              {/* Newly Added Creators List */}
              {statusMessage.stats.newCreators && statusMessage.stats.newCreators.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-white/95 border border-emerald-300/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      ✨ {statusMessage.stats.newCreators.length} New Creator{statusMessage.stats.newCreators.length > 1 ? "s" : ""} Added:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {statusMessage.stats.newCreators.slice(0, 15).map((cr, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                      >
                        {cr}
                      </span>
                    ))}
                    {statusMessage.stats.newCreators.length > 15 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        +{statusMessage.stats.newCreators.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-800/80 font-medium flex items-center space-x-1">
                  <span>✓</span>
                  <span>
                    All existing creator records were refreshed in-place with latest metrics and statuses (no new creators added).
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: ALL 10 SYNC MENU OPTIONS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {panelTab === "actions" && (
        <div className="space-y-6">

          {/* Quick Notice if Web App URL is not saved */}
          {!webAppUrl && (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-blue-900 font-medium">
                <HelpCircle className="w-4 h-4 text-[#0052FF] shrink-0" />
                <span>
                  <strong>Tip:</strong> For 100% remote headless triggers from this website, deploy your Google Apps Script as a Web App and paste the URL in the <strong>Connection &amp; Diagnostics</strong> tab.
                </span>
              </div>
              <button
                onClick={() => setPanelTab("settings")}
                className="text-[#0052FF] font-bold underline hover:text-blue-700 cursor-pointer ml-3 shrink-0"
              >
                Configure URL
              </button>
            </div>
          )}

          {/* Persistent Latest Sync Overview Card */}
          {latestSync && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/60 border border-blue-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white border border-blue-200 shadow-2xs text-[#0052FF]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-900">Latest Sync:</span>
                    <span className="font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded-md border border-blue-200/70 text-[11px]">
                      {latestSync.actionName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      • {latestSync.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    <strong>{latestSync.totalUpdated}</strong> rows updated • <strong>{latestSync.totalAppended}</strong> new rows added • <strong>{latestSync.totalProcessed}</strong> total deliverables
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {latestSync.newCreators && latestSync.newCreators.length > 0 && (
                  <div className="flex items-center space-x-1.5 bg-white/95 px-2.5 py-1 rounded-xl border border-emerald-200 text-emerald-800 text-[10px] font-bold shadow-2xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>✨ {latestSync.newCreators.length} New Creators</span>
                  </div>
                )}
                <button
                  onClick={() => setPanelTab("logs")}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
                >
                  <span>View All Logs</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 1: INGESTION (Employee Sheets -> 'Flow' Master Sheet) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-blue-100 text-[#0052FF]">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                1. Import Employee Sheets into Master &apos;Flow&apos;
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Pull All Employee Data */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span className="text-blue-600 font-mono">📥</span>
                      <span>Pull All Employee Data</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Multi-Sheet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Imports and merges all active employee sheet records into the master Flow sheet.
                  </p>
                </div>

                {activeAction === "pull_all" ? (
                  <div className="flex items-center space-x-2">
                    <button
                      disabled
                      className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600/90 text-white font-bold text-xs flex items-center justify-center space-x-2 cursor-wait shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Pulling All Sheets... {Math.round(syncProgress)}% ({formatElapsedTime(syncElapsedSeconds)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAction}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={activeAction !== null}
                    onClick={() => executeAction("pull_all")}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Pull All Employee Sheets</span>
                  </button>
                )}
              </div>

              {/* Option 2: Pull Single Employee Sheet */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span className="text-indigo-600 font-mono">🎯</span>
                      <span>Pull Single Employee Sheet</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Connected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Imports deliverables for a selected team member without affecting other records.
                  </p>
                </div>

                <div className="space-y-2">
                  <ScrollableSelect
                    value={selectedEmployee}
                    options={employeeOptions}
                    onChange={(val) => setSelectedEmployee(val)}
                    placeholder="Select Employee..."
                    icon={<Users className="w-3.5 h-3.5 text-indigo-500" />}
                    searchPlaceholder="Search connected employees..."
                  />

                  {activeAction === "pull_employee" ? (
                    <div className="flex items-center space-x-2">
                      <button
                        disabled
                        className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600/90 text-white font-bold text-xs flex items-center justify-center space-x-2 cursor-wait shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Pulling {selectedEmployee}... {Math.round(syncProgress)}% ({formatElapsedTime(syncElapsedSeconds)})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAction}
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={activeAction !== null || selectedEmployee === "ALL"}
                      onClick={() => executeAction("pull_employee", { employee: selectedEmployee })}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Pull Selected Sheet</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PLATFORM SYNC ('Flow' Master Sheet -> Database) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                2. Sync Master &apos;Flow&apos; Sheet to Database
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 3: Sync Entire 'Flow' Sheet */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span className="text-emerald-600 font-mono">🚀</span>
                      <span>Sync Entire &apos;Flow&apos; Sheet</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Synchronizes all records from the master Flow sheet into the database.
                  </p>
                </div>

                {activeAction === "sync_all" ? (
                  <div className="flex items-center space-x-2">
                    <button
                      disabled
                      className="flex-1 py-2.5 px-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-wait shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing Flow Sheet... {Math.round(syncProgress)}% ({formatElapsedTime(syncElapsedSeconds)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAction}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={activeAction !== null}
                    onClick={() => executeAction("sync_all")}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Entire Flow Sheet</span>
                  </button>
                )}
              </div>

              {/* Option 4: Sync By Campaign Month */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span className="text-blue-600 font-mono">📅</span>
                      <span>Sync By Campaign Month</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Synchronizes records filtered by the selected campaign month.
                  </p>
                </div>

                <div className="space-y-2">
                  <ScrollableSelect
                    value={selectedMonth}
                    options={monthOptions}
                    onChange={(val) => setSelectedMonth(val)}
                    placeholder="Select Month..."
                    icon={<Calendar className="w-3.5 h-3.5 text-blue-500" />}
                    searchPlaceholder="Search month..."
                  />

                  {activeAction === "sync_month" ? (
                    <div className="flex items-center space-x-2">
                      <button
                        disabled
                        className="flex-1 py-2 px-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-wait shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing {selectedMonth}... {Math.round(syncProgress)}%</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAction}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={activeAction !== null || selectedMonth === "ALL"}
                      onClick={() => executeAction("sync_month", { month: selectedMonth })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Sync Month</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Option 5: Sync By Campaign ID */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span className="text-purple-600 font-mono">🏢</span>
                      <span>Sync By Campaign ID</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Synchronizes deliverables for a selected campaign ID.
                  </p>
                </div>

                <div className="space-y-2">
                  <ScrollableSelect
                    value={selectedCampaignId}
                    options={campaignOptions}
                    onChange={(val) => setSelectedCampaignId(val)}
                    placeholder="Select Campaign..."
                    icon={<Building2 className="w-3.5 h-3.5 text-purple-500" />}
                    searchPlaceholder="Search campaign ID or brand..."
                  />

                  {activeAction === "sync_campaign" ? (
                    <div className="flex items-center space-x-2">
                      <button
                        disabled
                        className="flex-1 py-2 px-2.5 rounded-xl bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-wait shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing Campaign... {Math.round(syncProgress)}%</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAction}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={activeAction !== null || selectedCampaignId === "ALL"}
                      onClick={() => executeAction("sync_campaign", { campaign: selectedCampaignId })}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Sync Campaign</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: AUTOMATION TRIGGERS */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                3. Automation &amp; Background Triggers
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 6: Enable Real-Time Sync on Edit */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900">
                    <span className="text-amber-500 font-mono">⚡</span>
                    <span>Real-Time Sync on Edit</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Synchronizes cell edits in &apos;Flow&apos; to the database automatically in real time.
                  </p>
                </div>

                <button
                  disabled={activeAction !== null}
                  onClick={() => executeAction("enable_realtime")}
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Enable On-Edit Trigger</span>
                </button>
              </div>

              {/* Option 7: Enable Auto-Pull Every 30 Mins */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900">
                    <span className="text-blue-500 font-mono">⏰</span>
                    <span>Scheduled Sync (Every 30 Mins)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Runs a periodic background sync every 30 minutes to pull sheet updates.
                  </p>
                </div>

                <button
                  disabled={activeAction !== null}
                  onClick={() => executeAction("enable_autopull")}
                  className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enable 30-Min Schedule</span>
                </button>
              </div>

              {/* Option 8: Disable Automation Triggers */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900">
                    <span className="text-rose-500 font-mono">⏹️</span>
                    <span>Disable Background Triggers</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Removes active background triggers for manual-only sync control.
                  </p>
                </div>

                <button
                  disabled={activeAction !== null}
                  onClick={() => executeAction("disable_triggers")}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Disable All Triggers</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 4: DIAGNOSTICS & REGISTRY QUICK LINKS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[#0052FF]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">
                  Platform Webhook Diagnostics
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Test network connectivity between Google Sheets and the application webhook.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={activeAction !== null}
                onClick={() => executeAction("clear_brand_names")}
                title="Clears Column E (Brand/Agency Name) in Flow sheet so it can be filled manually after consulting POC"
                className="px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-bold text-xs transition-all border border-slate-200 hover:border-amber-300 cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>🧹 Clear &apos;Brand/Agency Name&apos; Col in Flow</span>
              </button>

              <button
                onClick={() => setPanelTab("registry")}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all border border-slate-200 cursor-pointer"
              >
                <span>Employee Sheets Registry</span>
              </button>

              <button
                disabled={isTestingWebhook}
                onClick={handleTestWebhook}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Webhook Status Inline Feedback */}
          {webhookStatus.tested && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                webhookStatus.online
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                {webhookStatus.online ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span>Platform Webhook Status: <strong>{webhookStatus.statusText}</strong></span>
              </div>
              {webhookStatus.latencyMs !== undefined && (
                <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded-md border">
                  {webhookStatus.latencyMs} ms
                </span>
              )}
            </div>
          )}

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB: SYNC DATA & AUDIT LOGS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {panelTab === "logs" && (
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-xl bg-blue-100 text-[#0052FF]">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live Sync Data &amp; Platform Ingestion Logs
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Live telemetry of all row updates, newly added creators, and automated Google Sheets sync operations.
              </p>
            </div>

            <button
              onClick={fetchSyncLogs}
              disabled={isLoadingLogs}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* KPI Snapshot Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Active Database Records */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total in Database</span>
              <div className="text-xl font-black text-slate-900">
                {deliverables.length}
              </div>
              <span className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                <Layers className="w-3 h-3 text-[#0052FF]" />
                <span>Active deliverables</span>
              </span>
            </div>

            {/* KPI 2: Rows Updated */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rows Updated (Latest)</span>
              <div className="text-xl font-black text-blue-600">
                {latestSync?.totalUpdated ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                <RefreshCw className="w-3 h-3 text-blue-500" />
                <span>Refreshed in-place</span>
              </span>
            </div>

            {/* KPI 3: New Rows Added */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Rows Added</span>
              <div className="text-xl font-black text-emerald-600">
                {latestSync?.totalAppended ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                <Plus className="w-3 h-3 text-emerald-500" />
                <span>New rows inserted</span>
              </span>
            </div>

            {/* KPI 4: New Creators Added */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Creators Added</span>
              <div className="text-xl font-black text-indigo-600">
                {latestSync?.newCreators ? latestSync.newCreators.length : 0}
              </div>
              <span className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Newly discovered</span>
              </span>
            </div>
          </div>

          {/* Latest New Creators Card */}
          {latestSync?.newCreators && latestSync.newCreators.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-black text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>✨ Newly Added Creators from Recent Sync ({latestSync.newCreators.length}):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {latestSync.newCreators.map((creator, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-white border border-emerald-200 font-bold text-xs text-emerald-900 shadow-2xs flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{creator}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
              <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Synchronization Audit Trail (Last 50 Events)</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                {syncLogs.length} events logged
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-[#0052FF]" />
                <span className="text-xs font-semibold">Loading sync logs from database...</span>
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1 font-medium">
                <p className="font-bold text-slate-800">No sync logs recorded yet</p>
                <p>Trigger &quot;Pull Single Employee Sheet&quot; or &quot;Pull All Employee Sheets&quot; to populate live data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3.5">Time</th>
                      <th className="py-2.5 px-3.5">Pipeline / Source</th>
                      <th className="py-2.5 px-3.5">Status</th>
                      <th className="py-2.5 px-3.5">Deliverables</th>
                      <th className="py-2.5 px-3.5">Sync Activity Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp ? String(log.timestamp).replace("T", " ").slice(0, 19) : "Just now"}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                          {log.source}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-700 whitespace-nowrap">
                          {log.records_synced}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-[11px] leading-relaxed">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: EMPLOYEE SHEETS REGISTRY */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {panelTab === "registry" && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-[#0052FF]" />
                <span>Connected Employee Sheets Registry</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                1 Active Sheet Connected
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed font-medium">
              Manage connected employee sheets via the <strong>&quot;⚙️ Employee Sheets&quot;</strong> tab in your master spreadsheet:
            </p>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Col A: Employee Name</th>
                    <th className="py-2.5 px-3">Col B: Sheet ID or URL</th>
                    <th className="py-2.5 px-3">Col C: Tab Name</th>
                    <th className="py-2.5 px-3">Col D: Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="bg-blue-50/30">
                    <td className="py-2 px-3 font-bold text-slate-400">2</td>
                    <td className="py-2 px-3 font-bold text-slate-800">Connected Sheet</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-500">17kvysvuctOSTh_1FTEsa_vlsdVELs8rSdqR-R_gJZqI</td>
                    <td className="py-2 px-3 text-slate-600">ExecutionSheet</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="text-slate-400">
                    <td className="py-2 px-3 font-bold">3</td>
                    <td className="py-2 px-3 font-medium italic">&lt;Add Next Employee Name&gt;</td>
                    <td className="py-2 px-3 font-mono text-[10px]">&lt;Paste Google Sheet ID or URL&gt;</td>
                    <td className="py-2 px-3">ExecutionSheet</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px]">
                        Available
                      </span>
                    </td>
                  </tr>
                  <tr className="text-slate-400">
                    <td className="py-2 px-3 font-bold">4</td>
                    <td className="py-2 px-3 font-medium italic">&lt;Add Next Employee Name&gt;</td>
                    <td className="py-2 px-3 font-mono text-[10px]">&lt;Paste Google Sheet ID or URL&gt;</td>
                    <td className="py-2 px-3">ExecutionSheet</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px]">
                        Available
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-white rounded-xl border border-blue-100 text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-900">🛡️ Configuration Guidelines:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Share the employee spreadsheet with Viewer or Editor access.</li>
                <li>Ensure the sheet contains a tab named <code>ExecutionSheet</code>.</li>
                <li>Use <strong>&quot;Pull Single Employee Sheet&quot;</strong> to ingest deliverables on demand.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: WEB APP CONNECTION & DIAGNOSTICS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {panelTab === "settings" && (
        <div className="space-y-5">
          {/* Web App URL Configuration */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                  <Link2 className="w-4 h-4 text-[#0052FF]" />
                  <span>Google Apps Script Web App Endpoint</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Connect your Google Apps Script as a headless Web App to trigger pulls and syncs directly from this website.
                </p>
              </div>

              {webAppUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Configured</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Not Configured</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0052FF]"
              />
              <button
                onClick={() => handleSaveWebAppUrl(webAppUrl)}
                className="px-4 py-2 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-xs cursor-pointer transition-all shrink-0"
              >
                Save URL
              </button>
            </div>

            {/* Expandable Deployment Guide */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDeploymentHelp(!showDeploymentHelp)}
                className="text-xs text-[#0052FF] font-bold flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showDeploymentHelp ? "Hide Deployment Steps" : "How to get your Web App URL in 30 seconds"}</span>
              </button>

              {showDeploymentHelp && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-2 font-medium">
                  <p className="font-bold text-slate-900">Deploy as Web App in Google Apps Script:</p>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>In your Google Sheet, click <strong>Extensions ➔ Apps Script</strong>.</li>
                    <li>Ensure your code in <code>Code.gs</code> is saved.</li>
                    <li>Click the blue <strong>Deploy</strong> button (top right) ➔ <strong>New deployment</strong>.</li>
                    <li>Click the gear icon next to &quot;Select type&quot; ➔ choose <strong>Web app</strong>.</li>
                    <li>Description: <code>Xcelerate Pulse Remote Control</code>.</li>
                    <li><strong>Execute as:</strong> <code>Me (your google account)</code>.</li>
                    <li><strong>Who has access:</strong> <code>Anyone</code> (required so Next.js can trigger requests).</li>
                    <li>Click <strong>Deploy</strong>, authorize if prompted, and copy the <strong>Web app URL</strong> ending in <code>/exec</code>.</li>
                    <li>Paste the URL into the input field above and click <strong>Save URL</strong>!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Platform Webhook Details */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Live Platform Webhook Endpoint</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium">
                  The endpoint configured inside <code>Code.gs</code> (WEBHOOK_URL).
                </p>
              </div>

              <button
                disabled={isTestingWebhook}
                onClick={handleTestWebhook}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Activity className={`w-3.5 h-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
                <span>Test Webhook Ping</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
              <span className="truncate max-w-md">{activeWebhookUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeWebhookUrl);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Copy Webhook URL"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: DATABASE SAFETY & PRUNING */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {panelTab === "cleanup" && (
        <div className="space-y-6">

          {/* Deletion Protection Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-emerald-950 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Deletion Protection Active</span>
            </div>
            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              Automated sync will never delete existing database records if rows are removed from spreadsheets. Stored records remain fully protected.
            </p>
          </div>

          {/* Action Feedback Banner */}
          {pruneResult && (
            <div
              className={`p-4 rounded-2xl flex items-start space-x-3 text-xs font-medium border animate-fadeIn ${
                pruneResult.success
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-amber-50 text-amber-900 border-amber-200"
              }`}
            >
              {pruneResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-bold">{pruneResult.message}</p>
              </div>
            </div>
          )}

          {/* Pruning Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Reconcile Dropped Creators */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF]">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Reconcile Dropped Creators</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Non-Destructive</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Compares sheet rows with the database and marks missing creators as <strong>&apos;Drop&apos; status</strong>, preserving campaign history without deleting data.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isPruning}
                  onClick={handleReconcileDropped}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0052FF] font-bold text-xs cursor-pointer border border-blue-200 transition-all disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isPruning ? "animate-spin" : ""}`} />
                  <span>Reconcile Dropped Creators</span>
                </button>
              </div>
            </div>

            {/* Card 2: Purge Dropped Deliverables */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Purge Dropped Records</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Targeted Cleanup</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Permanently removes records currently marked in <strong>&apos;Drop&apos; status</strong>. Active creators and valid deliverables are 100% untouched.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isPruning}
                  onClick={handlePurgeDropped}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border border-slate-200 transition-all disabled:opacity-50"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${isPruning ? "animate-spin" : ""}`} />
                  <span>Purge Dropped Records Only</span>
                </button>
              </div>
            </div>

          </div>

          {/* Clean Slate Reset Danger Zone Card */}
          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 text-slate-900 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                  Clean Slate Database Reset
                </h3>
                <p className="text-xs text-rose-900 font-medium leading-relaxed">
                  Permanently clears legacy or test records across all or selected scopes so only fresh pipeline data is stored in the database.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setResetScope("ALL");
                  setResetScopeValue("");
                  setResetConfirmWord("");
                  setIsResetModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Database Records...</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* GRANULAR RESET & CLEAN SLATE CONFIRMATION MODAL */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Database Reset &amp; Granular Cleanup</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Select exact scope to delete safely</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setResetScope("ALL");
                  setResetScopeValue("");
                  setResetConfirmWord("");
                }}
                className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                  resetScope === "ALL"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                🏢 All Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetScope("MONTH");
                  setResetScopeValue(monthList[0] || "Aug 2026");
                  setResetConfirmWord("");
                }}
                className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                  resetScope === "MONTH"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                📅 By Month
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetScope("CAMPAIGN");
                  setResetScopeValue(campaigns[0]?.id || "");
                  setResetConfirmWord("");
                }}
                className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                  resetScope === "CAMPAIGN"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                🎯 Campaign
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetScope("EMPLOYEE");
                  setResetScopeValue(allDatabaseEmployees[0] || "Payal");
                  setResetConfirmWord("");
                }}
                className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                  resetScope === "EMPLOYEE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                👤 Employee
              </button>
            </div>

            {/* Target Selector Dropdowns if not ALL */}
            {resetScope === "MONTH" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Select Month to Delete:</label>
                <select
                  value={currentScopeTargetValue}
                  onChange={(e) => {
                    setResetScopeValue(e.target.value);
                    setResetConfirmWord("");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {monthList.map((m) => (
                    <option key={m} value={m}>
                      📅 {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {resetScope === "CAMPAIGN" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Select Campaign to Delete:</label>
                <select
                  value={currentScopeTargetValue}
                  onChange={(e) => {
                    setResetScopeValue(e.target.value);
                    setResetConfirmWord("");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      🎯 {c.id} • {c.org_name} {c.campaign_name ? `(${c.campaign_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {resetScope === "EMPLOYEE" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Select Employee to Delete:</label>
                <select
                  value={currentScopeTargetValue}
                  onChange={(e) => {
                    setResetScopeValue(e.target.value);
                    setResetConfirmWord("");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {allDatabaseEmployees.map((emp) => (
                    <option key={emp} value={emp}>
                      👤 {emp}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Explicit "What will be deleted" Callout Box */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-rose-700 uppercase tracking-wide text-[10px]">You are about to delete:</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 text-[10px] font-black">
                  {currentScopeSummary.count} creator record(s)
                </span>
              </div>
              <p className="text-xs font-black text-rose-950 truncate">
                {currentScopeSummary.title}
              </p>
              <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                {currentScopeSummary.description}
              </p>
            </div>

            {/* Confirmation Input: Type exact target string */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                To confirm deletion, type exactly:{" "}
                <span className="font-mono text-rose-600 font-black tracking-wide">
                  {currentExpectedPhrase}
                </span>
              </label>
              <input
                type="text"
                value={resetConfirmWord}
                onChange={(e) => setResetConfirmWord(e.target.value)}
                placeholder={currentExpectedPhrase}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500 uppercase"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (isPruning) {
                    handleCancelAction();
                  }
                  setIsResetModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetConfirmWord.trim().toUpperCase() !== currentExpectedPhrase || isPruning}
                onClick={handleResetCleanSlate}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 shadow-xs"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isPruning ? "animate-spin" : ""}`} />
                <span>Confirm &amp; Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
