// app/dashboard/buildings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, Layers, Cpu, Search, Loader2 } from "lucide-react";
import { fetchBuildings, fetchAssets, BuildingProfile, AssetProfile } from "../../../lib/api";
import NewBuildingModal from "../../../components/NewBuildingModal";

export default function BuildingsInventory() {
  const [buildings, setBuildings] = useState<BuildingProfile[]>([]);
  const [assets, setAssets] = useState<AssetProfile[]>([]);
  const [selectedBldg, setSelectedBldg] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Core Data Aggregator
  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const bldgData = await fetchBuildings();
      const assetData = await fetchAssets();
      setBuildings(bldgData);
      setAssets(assetData);
      if (bldgData.length > 0 && !selectedBldg) {
        setSelectedBldg(bldgData[0].id); // Default to the first indexed digital twin
      }
    } catch (err) {
      console.error("Operational Fetch Collision:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const filteredBuildings = buildings.filter(bldg => 
    bldg.user_email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    bldg.postcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeAssets = assets.filter(asset => asset.building === selectedBldg);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <span className="text-sm font-medium">Synchronizing Relational Database Layers...</span>
      </div>
    );
  }

  return (
    <>
      {/* Page Heading & Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Matrix Profile Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage physical structural vector entries and their corresponding operational assets.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-500 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" /> New Model Profile
        </button>
      </div>

      <div className="space-y-8 mt-6">
        {/* Module A: Building Vector Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">Building Profile Matrix (Live)</h3>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by postcode or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-medium dark:border-slate-800 dark:bg-slate-950/40">
                  <th className="p-4 font-semibold">Instance Identity</th>
                  <th className="p-4 font-semibold">Postcode</th>
                  <th className="p-4 font-semibold">Grid Zone</th>
                  <th className="p-4 font-semibold">Base Load (PyTorch)</th>
                  <th className="p-4 font-semibold">Thermal Inertia</th>
                  <th className="p-4 font-semibold">Surface Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBuildings.map((bldg) => (
                  <tr 
                    key={bldg.id}
                    onClick={() => setSelectedBldg(bldg.id)}
                    className={`group cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${
                      selectedBldg === bldg.id ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{bldg.user_email}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">DB_ID: {bldg.id}</div>
                    </td>
                    <td className="p-4 font-medium font-mono text-slate-600 dark:text-slate-400">{bldg.postcode}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        bldg.grid_zone_id && !bldg.grid_zone_id.includes('ERROR')
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        Zone {bldg.grid_zone_id || 'Unmapped'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-600">{bldg.calculated_base_load_kw} kW</td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{bldg.thermal_inertia_coefficient}</td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{bldg.surface_area} m²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Module B: Linked Flexible Operational Assets */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-lg tracking-tight">Flexible Asset Registries</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing connected hardware components for profile: <span className="font-mono text-emerald-600 font-semibold">#{selectedBldg}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeAssets.length > 0 ? (
              activeAssets.map((asset) => (
                <div key={asset.id} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">ID: {asset.id}</span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-slate-50 mt-0.5">{asset.name}</h4>
                    </div>
                    <span className="rounded-md px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide border uppercase bg-blue-50 text-blue-700 border-blue-200">
                      {asset.criticality_classification}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Flexible Capacity Load:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{asset.electrical_capacity_kw} kW</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                <Layers className="h-8 w-8 text-slate-300" />
                No operational hardware equipment linked to this structural layout instance yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Dialog Controller */}
      <NewBuildingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadWorkspaceData} 
      />
    </>
  );
}