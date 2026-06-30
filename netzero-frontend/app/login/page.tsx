"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Leaf, ArrowRight, Building2, MapPin, ShieldCheck, HelpCircle, Loader2, AlertCircle } from "lucide-react";

const AVAILABLE_POSTCODES = [
  // --- London Area ---
  { code: "EC1A 1BB", label: "EC1A 1BB - London Central" },
  { code: "E16 4AN", label: "E16 4AN - London Docklands" },
  
  // --- Scotland Regions ---
  { code: "IV1 1SG", label: "IV1 1SG - North Scotland (Highlands)" },
  { code: "EH1 1RE", label: "EH1 1RE - South Scotland (Edinburgh)" },
  { code: "G1 1HX", label: "G1 1HX - South Scotland (Glasgow)" },
  
  // --- Northern & Central England ---
  { code: "M1 1AE", label: "M1 1AE - North West England (Manchester)" },
  { code: "NE1 1EN", label: "NE1 1EN - North East England (Newcastle)" },
  { code: "S1 2BP", label: "S1 2BP - South Yorkshire (Sheffield)" },
  { code: "B1 1TF", label: "B1 1TF - West Midlands (Birmingham)" },
  { code: "NG1 1AA", label: "NG1 1AA - East Midlands (Nottingham)" },
  
  // --- Wales ---
  { code: "LL11 1AY", label: "LL11 1AY - North Wales & Merseyside" },
  { code: "CF10 1EP", label: "CF10 1EP - South Wales (Cardiff)" },
  
  // --- Eastern & Southern England ---
  { code: "CB1 1PT", label: "CB1 1PT - East England (Cambridge)" },
  { code: "BS1 5TR", label: "BS1 5TR - South West England (Bristol)" },
  { code: "SO14 3FE", label: "SO14 3FE - Southern England (Southampton)" },
  { code: "BN1 1GE", label: "BN1 1GE - South East England (Brighton)" }
];

export default function OnboardingGateway() {
  const { login } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    postcode: "EC1A 1BB",
    relativeCompactness: "0.98",
    surfaceArea: "514.50",
    wallArea: "294.00",
    roofArea: "110.25",
    overallHeight: "7.00",
    orientation: "2",
    glazingArea: "0.00",
    glazingAreaDistribution: "0",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Normalize base URL
    const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const baseUrl = rawBase.replace(/\/+$/g, "").replace(/\/api$/i, "");

    try {
      if (isSignUp) {
        const regResponse = await fetch(`${baseUrl}/api/auth/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            password: formData.password,
          }),
        });

        if (!regResponse.ok) {
          const err = await regResponse.text().catch(() => "");
          throw new Error(err || "Registration failed.");
        }

        const regData = await regResponse.json();
        if (regData?.access || regData?.token) {
          login(regData.access || regData.token || regData);
          return;
        }

        setVerificationMessage(
          regData?.detail || "Registration complete. Check your email to verify your account."
        );
        setIsSignUp(false);
        return;
      }

      const loginResponse = await fetch(`${baseUrl}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.email, password: formData.password }),
      });

      if (!loginResponse.ok) {
        const errBody = await loginResponse.text().catch(() => "");
        throw new Error(errBody || "Invalid credentials. Handshake rejected.");
      }

      const authData = await loginResponse.json();
      login(authData.access || authData.token || authData);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred within the authentication orchestration layer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const verifyFlag = query.get("verify_email");
    const token = query.get("token");
    if (verifyFlag !== "1" || !token) return;

    const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const baseUrl = rawBase.replace(/\/+$/g, "").replace(/\/api$/i, "");

    fetch(`${baseUrl}/api/auth/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.detail || "Email verification failed.");
        }
        setVerificationMessage(data?.detail || "Email verified successfully.");
        if (data?.access || data?.token) {
          login(data.access || data.token || data);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Email verification failed.");
      });
  }, [login]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500/10 selection:text-emerald-600">
      
      {/* Left Column: Interactive Input Architecture Panel */}
      <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white border-r border-slate-200/60 overflow-y-auto max-h-screen">
        
        {/* Top Branding Bar */}
        <div className="flex items-center gap-2 animate-fade-in">
          <Leaf className="h-6 w-6 text-emerald-500 fill-emerald-500/10" />
          <span className="font-bold text-lg tracking-tight">NetZero Cloud</span>
        </div>

        {/* Center Main Dynamic Onboarding Form */}
        <div className="my-auto py-12 max-w-md w-full mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {isSignUp ? "Initialize Property Profile" : "Access Console Gateway"}
            </h1>
            <p className="text-sm text-slate-500 font-normal">
              {isSignUp 
                ? "Map structural building parameters to configure your decentralized digital twin model." 
                : "Re-engage system telemetry pipelines and shift scheduler maps."}
            </p>
          </div>

          {/* Dynamic Error Feedback Alert */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-mono leading-relaxed">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Pipeline Error:</span> {error}
              </div>
            </div>
          )}

          {verificationMessage && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-mono leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>{verificationMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core Credentials Section */}
            <div className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">First Name</label>
                    <input
                      required={isSignUp}
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Alex"
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Last Name</label>
                    <input
                      required={isSignUp}
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Taylor"
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Corporate Email Address</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@facility.com"
                  className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Secure Password Access Token</label>
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Staggered Contextual Form: Map parameters on account initialization */}
            {isSignUp && (
              <div className="space-y-6 pt-6 border-t border-slate-100 animate-fade-in" style={{ animationDuration: "0.4s" }}>
                
                {/* Carbon Intensity Hook Group Dropdown */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">National Grid ESO Target Zone</label>
                  </div>
                  
                  <select
                    required
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleInputChange}
                    className="w-full text-sm font-mono font-bold uppercase rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:bg-white tracking-wide cursor-pointer"
                  >
                    {AVAILABLE_POSTCODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    Synchronizes 24-hour regional carbon intensity telemetry vectors down to your localized grid node.
                  </p>
                </div>

                {/* Model A Thermodynamic Parameter Matrix Vector Blocks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Structural Envelope Parameters</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-slate-400 mb-1">Relative Compactness</span>
                      <input type="number" step="0.01" name="relativeCompactness" value={formData.relativeCompactness} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Surface Area (m²)</span>
                      <input type="number" step="0.1" name="surfaceArea" value={formData.surfaceArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Wall Area (m²)</span>
                      <input type="number" step="0.1" name="wallArea" value={formData.wallArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Roof Area (m²)</span>
                      <input type="number" step="0.1" name="roofArea" value={formData.roofArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Overall Height (m)</span>
                      <input type="number" step="0.1" name="overallHeight" value={formData.overallHeight} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Structural Glazing Area</span>
                      <input type="number" step="0.01" name="glazingArea" value={formData.glazingArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div className="col-span-2">
                      <span className="block text-slate-400 mb-1">Compass Orientation</span>
                      <select name="orientation" value={formData.orientation} onChange={handleInputChange} className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white">
                        <option value="2">North Orientation Vector</option>
                        <option value="3">East Orientation Vector</option>
                        <option value="4">South Orientation Vector</option>
                        <option value="5">West Orientation Vector</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal mt-1 flex gap-1 items-start">
                    <HelpCircle className="h-3 w-3 mt-0.5 text-slate-400 shrink-0" />
                    These structural values feed directly into your back-end model execution bounds to calibrate baseline thermal calculations.
                  </p>
                </div>
              </div>
            )}

            {/* Action Trigger Submit Row */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-50 font-sans"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  {isSignUp ? "Synchronize and Compile Core Account" : "Initialize Workspace Environment"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Button Gateway */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors duration-300"
            >
              {isSignUp ? "Already registered? Use an existing access profile" : "Need to onboard a new asset? Initialize structural telemetry parameters"}
            </button>
          </div>
        </div>

        {/* Footer info placeholder */}
        <div className="text-center text-[11px] text-slate-400 font-normal">
          Protected Edge Execution Environment. Encryption Verified.
        </div>
      </div>

      {/* Right Column: Premium High-Contrast Explainer Feature Panel */}
      <div className="hidden lg:flex flex-col justify-between p-16 bg-slate-900 text-white relative overflow-hidden group">
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl transition-opacity duration-1000 group-hover:bg-emerald-400/20" />
        
        <div className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase">
          Computational Pipeline Specs
        </div>

        <div className="space-y-6 max-w-md relative z-10">
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg">Hybrid Processing Paradigm</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              By collecting your property parameters upfront, NetZero automatically instantiates a local structural mathematical profile. 
            </p>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              This structural map is evaluated on your edge system against Great Britain&apos;s National Grid ESO API timeline forecasts to calculate real-time load shifting decisions instantly.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500">
          NetZero SaaS Engine // Phase 1 Active
        </div>
      </div>

      {/* Standard Apple Fade CSS Keyframes Injector */}
      <style jsx global>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}