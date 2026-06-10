"use client";

import React, { useState } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area 
} from "recharts";
import { 
  TrendingDown, 
  Zap, 
  Sliders, 
  Cpu, 
  Sparkles, 
  Activity, 
  ShieldCheck 
} from "lucide-react";

// --- Mock Datasets matching the Great Britain National Grid ESO API Streams ---
const telemetryForecastData = [
  { time: "00:00", gridIntensity: 180, modelBaseline: 140, optimizedDraw: 120 },
  { time: "04:00", gridIntensity: 195, modelBaseline: 145, optimizedDraw: 120 },
  { time: "08:00", gridIntensity: 240, modelBaseline: 160, optimizedDraw: 150 }, // Peak Grid Stress
  { time: "12:00", gridIntensity: 150, modelBaseline: 155, optimizedDraw: 110 }, // High Renewable Mix
  { time: "16:00", gridIntensity: 210, modelBaseline: 165, optimizedDraw: 140 },
  { time: "20:00", gridIntensity: 265, modelBaseline: 170, optimizedDraw: 160 }, // Peak Grid Stress
  { time: "23:59", gridIntensity: 170, modelBaseline: 135, optimizedDraw: 115 },
];

const buildingEfficiencyMatrix = [
  { name: "Asset DB_01", structuralLoss: 4.2, carbonCeiling: 120 },
  { name: "Asset DB_02", structuralLoss: 2.8, carbonCeiling: 95 },
  { name: "Asset DB_03", structuralLoss: 5.1, carbonCeiling: 160 },
  { name: "Asset DB_04", structuralLoss: 1.2, carbonCeiling: 50 }, // Your newly added EC1A1BB twin!
];

export default function AnalyticsPage() {
  // --- What-If Retrofit Sandbox State Controls ---
  const [glazingUValue, setGlazingUValue] = useState<number>(1.2);
  const [hvacEfficiency, setHvacEfficiency] = useState<number>(85);

  // Dynamic calculations simulating your PyTorch Edge Inference layer adjustments
  const calculatedCarbonMitigation = ((1.2 - glazingUValue) * 15 + (hvacEfficiency - 85) * 0.8).toFixed(1);
  const projectedGridStressBuffer = (parseFloat(calculatedCarbonMitigation) * 1.34).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-8 animate-fade-in text-slate-900 selection:bg-emerald-500/10 selection:text-emerald-600">
      
      {/* Dashboard Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider uppercase text-emerald-600 mb-1">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>Telemetry Processing Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grid Analytics Console</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-referencing thermodynamic building twins with active National Grid intensity metrics.
          </p>
        </div>
        
        {/* Active System Status Toggles */}
        <div className="flex items-center gap-3 self-start md:self-center bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold text-slate-600 font-sans">PyTorch Core Inferences Live</span>
        </div>
      </div>

      {/* --- Top Row Performance Metrics Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 font-mono tracking-wider uppercase">Current Grid Bias</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">212 gCO₂/kWh</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 font-mono tracking-wider uppercase">Edge Shift Window</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">11:30 - 14:15</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 font-mono tracking-wider uppercase">Active Carbon Avoided</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">18.42% Daily Saved</h3>
          </div>
        </div>
      </div>

      {/* --- Middle Row: Primary Chart Analytics Framework --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: 24-Hour Intensity Forecast Line Plot */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">National Grid Intensity Tracking</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-6">Model A (Thermodynamic Infiltration) vs Model B (Grid Intensity Matrix)</p>
          </div>
          
          {/* PARENT CONTAINER FIXED HEIGHT FOR RECHARTS IN NEXT.JS TURBOPACK */}
          <div className="w-full h-[320px] pr-4 text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryForecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: "15px" }} />
                <Line type="monotone" dataKey="gridIntensity" name="Grid carbon intensity" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="modelBaseline" name="Model A thermal load" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="optimizedDraw" name="Optimized consumption profile" stroke="#10b981" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Digital Twin Matrix Asset Distribution Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Structural Twin Matrix Calibration</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-6">Evaluating localized structural thermal loss variables against carbon target caps.</p>
          </div>

          {/* PARENT CONTAINER FIXED HEIGHT FOR RECHARTS IN NEXT.JS TURBOPACK */}
          <div className="w-full h-[320px] pr-4 text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buildingEfficiencyMatrix}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: "15px" }} />
                <Bar dataKey="structuralLoss" name="Thermal infiltration multiplier" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="carbonCeiling" name="Daily ceiling limit (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* --- Bottom Row: What-If Retrofit Simulation Sandbox --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Simulator Parameters Column */}
        <div className="space-y-6 lg:border-r lg:border-slate-200 lg:pr-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider uppercase text-amber-600 mb-1">
              <Sliders className="h-3.5 w-3.5" />
              <span>Interactive Simulator</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">What-If Retrofit Sandbox</h2>
            <p className="text-xs text-slate-400 mt-0.5">Adjust physical materials engineering properties to simulate optimized grid alignment.</p>
          </div>

          {/* Slider Element A */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="text-slate-600">Glazing Blueprint (U-Value)</label>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{glazingUValue} W/m²K</span>
            </div>
            <input 
              type="range" 
              min="0.4" 
              max="2.8" 
              step="0.1"
              value={glazingUValue} 
              onChange={(e) => setGlazingUValue(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Triple Glazed (0.4)</span>
              <span>Single Glass (2.8)</span>
            </div>
          </div>

          {/* Slider Element B */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="text-slate-600">HVAC Plant Loop Performance</label>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{hvacEfficiency}% COP</span>
            </div>
            <input 
              type="range" 
              min="60" 
              max="100" 
              step="1"
              value={hvacEfficiency} 
              onChange={(e) => setHvacEfficiency(parseInt(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Legacy Plant (60%)</span>
              <span>Variable Inverter (100%)</span>
            </div>
          </div>
        </div>

        {/* Predictive Impact Output Column */}
        <div className="flex flex-col justify-between bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono tracking-widest uppercase text-emerald-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Projected Matrix Yield</span>
            </div>
            <h3 className="text-sm font-medium text-slate-300 leading-relaxed">
              Modulating your structural enclosure parameters shifts your overall digital twin framework allocation into clean grid periods.
            </h3>
          </div>

          <div className="mt-6 space-y-4 relative z-10 border-t border-slate-800 pt-4">
            <div>
              <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Carbon Offset Delta</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-bold tracking-tight text-emerald-400">-{calculatedCarbonMitigation}%</span>
                <span className="text-xs font-semibold text-slate-400">gCO₂ Offset</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Estimated Local Storage Buffer</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-white">+{projectedGridStressBuffer} kW</span>
                <span className="text-xs font-medium text-slate-400">Thermal Inertia Capacity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Certificate Summary Column */}
        <div className="border border-slate-200 rounded-xl p-6 flex flex-col justify-between bg-white shadow-inner">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider uppercase text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Compliance Appraisal</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">GB Grid Integration Audit</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              If this simulated structural baseline configuration is fully compiled, your complete building architecture drops below the regional carbon penalties matrix safely.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-[11px] font-mono text-slate-500 mt-4">
            <span className="font-bold text-slate-700">Inference Status:</span> Compliant with carbon thresholds configured inside your <code className="text-emerald-600 bg-emerald-50 px-1 rounded font-semibold">config/settings.py</code> matrix array bounds.
          </div>
        </div>

      </div>

    </div>
  );
}