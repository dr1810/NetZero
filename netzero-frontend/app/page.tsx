// app/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Leaf, Zap, ShieldAlert, Cpu, Building2, User, Sparkles, PlusCircle } from "lucide-react";

const personas = [
  {
    title: "Homeowners",
    description: "Mitigate HVAC cycling traps. Calculate localized thermal inertia to maintain stable indoor temperatures without continuous grid draw.",
    icon: User,
    badge: "Thermal Inertia Optimization"
  },
  {
    title: "Small Business Owners",
    description: "Flatten your facility's operational carbon profile by shifts scheduling high-draw hardware (like commercial ovens) into cleaner energy windows.",
    icon: Cpu,
    badge: "Load-Shifting Scheduler"
  },
  {
    title: "Facility Managers",
    description: "Enforce automated portfolio compliance. Establish maximum daily Carbon Ceilings that throttle secondary architectures during grid stress.",
    icon: Building2,
    badge: "Threshold Modulation"
  }
];

const pillars = [
  { title: "Digital Twin Onboarding", desc: "Transforms physical coordinates into a computable matrix using 8 core structural engineering parameters.", icon: Building2 },
  { title: "Predictive Intensity Tracking", desc: "Ingests 24-hour temporal telemetry forecasts natively from Great Britain's National Grid ESO API stream.", icon: Zap },
  { title: "Carbon-Aware Processing Engine", desc: "Overlays structural thermal baseline predictions (Model A) against real-time carbon trends (Model B) locally via PyTorch.", icon: ShieldAlert }
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, userEmail } = useAuth();

  function initialsFromEmail(email?: string | null) {
    if (!email) return "ME";
    const name = email.split("@")[0];
    const parts = name.split(/[._\-]/).filter(Boolean);
    if (parts.length === 0) return name.substring(0,2).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500/10 selection:text-emerald-600 overflow-x-hidden">
      
      {/* Navigation Header */}
      <header className="relative z-50 mx-auto max-w-7xl px-6 lg:px-8 h-20 flex items-center justify-between border-b border-slate-200/60 bg-transparent animate-[fadeInEffect_0.4s_ease-out_forwards]">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-emerald-500 fill-emerald-500/10 transition-transform duration-500 hover:rotate-12" />
          <span className="font-bold text-lg tracking-tight">NetZero Cloud</span>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <Link href="/dashboard/settings" className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors group relative z-50">
              <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-semibold">{initialsFromEmail(userEmail)}</div>
            </Link>
          ) : (
            <Link 
              href="/login" 
              className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors group relative z-50"
            >
              <User className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors duration-300" />
              <span>Sign In</span>
            </Link>
          )}

          <button
            onClick={() => router.push(isAuthenticated ? '/dashboard' : '/login')}
            className="group inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-sans relative z-50"
          >
            Launch Workspace <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* Hero Layout Container */}
      <main className="relative isolate pt-14">
        
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/12 rotate-[30deg] bg-gradient-to-tr from-emerald-200 to-emerald-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] animate-pulse duration-[8s]" />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          
          {/* Micro-badge Announcement */}
          <div className="mx-auto mb-6 flex max-w-fit items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/50 px-4 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur-md animate-[slideUpEffect_0.6s_ease-out_forwards]">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10" />
            <span>Hybrid Edge-Cloud Energy Orchestration Framework</span>
          </div>

          {/* Deep Display Headings */}
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl leading-[1.1] animate-[slideUpEffect_0.6s_ease-out_forwards] [animation-delay:100ms]">
            Bridging Architectural Design with Dynamic Grid Performance
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 font-normal animate-[slideUpEffect_0.6s_ease-out_forwards] [animation-delay:200ms]">
            NetZero fuses structural thermodynamic baseline forecasting with active carbon intensity telemetry, providing actionable operational schedules for smart properties.
          </p>

          {/* Action Row Links */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-[slideUpEffect_0.6s_ease-out_forwards] [animation-delay:300ms]">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg transition-all duration-300 group"
            >
              <PlusCircle className="h-4 w-4" />
              Initialize Digital Twin Profile
            </Link>

            <button
              onClick={() => router.push(isAuthenticated ? '/dashboard' : '/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg transition-all duration-300 group"
            >
              Enter Control Console <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* User Segment Personas Section */}
        <section className="mx-auto max-w-7xl px-6 lg:px-8 mt-32">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold uppercase tracking-wider text-emerald-600">Adaptive Implementations</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Targeted Operational Mitigations
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {personas.map((persona, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500/20 transition-all duration-500 group animate-[slideUpEffect_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${400 + idx * 50}ms` }}
                >
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 transition-colors duration-500 group-hover:bg-emerald-500 group-hover:text-white">
                      <persona.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {persona.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-sm leading-relaxed text-slate-500 font-normal">
                    <p className="flex-auto">{persona.description}</p>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono tracking-wide uppercase text-slate-400">Core Protocol</span>
                      <span className="rounded-md bg-slate-50 border border-slate-200/60 px-2 py-0.5 text-[11px] font-semibold text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200/40 transition-colors duration-500">{persona.badge}</span>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Technical Architecture Feature Pillars */}
        <section className="mx-auto max-w-7xl px-6 lg:px-8 my-32 sm:my-40">
          <div className="rounded-2xl bg-slate-900 px-6 py-16 sm:p-16 lg:px-20 lg:py-24 shadow-xl border border-slate-800 text-white relative overflow-hidden group">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl transition-opacity duration-1000 group-hover:bg-emerald-400/20" />

            <div className="relative z-10 max-w-2xl lg:text-left">
              <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-400">Pipeline Blueprints</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Core Computational Pillars
              </p>
              <p className="mt-4 text-sm text-slate-400 max-w-lg leading-relaxed">
                The full framework architecture coordinates local machine learning inferences simultaneously against external energy API pipelines.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl lg:mt-20 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 lg:max-w-none lg:grid-cols-3">
                {pillars.map((pillar, idx) => (
                  <div key={idx} className="relative pl-12 group/pillar">
                    <dt className="text-base font-bold text-white flex items-center gap-2">
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow transition-transform duration-500 group-hover/pillar:scale-110">
                        <pillar.icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      {pillar.title}
                    </dt>
                    <dd className="mt-2 text-xs leading-relaxed text-slate-400 font-normal">{pillar.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

      </main>

      {/* Global CSS Fallback Injectors */}
      <style jsx global>{`
        @keyframes slideUpEffect {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInEffect {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}