// app/dashboard/page.tsx
"use client";

import React, { useState } from "react";
import { ArrowUpRight, Zap, Thermometer, ShieldAlert, MapPin, Activity, HelpCircle } from "lucide-react";

// Mock Data: High-level KPI summary cards mapping PyTorch + Grid metrics
const mockKPIs = [
  { 
    title: "Regional Grid Carbon Intensity", 
    value: "142 gCO₂/kWh", 
    change: "Low Intensity Window", 
    icon: Zap, 
    status: "good" 
  },
  { 
    title: "Predicted Heating Load Baseline", 
    value: "24.50 kW·h", 
    change: "Optimized Orientation", 
    icon: Thermometer, 
    status: "neutral" 
  },
  { 
    title: "Active Operational Carbon Ceiling", 
    value: "250 gCO₂/kWh", 
    change: "Modulation Threshold Safe", 
    icon: ShieldAlert, 
    status: "good" 
  },
];

// Mock Data: Immediate 4-hour forecast breakdown for load-shifting scheduling
const upcomingGridWindows = [
  { time: "In 1 Hour", intensity: 135, status: "Optimal (Run High-Load)", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
  { time: "In 2 Hours", intensity: 140, status: "Optimal (Run High-Load)", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
  { time: "In 3 Hours", intensity: 210, status: "Moderate (Stagger Usage)", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
  { time: "In 4 Hours", intensity: 285, status: "Peak Spikes (Ceiling Breach)", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400" },
];

export default function DashboardOverview() {
  const [postcode, setPostcode] = useState<string>("EC1A 1BB");

  return (
    <>
      {/* Top Banner Row: Workspace Header & Location Zone Scope */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Performance Matrix</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry overlays tracking structural thermodynamics against regional grid factors.
          </p>
        </div>

        {/* Postcode Scoping Input Card */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 shrink-0">
          <MapPin className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Zone Scope:</span>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="w-24 font-mono text-sm font-bold bg-transparent outline-none text-slate-800 dark:text-slate-100 uppercase"
            placeholder="POSTCODE"
          />
        </div>
      </div>

      {/* KPI Metrics Summary Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {mockKPIs.map((kpi, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.title}</span>
              <kpi.icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{kpi.value}</span>
              <p className={`text-xs mt-1 font-medium ${
                kpi.status === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
              }`}>
                {kpi.status === "good" && "✓ "}
                {kpi.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Framework Content Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Columns: Core Computation Pipeline Block */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-lg tracking-tight">Active Computational Engine Status</h3>
          </div>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 dark:border-emerald-950/30 dark:bg-emerald-950/10">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-emerald-500 p-2 text-white shrink-0">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-400">Carbon-Aware Edge Integration Verified</h4>
                  <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-500/90 leading-relaxed">
                    The Next.js layout engine and navigation trees are running smoothly. The layout components are fully prepared to pass the 8-parameter structural vectors (z) downstream to your local PyTorch processing algorithms.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60">
                <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Model A status</span>
                Thermodynamic Base Prediction Unit: <span className="text-emerald-600 font-bold font-mono">STANDBY (MOCK)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60">
                <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Model B status</span>
                National Grid ESO Hook: <span className="text-emerald-600 font-bold font-mono">STANDBY (MOCK)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Proactive Load-Shifting Scheduler Feed */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">Load-Shifting Matrix</h3>
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 my-4 leading-relaxed">
            Upcoming tactical action windows mapped out to prevent thermal mass assets from triggering grid overload spikes.
          </p>

          <div className="space-y-3 mt-4">
            {upcomingGridWindows.map((window, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-sm"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">{window.time}</span>
                  <span className="text-xs text-slate-400 font-mono mt-0.5 block">{window.intensity} gCO₂/kWh</span>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${window.color}`}>
                  {window.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}