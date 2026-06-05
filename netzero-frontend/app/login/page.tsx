// app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, Building2, MapPin, ShieldCheck, HelpCircle } from "lucide-react";

export default function OnboardingGateway() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Structural Vector Fields & API Hook variables matching your PyTorch + Grid ESO specifications
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    postcode: "EC1A 1BB",
    // The 8 explicit parameters from the UCI Energy Efficiency specification required by Model A
    relativeCompactness: "0.98",
    surfaceArea: "514.50",
    wallArea: "294.00",
    roofArea: "110.25",
    overallHeight: "7.00",
    orientation: "2", // 2:North, 3:East, 4:South, 5:West
    glazingArea: "0.00",
    glazingAreaDistribution: "0",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate pipeline synchronization and route into the main operational hub
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 1200);
  };

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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core Credentials Section */}
            <div className="space-y-4">
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

            {/* Staggered Contextual Form: Only prompt for Model Parameters if Signing Up/Creating an Account */}
            {isSignUp && (
              <div className="space-y-6 pt-6 border-t border-slate-100 animate-fade-in" style={{ animationDuration: "0.4s" }}>
                
                {/* Carbon Intensity Hook Group */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">National Grid ESO Target Zone</label>
                  </div>
                  <input
                    required
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleInputChange}
                    className="w-full text-sm font-mono font-bold uppercase rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:bg-white tracking-wide"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    Used to synchronize live 24-hour regional carbon intensity telemetry vectors downstream.
                  </p>
                </div>

                {/* Model A Thermodynamic Parameter Matrix Vector Blocks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Structural Envelope Parameters z</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-slate-400 mb-1">Relative Compactness</span>
                      <input type="number" step="0.01" name="relativeCompactness" value={formData.relativeCompactness} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Surface Area ($m^2$)</span>
                      <input type="number" step="0.1" name="surfaceArea" value={formData.surfaceArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Wall Area ($m^2$)</span>
                      <input type="number" step="0.1" name="wallArea" value={formData.wallArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Roof Area ($m^2$)</span>
                      <input type="number" step="0.1" name="roofArea" value={formData.roofArea} onChange={handleInputChange} className="w-full font-mono rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/50 outline-none focus:border-emerald-500 focus:bg-white" />
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1">Overall Height ($m$)</span>
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
                    These 8 continuous structural values feed natively into the local PyTorch baseline engine to compute localized thermal insulation and load metrics.
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
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors duration-300"
            >
              {isSignUp ? "Already registered? Use an existing access profile" : "Need to onboard a new asset? Initialize structural telemetry parameters"}
            </button>
          </div>
        </div>

        {/* Footer legal placeholder */}
        <div className="text-center text-[11px] text-slate-400 font-normal">
          Protected Edge Execution Environment. Encryption Verified.
        </div>
      </div>

      {/* Right Column: Premium High-Contrast Explainer Feature Panel */}
      <div className="hidden lg:flex flex-col justify-between p-16 bg-slate-900 text-white relative overflow-hidden group">
        {/* Dynamic backdrop bloom element */}
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
              This structural map is evaluated on your edge system against Great Britain's National Grid ESO API timeline forecasts to calculate real-time load shifting decisions instantly.
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