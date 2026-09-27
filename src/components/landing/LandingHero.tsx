"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { BrandCredential, Role } from "@/lib/types";
import { verifyLogin } from "@/lib/db/actions";
import { 
  ArrowRight, 
  X, 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Loader2
} from "lucide-react";

// Dynamically import FloatingLines with SSR disabled
const FloatingLines = dynamic(() => import("./FloatingLines"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#F8FAFC]" />
});

interface LandingHeroProps {
  onEnterPlatform: (
    role?: Role, 
    org?: string, 
    initialTab?: "pipeline" | "analytics" | "financials" | "settings",
    matchedCredential?: BrandCredential | null
  ) => void;
  credentials?: BrandCredential[];
}

export function LandingHero({ onEnterPlatform }: LandingHeroProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Form Inputs: Clean email/username and password
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const id = loginIdentifier.trim();
    const pass = password.trim();

    if (!id) {
      setLoginError("Please enter your email or organization identifier.");
      return;
    }

    if (!pass) {
      setLoginError("Please enter your portal access password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyLogin(id, pass);
      if (!res.success) {
        setLoginError(res.error || "Authentication failed. Please verify credentials.");
        return;
      }

      const credRole = res.role || "BRAND_CLIENT";
      if (credRole === "SUPER_ADMIN" || credRole === "INTERNAL_OPS") {
        onEnterPlatform("SUPER_ADMIN", "All Organizations", "pipeline", res.credential);
      } else if (credRole === "EMPLOYEE") {
        const employeeName = res.credential?.notes?.trim() || res.credential?.portal_username.split("@")[0] || res.orgName || "Employee";
        onEnterPlatform("EMPLOYEE", employeeName, "pipeline", res.credential);
      } else if (credRole === "PERFORMANCE_ANALYST") {
        onEnterPlatform("PERFORMANCE_ANALYST", "All Organizations", "pipeline", res.credential);
      } else {
        onEnterPlatform(credRole as any, res.orgName || "Brand Client", "pipeline", res.credential);
      }
    } catch (err: any) {
      setLoginError(err.message || "Login failed. Please check network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* ── Background Three.js WebGL Floating Lines (Light Mode) ───────── */}
      <div className="absolute inset-0 z-0">
        <FloatingLines
          theme="light"
          enabledWaves={["top", "middle", "bottom"]}
          lineCount={8}
          lineDistance={6}
          animationSpeed={0.9}
          interactive={true}
          bendRadius={6.5}
          bendStrength={-2.0}
          mouseDamping={0.16}
          parallax={true}
          parallaxStrength={0.15}
          topWavePosition={{ x: 9.0, y: 0.65, rotate: -0.15 }}
          middleWavePosition={{ x: 5.0, y: -0.22, rotate: 0.0 }}
          bottomWavePosition={{ x: 2.0, y: -0.75, rotate: -0.18 }}
          linesGradient={["#0052FF", "#0045D8", "#1D4ED8", "#2563EB", "#0284C7", "#0EA5E9"]}
          mixBlendMode="normal"
        />
        {/* Subtle center ambient cushion focused behind text for 100% legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgba(248,250,252,0.85)_0%,rgba(248,250,252,0.25)_65%,transparent_100%)] pointer-events-none" />
      </div>

      {/* ── Enterprise Platform Navbar (Client View) ── */}
      <header className="relative z-20 w-full border-b border-slate-200/90 bg-white shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Company Logo & Brand Identity */}
          <div className="flex items-center space-x-3 sm:space-x-4 select-none">
            <div className="relative flex items-center">
              <img
                src="/xcelerate-logo-light.png"
                alt="Xcelerate Media"
                className="h-8 sm:h-11 w-auto object-contain drop-shadow-xs"
              />
            </div>

            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  PULSE
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-[#0052FF] border border-blue-200/80">
                  CLIENT PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">Execution Tracker &amp; Multi-Day Analytics</p>
            </div>
          </div>

          {/* Center: Live Execution Status */}
          <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-800 font-bold">Live Execution Feed</span>
            <span className="text-[10px] text-slate-400">•</span>
            <span className="text-[11px] text-slate-500 font-medium">Real-Time Sync</span>
          </div>

          {/* Right Action: Client Login Only */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                setIsLoginModalOpen(true);
                setLoginError("");
              }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Client Login</span>
            </button>
          </div>

        </div>
      </header>

      {/* ── Main Hero Stage (Clean, Pristine Light Typography) ─────────────── */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 flex-1 flex flex-col items-center justify-center text-center pointer-events-none my-auto">
        
        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 max-w-3xl leading-[1.08]">
          Influencer Marketing. <br className="hidden sm:inline" />
          <span className="text-[#0052FF]">
            Engineered for Scale.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed px-2">
          The centralized execution engine for high-growth consumer brands. Connecting live creator operations with enterprise campaign tracking.
        </p>

        {/* Hero Action Button (Single Clean Client Portal Access) */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center w-full pointer-events-auto gap-3">
          <button
            onClick={() => {
              setIsLoginModalOpen(true);
              setLoginError("");
            }}
            className="px-8 py-3.5 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white font-bold text-sm shadow-xl shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2.5 cursor-pointer group"
          >
            <Building2 className="w-4 h-4 text-white" />
            <span>Enter Brand Portal</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-[11px] text-slate-400 font-medium">
            Protected by 256-bit encryption • Live Agency &amp; Brand Portal Access
          </p>
        </div>

      </main>

      {/* ── Client Authentication Modal (Privacy-First Credentials Form) ─ */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 text-slate-900 space-y-5">
            
            {/* Modal Header & Close */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-[#0052FF] text-xs font-bold uppercase tracking-wider mb-1">
                  <Building2 className="w-4 h-4" />
                  <span>Client Authentication</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Access Your Brand Portal
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your assigned credentials to view real-time influencer campaign execution.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setLoginError("");
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Work Email / Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Work Email or Organization ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. brand@xceleratemedia.in or Organization"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Portal Access Password
                  </label>
                  <span className="text-[11px] text-slate-400">Encrypted</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 leading-relaxed animate-in fade-in duration-150">
                  {loginError}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Secure Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400">
                    Enterprise client access • Protected by 256-bit encryption
                  </p>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
