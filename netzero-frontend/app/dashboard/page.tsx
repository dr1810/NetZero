"use client";

import React, { useEffect, useState } from "react";
import { fetchBuildings, fetchAssets, deleteBuilding, BuildingProfile, AssetProfile } from "@/lib/api";
import { 
  Building2, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Plus, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Layers 
} from "lucide-react";
import NewBuildingModal from "@/components/NewBuildingModal";

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<BuildingProfile[]>([]);
  const [assets, setAssets] = useState<AssetProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [buildingsData, assetsData] = await Promise.all([
        fetchBuildings(),
        fetchAssets(),
      ]);
      setBuildings(buildingsData);
      setAssets(assetsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load matrix telemetry inventory.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this structural twin?")) return;
    
    try {
      await deleteBuilding(id);
      await loadDashboardData(); // Refreshes table after deletion
    } catch (err: any) {
      alert("Error deleting building: " + err.message);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute metrics for plots & data representations
  const totalBaseLoad = buildings.reduce((acc, b) => acc + (b.calculated_base_load_kw || 0), 0);
  const totalAssetCapacity = assets.reduce((acc, a) => acc + (a.electrical_capacity_kw || 0), 0);
  const activeModulationCount = assets.filter(a => a.is_modulated_active).length;

  // Max value calculators for normalization scaling in custom SVG plots
  const maxBaseLoad = buildings.length > 0 ? Math.max(...buildings.map(b => b.calculated_base_load_kw || 1)) : 1;
  const maxSurfaceArea = buildings.length > 0 ? Math.max(...buildings.map(b => b.surface_area || 1)) : 1;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium text-slate-500 font-sans tracking-tight">Syncing matrix pipeline models...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl mt-12 p-6 rounded-2xl border border-red-200 bg-red-50 text-red-800 font-sans">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h3 className="font-bold text-sm">Inventory Synchronization Failed</h3>
        </div>
        <p className="mt-2 text-xs text-red-700 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans bg-slate-50/50 min-h-screen">
      
      {/* Header Pipeline Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Matrix Core Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Thermodynamic asset twin inventory distribution profiles.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Configure Matrix Twin
        </button>
      </div>

      {/* Numerical Metrics Summary Matrix Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-600"><Building2 className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Matrices</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{buildings.length}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-3 text-blue-600"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accumulated Base Load</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalBaseLoad.toFixed(2)} kW</h3>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-600"><Zap className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Flex Capacity</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalAssetCapacity.toFixed(1)} kW</h3>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600"><Activity className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modulating Nodes</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {activeModulationCount} <span className="text-xs font-normal text-slate-400">/ {assets.length} active</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Visual Analytics Plots Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Dynamic Plot 1: Calculated Base Load Intensity Index Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Load Allocation Index</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">Comparative thermodynamic footprint metrics across registered sites.</p>
          </div>

          {buildings.length === 0 ? (
            <div className="h-48 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs italic text-slate-400">
              No inventory entries found to populate allocation plotting vectors.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {buildings.map((b) => {
                const percentage = ((b.calculated_base_load_kw || 0) / maxBaseLoad) * 100;
                return (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 font-mono font-semibold">{b.postcode}</span>
                      <span className="text-slate-900 font-bold">{b.calculated_base_load_kw?.toFixed(2)} kW</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(percentage, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Plot 2: Volumetric Surface Correlation Scatter Matrix Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Structural Configuration Scale</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Correlation mapping: footprint surface area metrics.</p>
          </div>

          {buildings.length === 0 ? (
            <div className="h-48 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs italic text-slate-400">
              Awaiting asset parameters to plot scale densities.
            </div>
          ) : (
            <div className="relative h-44 bg-slate-50/80 rounded-xl border border-slate-100 p-3 flex items-end justify-around">
              {buildings.map((b, i) => {
                const heightPercentage = ((b.surface_area || 0) / maxSurfaceArea) * 85;
                return (
                  <div key={b.id} className="flex flex-col items-center h-full justify-end group relative w-full px-1">
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono pointer-events-none whitespace-nowrap z-10">
                      {b.surface_area} m²
                    </div>
                    <div 
                      className="w-full max-w-[28px] bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-md hover:from-blue-500 transition-all duration-300 shadow-sm"
                      style={{ height: `${Math.max(heightPercentage, 12)}%` }}
                    />
                    <span className="text-[9px] font-semibold text-slate-400 font-mono mt-1.5 truncate max-w-full">
                      {b.postcode.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Datatable Telemetry Logs View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        
        {/* Buildings Inventory Database */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" /> Core Twin Specifications
            </h2>
          </div>
          {buildings.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No structural matrix rows initialized.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2.5">Target Location</th>
                    <th className="pb-2.5">Surface Area</th>
                    <th className="pb-2.5 text-right">Base Load</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {buildings.map((b) => (
                    <tr key={b.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800 font-mono">{b.postcode}</td>
                      <td className="py-3">{b.surface_area} m²</td>
                      <td className="py-3 font-mono text-emerald-600 font-bold text-right">
                        {b.calculated_base_load_kw?.toFixed(2)} kW
                      </td>
                      <td className="py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDelete(b.id)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dynamic Hardware Registry Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" /> Flexible Hardware Registries
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
              {assets.length} Nodes
            </span>
          </div>
          {assets.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No active hardware nodes registered in local pipeline.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2.5">Hardware Identifier</th>
                    <th className="pb-2.5">Capacity</th>
                    <th className="pb-2.5 text-right">Modulation Engine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{a.name}</td>
                      <td className="py-3 font-mono text-slate-500">{a.electrical_capacity_kw} kW</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          a.is_modulated_active 
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                            : 'bg-slate-50 text-slate-600 ring-slate-500/10'
                        }`}>
                          {a.is_modulated_active ? 'Active' : 'Standby'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <NewBuildingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadDashboardData} 
      />
    </div>
  );
}