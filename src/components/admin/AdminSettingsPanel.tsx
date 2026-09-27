"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Lock,
  StickyNote,
  UserCog,
  Search,
  ChevronDown,
  Sparkles,
  KeyRound,
  FileSpreadsheet,
  ShieldCheck,
  Layers,
  Check,
  Globe,
} from "lucide-react";
import { BrandCredential, Role, CampaignSummary, CreatorDeliverableBrandView, CreatorDeliverableInternal, CampaignAccessMode } from "@/lib/types";
import {
  getCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  getOrganizationNames,
  getExecutionOwners,
  getCampaigns,
} from "@/lib/db/actions";
import { SyncControlPanel } from "@/components/sync/SyncControlPanel";

// ─────────────────────────────────────────────────────────────────────────────
// Admin Settings Panel — Full Credentials & Sync Automation Management Hub
// ─────────────────────────────────────────────────────────────────────────────

interface AdminSettingsPanelProps {
  onCredentialsChanged?: () => void;
  campaigns?: CampaignSummary[];
  deliverables?: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  onSyncTriggered?: () => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = React.memo(({
  onCredentialsChanged,
  campaigns = [],
  deliverables = [],
  onSyncTriggered,
}) => {
  const [adminSection, setAdminSection] = useState<"sync" | "credentials">("sync");
  const [credentials, setCredentials] = useState<BrandCredential[]>([]);
  const [orgNames, setOrgNames] = useState<string[]>([]);
  const [executionOwners, setExecutionOwners] = useState<string[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<BrandCredential | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Password visibility per row
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [creds, orgs, owners, camps] = await Promise.all([
        getCredentials(),
        getOrganizationNames(),
        getExecutionOwners(),
        getCampaigns("SUPER_ADMIN", "All Organizations"),
      ]);
      setCredentials(creds);
      setOrgNames(orgs);
      setExecutionOwners(owners);
      setAllCampaigns(camps);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleActive = async (cred: BrandCredential) => {
    const result = await updateCredential(cred.id, { is_active: !cred.is_active });
    if (result.success) {
      showToast(`${cred.org_name} credential ${cred.is_active ? "disabled" : "enabled"}`, "success");
      await loadData();
      onCredentialsChanged?.();
    } else {
      showToast(result.error || "Failed to update", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCredential(id);
    if (result.success) {
      showToast("Credential permanently deleted", "success");
      setDeleteTarget(null);
      await loadData();
      onCredentialsChanged?.();
    } else {
      showToast(result.error || "Delete failed", "error");
    }
  };

  const openCreateDrawer = () => {
    setEditingCredential(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (cred: BrandCredential) => {
    setEditingCredential(cred);
    setIsDrawerOpen(true);
  };

  const filteredCredentials = credentials.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.org_name.toLowerCase().includes(q) ||
      c.portal_username.toLowerCase().includes(q) ||
      (c.notes || "").toLowerCase().includes(q)
    );
  });

  const activeCount = credentials.filter((c) => c.is_active).length;
  const disabledCount = credentials.filter((c) => !c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Admin Section Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminSection("sync")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            adminSection === "sync"
              ? "bg-[#0052FF] text-white shadow-md shadow-blue-500/20"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>⚡ Google Sheets Sync &amp; Automation Hub</span>
        </button>

        <button
          onClick={() => setAdminSection("credentials")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            adminSection === "credentials"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>🔑 Portal Credentials Manager</span>
        </button>
      </div>

      {adminSection === "sync" ? (
        <SyncControlPanel
          campaigns={campaigns}
          deliverables={deliverables}
          onSyncTriggered={onSyncTriggered}
        />
      ) : (
        <>
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/80">
                  <Settings className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Portal Credentials Manager
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Create, manage, and control brand/agency portal access credentials
                  </p>
                </div>
              </div>
            </div>

        <button
          onClick={openCreateDrawer}
          className="btn-cinematic-blue flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Credential</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Credentials" value={credentials.length} icon={<KeyRound className="w-4 h-4" />} color="blue" />
        <StatCard label="Active Portals" value={activeCount} icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
        <StatCard label="Disabled" value={disabledCount} icon={<ToggleLeft className="w-4 h-4" />} color="amber" />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by organization, email, or notes..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]/40 transition-all"
        />
      </div>

      {/* Credentials Table */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#0052FF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading credentials from database...</p>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="py-16 text-center space-y-4 glass-panel-light rounded-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-600">No credentials found</p>
            <p className="text-xs text-slate-400">
              {searchQuery ? "Try a different search term" : "Create your first brand portal credential to get started"}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0052FF] text-white text-xs font-bold cursor-pointer hover:bg-blue-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Credential</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[1.5fr_1.5fr_0.8fr_0.7fr_1fr_auto] gap-4 px-5 py-3 border-b border-slate-200 bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Organization</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Username / Email</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Role & Scope</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100">
            {filteredCredentials.map((cred) => (
              <div
                key={cred.id}
                className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1.5fr_0.8fr_0.7fr_1fr_auto] gap-3 lg:gap-4 px-5 py-4 items-center transition-all hover:bg-blue-50/30 ${
                  !cred.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Org Name */}
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ${
                    cred.is_active
                      ? "bg-gradient-to-br from-[#0052FF] to-[#00C2FF]"
                      : "bg-gradient-to-br from-slate-400 to-slate-500"
                  }`}>
                    {cred.org_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{cred.org_name}</p>
                    {cred.notes && (
                      <p className="text-[11px] text-slate-400 truncate">{cred.notes}</p>
                    )}
                  </div>
                </div>

                {/* Username */}
                <div className="flex items-center space-x-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 truncate font-mono">{cred.portal_username}</span>
                </div>

                {/* Password */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePasswordVisibility(cred.id)}
                    className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-[#0052FF] transition-colors cursor-pointer"
                  >
                    {visiblePasswords.has(cred.id) ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span className="font-mono text-[11px]">{cred.portal_password}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span className="font-mono text-[11px]">••••••••</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Role Badge & Access Scope */}
                <div className="flex flex-col items-start gap-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    cred.role === "BRAND_CLIENT"
                      ? "bg-blue-50 text-[#0052FF] border border-blue-200"
                      : cred.role === "AGENCY_CLIENT"
                      ? "bg-purple-50 text-purple-600 border border-purple-200"
                      : cred.role === "EMPLOYEE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}>
                    {cred.role === "BRAND_CLIENT" 
                      ? "Brand" 
                      : cred.role === "AGENCY_CLIENT" 
                      ? "Agency" 
                      : cred.role === "EMPLOYEE" 
                      ? "Employee" 
                      : "Analyst"}
                  </span>
                  {cred.campaign_access_mode === "SPECIFIC" ? (
                    <span 
                      className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                      title={cred.assigned_campaign_ids && cred.assigned_campaign_ids.length > 0 ? cred.assigned_campaign_ids.join(", ") : "Specific campaigns assigned"}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>{cred.assigned_campaign_ids?.length || 0} Campaign{(cred.assigned_campaign_ids?.length || 0) === 1 ? "" : "s"}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                      <Globe className="w-2.5 h-2.5 text-slate-400" />
                      <span>All Campaigns</span>
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(cred)}
                    className="flex items-center space-x-1.5 cursor-pointer group"
                    title={cred.is_active ? "Click to disable" : "Click to enable"}
                  >
                    {cred.is_active ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-[11px] font-bold text-emerald-600">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-500 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-400">Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => openEditDrawer(cred)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-[#0052FF] transition-all cursor-pointer"
                    title="Edit credential"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {deleteTarget === cred.id ? (
                    <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-150">
                      <button
                        onClick={() => handleDelete(cred.id)}
                        className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteTarget(cred.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                      title="Delete credential"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Credential Drawer */}
      <CredentialDrawer
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setEditingCredential(null); }}
        editingCredential={editingCredential}
        orgNames={orgNames}
        executionOwners={executionOwners}
        campaigns={allCampaigns.length > 0 ? allCampaigns : campaigns}
        onSaved={() => {
          loadData();
          onCredentialsChanged?.();
          showToast(editingCredential ? "Credential updated" : "Credential created", "success");
          setIsDrawerOpen(false);
          setEditingCredential(null);
        }}
        onError={(msg) => showToast(msg, "error")}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center space-x-2.5 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold animate-in slide-in-from-bottom-4 fade-in duration-200 ${
          toast.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card Sub-Component
// ─────────────────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber";
}> = ({ label, value, icon, color }) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-50/80",
      border: "border-blue-200/70",
      iconBg: "bg-[#0052FF]",
      text: "text-[#0052FF]",
    },
    emerald: {
      bg: "bg-emerald-50/80",
      border: "border-emerald-200/70",
      iconBg: "bg-emerald-500",
      text: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50/80",
      border: "border-amber-200/70",
      iconBg: "bg-amber-500",
      text: "text-amber-600",
    },
  };

  const c = colorMap[color];

  return (
    <div className={`flex items-center space-x-3.5 p-4 rounded-2xl border ${c.bg} ${c.border}`}>
      <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center text-white shadow-sm`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-black ${c.text}`}>{value}</p>
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Credential Create/Edit Drawer
// ─────────────────────────────────────────────────────────────────────────────

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingCredential: BrandCredential | null;
  orgNames: string[];
  executionOwners?: string[];
  campaigns: CampaignSummary[];
  onSaved: () => void;
  onError: (msg: string) => void;
}

const CredentialDrawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  editingCredential,
  orgNames,
  executionOwners = [],
  campaigns = [],
  onSaved,
  onError,
}) => {
  const [orgName, setOrgName] = useState("");
  const [customOrg, setCustomOrg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("BRAND_CLIENT");
  const [notes, setNotes] = useState("");
  const [campaignAccessMode, setCampaignAccessMode] = useState<CampaignAccessMode>("ALL");
  const [assignedCampaignIds, setAssignedCampaignIds] = useState<string[]>([]);
  const [campaignSearch, setCampaignSearch] = useState<string>("");
  const [showAllOrgsCampaigns, setShowAllOrgsCampaigns] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingCredential) {
      setOrgName(editingCredential.org_name);
      setCustomOrg("");
      setUsername(editingCredential.portal_username);
      setPassword(editingCredential.portal_password);
      setRole(editingCredential.role);
      setNotes(editingCredential.notes || "");
      setCampaignAccessMode(editingCredential.campaign_access_mode || "ALL");
      setAssignedCampaignIds(editingCredential.assigned_campaign_ids || []);
    } else {
      setOrgName("");
      setCustomOrg("");
      setUsername("");
      setPassword("");
      setRole("BRAND_CLIENT");
      setNotes("");
      setCampaignAccessMode("ALL");
      setAssignedCampaignIds([]);
    }
    setCampaignSearch("");
    setShowAllOrgsCampaigns(false);
    setShowPassword(false);
  }, [editingCredential, isOpen]);

  // Close org dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentOrg = orgName === "__custom__" ? customOrg.trim() : orgName;

  // Filter campaigns available for selection
  const availableCampaigns = useMemo(() => {
    if (!currentOrg || showAllOrgsCampaigns || role === "PERFORMANCE_ANALYST") {
      return campaigns;
    }

    if (role === "EMPLOYEE") {
      // Find campaigns where this employee is execution_owner or xcelerate_poc
      const matching = campaigns.filter(c => 
        (c.execution_owners && c.execution_owners.some(o => o.toLowerCase() === currentOrg.toLowerCase())) ||
        c.xcelerate_poc.toLowerCase() === currentOrg.toLowerCase()
      );
      return matching.length > 0 ? matching : campaigns;
    }

    // For brand/agency: find campaigns matching this client organization
    const matching = campaigns.filter(c => c.org_name.toLowerCase() === currentOrg.toLowerCase());
    return matching.length > 0 ? matching : campaigns;
  }, [campaigns, currentOrg, showAllOrgsCampaigns, role]);

  // Search filter across campaign name, month, execution lead, organization
  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.toLowerCase().trim();
    if (!q) return availableCampaigns;
    return availableCampaigns.filter(c => {
      const matchName = c.campaign_name.toLowerCase().includes(q);
      const matchMonth = c.campaign_month.toLowerCase().includes(q);
      const matchOrg = c.org_name.toLowerCase().includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      const matchLeads = c.execution_owners?.some(o => o.toLowerCase().includes(q));
      const matchPoc = c.xcelerate_poc.toLowerCase().includes(q);
      return matchName || matchMonth || matchOrg || matchId || matchLeads || matchPoc;
    });
  }, [availableCampaigns, campaignSearch]);

  const handleSave = async () => {
    const finalOrg = orgName === "__custom__" ? customOrg.trim() : orgName;
    if (!finalOrg || !username.trim() || !password.trim()) {
      onError("All fields are required (Org, Username, Password)");
      return;
    }

    if (campaignAccessMode === "SPECIFIC" && assignedCampaignIds.length === 0) {
      onError("Please select at least one campaign, or choose 'All Campaigns for this Client'.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCredential) {
        const result = await updateCredential(editingCredential.id, {
          org_name: finalOrg,
          portal_username: username.trim(),
          portal_password: password.trim(),
          role,
          notes: notes.trim(),
          campaign_access_mode: campaignAccessMode,
          assigned_campaign_ids: campaignAccessMode === "SPECIFIC" ? assignedCampaignIds : [],
        });
        if (!result.success) { onError(result.error || "Update failed"); return; }
      } else {
        const result = await createCredential({
          org_name: finalOrg,
          portal_username: username.trim(),
          portal_password: password.trim(),
          role,
          notes: notes.trim() || undefined,
          campaign_access_mode: campaignAccessMode,
          assigned_campaign_ids: campaignAccessMode === "SPECIFIC" ? assignedCampaignIds : [],
        });
        if (!result.success) { onError(result.error || "Create failed"); return; }
      }
      onSaved();
    } catch (err: any) {
      onError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col"
        style={{ maxHeight: "100vh" }}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0052FF] to-[#00C2FF] text-white">
              {editingCredential ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {editingCredential ? "Edit Credential" : "Create New Credential"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {editingCredential ? `Editing ${editingCredential.org_name}` : "Set up brand/agency portal access"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-modal-scroll">
          {/* Role Selector (Top of form so user chooses role first) */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <UserCog className="w-3.5 h-3.5 text-slate-400" />
              <span>Portal Access Role</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole("BRAND_CLIENT");
                  if (!editingCredential && (!orgName || orgName === "Performance Analyst")) {
                    setOrgName(orgNames[0] || "");
                  }
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                  role === "BRAND_CLIENT"
                    ? "bg-blue-50 text-[#0052FF] border-blue-300 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>🏷️ Brand Client</div>
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">Isolated brand session</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("AGENCY_CLIENT");
                  if (!editingCredential && (!orgName || orgName === "Performance Analyst")) {
                    setOrgName(orgNames[0] || "");
                  }
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                  role === "AGENCY_CLIENT"
                    ? "bg-purple-50 text-purple-600 border-purple-300 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>🏢 Agency Client</div>
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">Isolated agency portal</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("EMPLOYEE");
                  if (!editingCredential) {
                    const defaultOwner = executionOwners[0] || "";
                    setOrgName(defaultOwner);
                    if (defaultOwner) {
                      const slug = defaultOwner.toLowerCase().replace(/[^a-z0-9]/g, "");
                      setUsername(`${slug}@xceleratemedia.in`);
                      setPassword(`Emp@${(slug || "Xcelerate").toUpperCase()}2026!`);
                    }
                  }
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                  role === "EMPLOYEE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>👤 Campaign Employee</div>
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">Own campaigns &amp; metrics only</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("PERFORMANCE_ANALYST");
                  if (!editingCredential) {
                    setOrgName("Performance Analyst");
                    setUsername("analyst@xceleratemedia.in");
                    setPassword("Analyst@Xcelerate2026!");
                  }
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                  role === "PERFORMANCE_ANALYST"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>📊 Performance Analyst</div>
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">All campaigns • Metrics only</div>
              </button>
            </div>

            {/* Dynamic Role Capability Alert */}
            <div className={`p-3 rounded-xl border text-xs space-y-1 mt-2 ${
              role === "EMPLOYEE"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                : role === "PERFORMANCE_ANALYST"
                ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
                : "bg-blue-50/70 border-blue-200 text-blue-950"
            }`}>
              <div className="font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {role === "EMPLOYEE"
                    ? "Campaign Employee Access Rules:"
                    : role === "PERFORMANCE_ANALYST"
                    ? "Performance Analyst Access Rules:"
                    : "Client Portal Access Rules:"}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                {role === "EMPLOYEE"
                  ? "Sees ONLY campaigns and creators assigned to their name (execution owner). Can fill performance metrics with screenshots and manage creator delivery stages. Settings and delete actions are permanently blocked."
                  : role === "PERFORMANCE_ANALYST"
                  ? "Can view all campaigns across the organization in read-only mode, and write/update reel performance metrics with screenshots. Commercials, campaign settings, and delete actions are permanently blocked."
                  : "Can only view campaigns belonging to this specific client organization. Internal margins, creator costs, phone numbers, and settings are completely restricted."}
              </p>
            </div>
          </div>

          {/* Organization / Employee Name */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {role === "EMPLOYEE"
                  ? "Assigned Employee Name"
                  : role === "PERFORMANCE_ANALYST"
                  ? "Department / Analyst Label"
                  : "Client Organization Name"}
              </span>
            </label>
            <div className="relative" ref={orgDropdownRef}>
              <button
                type="button"
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 hover:border-[#0052FF]/40 transition-all cursor-pointer"
              >
                <span className={orgName ? "text-slate-900" : "text-slate-400"}>
                  {orgName === "__custom__" 
                    ? (role === "EMPLOYEE" ? "Custom Employee Name" : "Custom Organization") 
                    : orgName || (role === "EMPLOYEE" ? "Select employee..." : "Select organization...")}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOrgDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {role === "EMPLOYEE" ? (
                    executionOwners.length > 0 ? (
                      executionOwners.map((owner) => (
                        <button
                          key={owner}
                          onClick={() => { 
                            setOrgName(owner); 
                            setIsOrgDropdownOpen(false);
                            if (!editingCredential) {
                              const slug = owner.toLowerCase().replace(/[^a-z0-9]/g, "");
                              setUsername(`${slug || "emp"}@xceleratemedia.in`);
                              setPassword(`Emp@${(slug || "Xcelerate").toUpperCase()}2026!`);
                            }
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                            orgName === owner
                              ? "bg-emerald-50 text-emerald-700 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          👤 {owner}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-slate-500 italic">No assigned owners found in sheet</div>
                    )
                  ) : role === "PERFORMANCE_ANALYST" ? (
                    ["Performance Analyst", "Analytics Team", "Growth Team"].map((lbl) => (
                      <button
                        key={lbl}
                        onClick={() => {
                          setOrgName(lbl);
                          setIsOrgDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                          orgName === lbl ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        📊 {lbl}
                      </button>
                    ))
                  ) : (
                    orgNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => { 
                          setOrgName(name); 
                          setIsOrgDropdownOpen(false);
                          if (!editingCredential && !username) {
                            const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
                            setUsername(`${slug || "brand"}@xceleratemedia.in`);
                            setPassword(`Brand@${(slug || "Xcelerate").toUpperCase()}2026!`);
                          }
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                          orgName === name
                            ? "bg-blue-50 text-[#0052FF] font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {name}
                      </button>
                    ))
                  )}
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={() => { 
                      setOrgName("__custom__"); 
                      setIsOrgDropdownOpen(false); 
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      orgName === "__custom__"
                        ? "bg-indigo-50 text-indigo-600 font-bold"
                        : "text-indigo-500 hover:bg-indigo-50/50"
                    }`}
                  >
                    + Add New {role === "EMPLOYEE" ? "Employee Name" : "Organization"}
                  </button>
                </div>
              )}
            </div>

            {orgName === "__custom__" && (
              <input
                type="text"
                value={customOrg}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomOrg(val);
                  if (!editingCredential && (!username || username.endsWith("@xceleratemedia.in"))) {
                    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const prefix = role === "EMPLOYEE" ? "emp" : "brand";
                    setUsername(`${slug || prefix}@xceleratemedia.in`);
                    setPassword(`${role === "EMPLOYEE" ? "Emp" : "Brand"}@${(slug || "Xcelerate").toUpperCase()}2026!`);
                  }
                }}
                placeholder={role === "EMPLOYEE" ? "Enter employee name (e.g. Rohan Mehra)..." : "Enter new organization name..."}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all mt-1.5"
              />
            )}
          </div>

          {/* Campaign Access Scope & Granular Assignment */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-[#0052FF]" />
                <span>Campaign Access Scope</span>
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                campaignAccessMode === "ALL" 
                  ? "bg-blue-50 text-[#0052FF]" 
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {campaignAccessMode === "ALL" ? "All Campaigns" : `${assignedCampaignIds.length} Selected`}
              </span>
            </div>

            {/* Scope Selection Cards */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCampaignAccessMode("ALL")}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  campaignAccessMode === "ALL"
                    ? "bg-blue-50/80 border-[#0052FF] text-[#0052FF] shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs">
                  <Globe className="w-3.5 h-3.5" />
                  <span>All Campaigns</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-1 leading-snug">
                  Full client view: grants access to all current and future campaigns for this organization.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCampaignAccessMode("SPECIFIC")}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  campaignAccessMode === "SPECIFIC"
                    ? "bg-amber-50/80 border-amber-400 text-amber-800 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Specific Campaigns</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-1 leading-snug">
                  Granular access: client can ONLY access campaigns explicitly checked below.
                </div>
              </button>
            </div>

            {/* Granular Campaign Multi-Select List (Visible only when SPECIFIC is selected) */}
            {campaignAccessMode === "SPECIFIC" && (
              <div className="space-y-2.5 p-3 bg-slate-50/80 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Search Bar & Batch Select Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Search campaigns, months, lead (e.g. Payal)..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]"
                    />
                    {campaignSearch && (
                      <button
                        type="button"
                        onClick={() => setCampaignSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Quick Select All / Clear Buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newIds = Array.from(new Set([...assignedCampaignIds, ...filteredCampaigns.map(c => c.id)]));
                        setAssignedCampaignIds(newIds);
                      }}
                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold text-[#0052FF] hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignedCampaignIds([])}
                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Filter Scope Indicator / Toggle */}
                {currentOrg && (
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                    <span>
                      {showAllOrgsCampaigns ? "Showing all organization campaigns" : `Showing ${currentOrg} campaigns (${availableCampaigns.length})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllOrgsCampaigns(!showAllOrgsCampaigns)}
                      className="text-[10px] font-bold text-[#0052FF] hover:underline cursor-pointer"
                    >
                      {showAllOrgsCampaigns ? `Filter to ${currentOrg} only` : "Show all organizations"}
                    </button>
                  </div>
                )}

                {/* Campaign Checklist Scroll Container */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5 custom-modal-scroll">
                  {filteredCampaigns.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
                      <p className="font-semibold text-slate-700">No campaigns found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentOrg && !showAllOrgsCampaigns
                          ? `No campaigns found for "${currentOrg}". Try clicking "Show all organizations" above.`
                          : "Try adjusting your search terms."}
                      </p>
                    </div>
                  ) : (
                    filteredCampaigns.map((c) => {
                      const isChecked = assignedCampaignIds.includes(c.id);
                      const executionLead = c.execution_owners && c.execution_owners.length > 0 
                        ? c.execution_owners.join(", ") 
                        : (c.xcelerate_poc || "Team Xcelerate");

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (isChecked) {
                              setAssignedCampaignIds(assignedCampaignIds.filter(id => id !== c.id));
                            } else {
                              setAssignedCampaignIds([...assignedCampaignIds, c.id]);
                            }
                          }}
                          className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-blue-50/90 border-[#0052FF]/50 shadow-2xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          {/* Styled Checkbox */}
                          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? "bg-[#0052FF] text-white" : "border border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          {/* Campaign Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                                {c.campaign_name}
                              </p>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                                {c.campaign_month}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] font-semibold text-slate-600">
                                🏢 {c.org_name}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                👤 Lead: {executionLead}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                👥 {c.deliverables_count || 0} creators
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Count Indicator Footer */}
                <div className="flex items-center justify-between pt-1 px-1 text-[11px] font-semibold">
                  <span className={assignedCampaignIds.length === 0 ? "text-amber-600 font-bold" : "text-emerald-700"}>
                    {assignedCampaignIds.length === 0 
                      ? "⚠️ Please select at least 1 campaign" 
                      : `✓ ${assignedCampaignIds.length} campaign${assignedCampaignIds.length === 1 ? "" : "s"} authorized`}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Strict zero-leakage guarantee
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Username / Email */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Portal Username / Email</span>
              </label>
              {(orgName || customOrg) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = orgName === "__custom__" ? customOrg : orgName;
                    const slug = target.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const prefix = role === "EMPLOYEE" ? "emp" : "brand";
                    setUsername(`${slug || prefix}@xceleratemedia.in`);
                  }}
                  className="text-[10px] font-bold text-[#0052FF] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-fill @xceleratemedia.in</span>
                </button>
              )}
            </div>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rohan@xceleratemedia.in"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]/40 transition-all font-mono text-xs"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Portal Password</span>
              </label>
              {(orgName || customOrg) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = orgName === "__custom__" ? customOrg : orgName;
                    const slug = target.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const prefix = role === "EMPLOYEE" ? "Emp" : "Brand";
                    setPassword(`${prefix}@${(slug || "Xcelerate").toUpperCase()}2026!`);
                    setShowPassword(true);
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Generate Password</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Strong password for portal login"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]/40 transition-all font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <StickyNote className="w-3.5 h-3.5 text-slate-400" />
              <span>Admin Notes <span className="text-slate-400 font-medium">(Optional)</span></span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this credential..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]/40 transition-all resize-none"
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-cinematic-blue flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{editingCredential ? "Save Changes" : "Create Credential"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
