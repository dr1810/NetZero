"use client";

import React, { useEffect, useState } from "react";
import { fetchBuildings, fetchAssets, BuildingProfile, AssetProfile } from "@/lib/api";
import { Building2, Zap, ShieldCheck, AlertCircle, Loader2, ArrowUpRight, Plus } from "lucide-react";
import NewBuildingModal from "@/components/NewBuildingModal";
export default function DashboardOverview() {
  const [buildings, setBuildings] = useState<BuildingProfile[]>([]);
  const [assets, setAssets] = useState<AssetProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [buildingsData, assetsData] = await Promise.all([
        fetchBuildings(),
        fetchAssets(),
      ]);
      setBuildings(buildingsData);
      setAssets(assetsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load orchestration metrics.");
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    };
    initialLoad();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium text-slate-500 font-sans">Synchronizing system telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl mt-12 p-6 rounded-2xl border border-red-200 bg-red-50 text-red-800 font-sans">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h3 className="font-bold text-sm">Data Synchronization Failed</h3>
        </div>
        <p className="mt-2 text-xs text-red-700 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Overview</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time twin matrix profiling.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Initialize Twin
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Digital Twins</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{buildings.length}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-3 text-blue-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monitored Assets</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{assets.length}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine Pipeline</p>
            <h3 className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Edge
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" /> Building Matrices
            </h2>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          {buildings.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No active building profiles recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2">Postcode</th>
                    <th className="pb-2">Surface Area</th>
                    <th className="pb-2">Base Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {buildings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 font-semibold text-slate-800">{b.postcode}</td>
                      <td className="py-2.5">{b.surface_area} m²</td>
                      <td className="py-2.5 font-mono text-slate-500">{b.calculated_base_load_kw} kW</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" /> Flexible Registries
            </h2>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          {assets.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No active flexible hardware registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2">Asset Identifier</th>
                    <th className="pb-2">Electrical Max</th>
                    <th className="pb-2">Modulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 font-semibold text-slate-800">{a.name}</td>
                      <td className="py-2.5 font-mono text-slate-500">{a.electrical_capacity_kw} kW</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          a.is_modulated_active 
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                            : 'bg-slate-50 text-slate-600 ring-slate-500/10'
                        }`}>
                          {a.is_modulated_active ? 'Active modulation' : 'Standby'}
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

      {/* Renders the verified component directly from your external file */}
      <NewBuildingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadDashboardData} 
      />
    </div>
  );
}