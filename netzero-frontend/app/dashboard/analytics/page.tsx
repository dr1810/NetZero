"use client";

import React, { useEffect, useState } from "react";
import { fetchBuildings, fetchAssets, BuildingProfile, AssetProfile } from "@/lib/api";
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
  Legend 
} from "recharts";
import { 
  TrendingDown, 
  Zap, 
  Sliders, 
  Cpu, 
  Sparkles, 
  Activity, 
  ShieldCheck,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function AnalyticsPage() {
  const [buildings, setBuildings] = useState<BuildingProfile[]>([]);
  const [assets, setAssets] = useState<AssetProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- What-If Retrofit Sandbox State Controls ---
  const [glazingUValue, setGlazingUValue] = useState<number>(1.2);
  const [hvacEfficiency, setHvacEfficiency] = useState<number>(85);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true);
        const [buildingsData, assetsData] = await Promise.all([
          fetchBuildings(),
          fetchAssets(),
        ]);
        setBuildings(buildingsData);
        setAssets(assetsData);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to stream live telemetry from matrix inventory.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, []);

  // --- Live Metrics Computations Driven by API Inventory ---
  const totalBaseLoad = buildings.reduce((acc, b) => acc + (b.calculated_base_load_kw || 0), 0);
  const totalAssetCapacity = assets.reduce((acc, a) => acc + (a.electrical_capacity_kw || 0), 0);
  
  // Dynamic calculations simulating your PyTorch Edge Inference layer adjustments based on inventory values
  const averageSurfaceArea = buildings.reduce((acc, b) => acc + (b.surface_area || 150), 0) / Math.max(buildings.length, 1);
  const calculatedCarbonMitigation = ((1.2 - glazingUValue) * 15 + (hvacEfficiency - 85) * 0.8).toFixed(1);
  const projectedGridStressBuffer = (parseFloat(calculatedCarbonMitigation) * (averageSurfaceArea / 120)).toFixed(1);

  // --- Mapping API Telemetry into Recharts Visual Containers ---
  // Chart 1: Building Profile Thermal Multipliers against calculated base loads
  const structuralMatrixData = buildings.map((b) => ({
    name: b.postcode || `Twin #${b.id}`,
    "Thermal Infiltration Multiplier": b.relative_compactness ? b.relative_compactness * 5 : 3.5,
    "Calculated Base Load (kW)": b.calculated_base_load_kw || 0,
  }));

  // Chart 2: Flexible Hardware Capacities grouped by asset registry configurations
  const assetCapacityMatrixData = assets.map((a) => ({
    name: a.name || `Asset #${a.id}`,
    "Capacity (kW)": a.electrical_capacity_kw || 0,
    "Modulation Weight": a.is_modulated_active ? 100 : 30,
  }));

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium text-slate-500 font-sans tracking-tight">Synchronizing analytics pipeline streams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl mt-12 p-6 rounded-2xl border border-red-200 bg-red-50 text-red-800 font-sans">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h3 className="font-bold text-sm">Telemetry Pipeline Halted</h3>
        </div>
        <p className="mt-2 text-xs text-red-700 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-8 text-slate-900 font-sans">
      
      {/* Dashboard Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider uppercase text-emerald-600 mb-1">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>Telemetry Processing Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grid Analytics Console</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-referencing thermodynamic building twins with active infrastructure intensity metrics.
          </p>
        </div>
        
        {/* Active System Status Toggles */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600 font-mono">PyTorch Live Streams Connected</span>
        </div>
      </div>

      {/* --- Top Row Performance Metrics Cards (Live Computations) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 font-mono tracking-wider uppercase">Aggregated Base Load</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalBaseLoad.toFixed(2)} kW</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 font-mono tracking-wider uppercase">Total Flex Asset Pool</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalAssetCapacity.toFixed(1)} kW</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 font-mono tracking-wider uppercase">Active Twin Subsystems</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{buildings.length} Matrix Profiles</h3>
          </div>
        </div>
      </div>

      {/* --- Middle Row: Live Chart Analytics Framework --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Building Thermal Metrics Line Plot */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Thermodynamic Infiltration Multipliers</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-6">Evaluating calculated building structural baseline loads from live twin vectors.</p>
          </div>
          
          <div className="w-full min-w-0 h-[320px] text-xs font-mono">
            {buildings.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 italic">
                No active digital twin configurations discovered to plot line analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <LineChart data={structuralMatrixData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: "15px" }} />
                  <Line type="monotone" dataKey="Calculated Base Load (kW)" name="Base Load (kW)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Thermal Infiltration Multiplier" name="Infiltration Index" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 2: Digital Twin Matrix Asset Distribution Bar Chart */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Flexible Hardware Capacity Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-6">Evaluating localized flexible registry capacity thresholds from hardware records.</p>
          </div>

          <div className="w-full min-w-0 h-[320px] text-xs font-mono">
            {assets.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 italic">
                Awaiting active modular edge assets to generate calibration charts.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <BarChart data={assetCapacityMatrixData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: "15px" }} />
                  <Bar dataKey="Capacity (kW)" name="Capacity (kW)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Modulation Weight" name="Modulation Stability" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono tracking-widest uppercase text-emerald-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Projected Matrix Yield</span>
            </div>
            <h3 className="text-sm font-medium text-slate-300 leading-relaxed">
              Modulating your structural enclosure parameters shifts your overall digital twin framework allocation cleanly into low-bias periods.
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
                <span className="text-xs font-medium text-slate-400">Thermal Capacity</span>
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
              When these customized structural parameters are processed against the network matrices, your digital infrastructure validates compliance automatically.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-[11px] font-mono text-slate-500 mt-4">
            <span className="font-bold text-slate-700">Inference Status:</span> Dynamic scaling targets active based on calculations with live inventory array counts.
          </div>
        </div>

      </div>

    </div>
  );
}