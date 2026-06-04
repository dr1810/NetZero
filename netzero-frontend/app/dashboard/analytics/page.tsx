// app/dashboard/analytics/page.tsx
"use client";

import React, { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from "recharts";
import { Sliders, Wrench, HelpCircle, Info } from "lucide-react";

// Mock Data 1: 24-Hour Predictive Grid Carbon Intensity overlaid with optimized asset windows
const mockTemporalGridData = [
  { hour: "00:00", carbonIntensity: 180, recommendedAction: "Run High-Load" },
  { hour: "03:00", carbonIntensity: 140, recommendedAction: "Run High-Load" },
  { hour: "06:00", carbonIntensity: 160, recommendedAction: "Run High-Load" },
  { hour: "09:00", carbonIntensity: 240, recommendedAction: "Restrict Usage" },
  { hour: "12:00", carbonIntensity: 290, recommendedAction: "Restrict Usage" },
  { hour: "15:00", carbonIntensity: 210, recommendedAction: "Moderate" },
  { hour: "18:00", carbonIntensity: 310, recommendedAction: "Peak Crisis" },
  { hour: "21:00", carbonIntensity: 220, recommendedAction: "Moderate" },
];

// Mock Data 2: Static Thermodynamic Baseline loads computed from a standard UCI vector
const mockBaseThermalLoads = [
  { profile: "Orientation: North", heatingLoad: 24.50, coolingLoad: 28.25 },
  { profile: "Orientation: East", heatingLoad: 26.10, coolingLoad: 29.40 },
  { profile: "Orientation: South", heatingLoad: 22.30, coolingLoad: 31.15 },
  { profile: "Orientation: West", heatingLoad: 25.80, coolingLoad: 30.05 },
];

export default function AnalyticsWorkspace() {
  // Interactive State for the "What-If" Simulation parameters
  const [glazingArea, setGlazingArea] = useState<number>(0.25);
  const [compactness, setCompactness] = useState<number>(0.76);

  // Dynamic calculation mock multipliers to simulate real PyTorch variations locally
  const dynamicHeatingLoad = (24.50 * (compactness / 0.76) + (glazingArea * 12)).toFixed(2);
  const dynamicCoolingLoad = (28.25 * (0.76 / compactness) + (glazingArea * 18)).toFixed(2);

  return (
    <>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Computational Analytics Engine</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Predictive operational scheduling mapping thermodynamic loads to grid telemetry.
        </p>
      </div>

      {/* Main Grid Split: Visualizer Charts on Left, Simulator Panels on Right */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left 2 Columns: Recharts Graphs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart A: Grid Intensity Forecast & Scheduler */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                24-Hour Grid Carbon Forecast & Scheduling Windows
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Data stream tracking National Grid ESO intensity metrics (gCO₂/kWh).
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTemporalGridData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line 
                    name="Carbon Intensity (gCO₂/kWh)" 
                    type="monotone" 
                    dataKey="carbonIntensity" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart B: Baseline Thermodynamic Structural Load Mapping */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                UCI Vector Orientation Baseline Loads
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                PyTorch inferred structural base load predictions across architectural quadrants.
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockBaseThermalLoads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="profile" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }} />
                  <Legend verticalAlign="top" height={36} iconType="square" />
                  <Bar name="Heating Load (kW·h)" dataKey="heatingLoad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar name="Cooling Load (kW·h)" dataKey="coolingLoad" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Interactive "What-If" Retrofit Sandbox */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Wrench className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">"What-If" Retrofit Sandbox</h3>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 my-4 leading-relaxed">
              Mutate structural parameters interactively to simulate real-time performance impacts on the PyTorch matrix inference engine.
            </p>

            {/* Slider 1: Glazing Area Ratio */}
            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  Glazing Area Ratio <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="font-mono text-emerald-600 font-bold">{(glazingArea * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="0.4" 
                step="0.05" 
                value={glazingArea} 
                onChange={(e) => setGlazingArea(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Slider 2: Relative Compactness */}
            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  Relative Compactness <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="font-mono text-emerald-600 font-bold">{compactness}</span>
              </div>
              <input 
                type="range" 
                min="0.60" 
                max="0.98" 
                step="0.02" 
                value={compactness} 
                onChange={(e) => setCompactness(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Simulated Live Outputs Panel */}
            <div className="mt-8 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Sliders className="h-3.5 w-3.5" />
                Live Matrix Inference Estimates
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Predicted Heating Demand</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">{dynamicHeatingLoad}</span>
                  <span className="text-xs text-slate-500">kW·h</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Predicted Cooling Demand</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{dynamicCoolingLoad}</span>
                  <span className="text-xs text-slate-500">kW·h</span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 leading-normal">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                These dynamic calculations display the localized algorithmic feedback grid before establishing the active Django routing bridges.
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}