// app/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Leaf, Zap, ShieldAlert, Cpu, Building2, User, Sparkles } from "lucide-react";

// Target user segments defined in your architectural proposal
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

// Core technical capability pillars anchoring the application
const pillars = [
  { title: "Digital Twin Onboarding", desc: "Transforms physical coordinates into a computable matrix using 8 core structural engineering parameters.", icon: Building2 },
  { title: "Predictive Intensity Tracking", desc: "Ingests 24-hour temporal telemetry forecasts natively from Great Britain's National Grid ESO API stream.", icon: Zap },
  { title: "Carbon-Aware Processing Engine", desc: "Overlays structural thermal baseline predictions (Model A) against real-time carbon trends (Model B) locally via PyTorch.", icon: ShieldAlert }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500/10 selection:text-emerald-600">
      
      {/* Premium Minimal Navigation Header */}
      <header className="mx-auto max-w-7xl px-6 lg:px-8 h-20 flex items-center justify-between border-b border-slate-200/60 bg-transparent">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-emerald-500 fill-emerald-500/10" />
          <span className="font-bold text-lg tracking-tight">NetZero Cloud</span>
        </div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-all font-sans"
        >
          Launch Workspace <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative isolate pt-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          
          {/* Micro-badge Announcement */}
          <div className="mx-auto mb-6 flex max-w-fit items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/50 px-4 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10" />
            <span>Hybrid Edge-Cloud Energy Orchestration Framework</span>
          </div>

          {/* Deep Display Headings matching Apple's tight tracking rules */}
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl leading-[1.1]">
            Bridging Architectural Design with Dynamic Grid Performance
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 font-normal">
            NetZero fuses structural thermodynamic baseline forecasting with active carbon intensity telemetry, providing actionable operational schedules for smart properties.
          </p>

          {/* Call To Action Controls */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-all"
            >
              Enter Control Console <ArrowRight className="h-4 w-4" />
            </Link>
            <a 
              href="https://github.com/dr1810/NetZero" 
              target="_blank" 
              rel="noreferrer"
              className="text-sm font-semibold leading-6 text-slate-700 hover:text-slate-900 transition-colors font-mono"
            >
              view source code <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* User Segment Personas Grid Mapping */}
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
                <div key={idx} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                      <persona.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {persona.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-sm leading-relaxed text-slate-500 font-normal">
                    <p className="flex-auto">{persona.description}</p>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono tracking-wide uppercase text-slate-400">Core Protocol</span>
                      <span className="rounded-md bg-slate-50 border border-slate-200/60 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{persona.badge}</span>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Technical Architecture Feature Pillars */}
        <section className="mx-auto max-w-7xl px-6 lg:px-8 my-32 sm:my-40">
          <div className="rounded-2xl bg-slate-900 px-6 py-16 sm:p-16 lg:px-20 lg:py-24 shadow-xl border border-slate-800 text-white relative overflow-hidden">
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
                  <div key={idx} className="relative pl-12">
                    <dt className="text-base font-bold text-white flex items-center gap-2">
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow">
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
    </div>
  );
}