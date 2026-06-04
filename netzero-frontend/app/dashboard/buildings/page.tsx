// app/dashboard/buildings/page.tsx
"use client";

import React, { useState } from "react";
import { Building2, Plus, Trash2, Edit2, Layers, Cpu, Search } from "lucide-react";

// Mock Data: Building Matrix Profiles matching the 8 UCI Dataset Vector Parameters
const mockBuildingsMatrix = [
  {
    id: "BLDG-001",
    name: "Downtown Facility Alpha",
    postcode: "EC1A 1BB",
    compactness: 0.76,
    surfaceArea: 661.5,
    wallArea: 416.5,
    roofArea: 122.5,
    height: 7.0,
    orientation: "North",
    glazingArea: "25%",
    status: "Optimized"
  },
  {
    id: "BLDG-002",
    name: "Suburban Hub Beta",
    postcode: "M1 1AE",
    compactness: 0.62,
    surfaceArea: 808.5,
    wallArea: 367.5,
    roofArea: 220.5,
    height: 3.5,
    orientation: "East",
    glazingArea: "10%",
    status: "Review Needed"
  },
  {
    id: "BLDG-003",
    name: "Commercial Complex Gamma",
    postcode: "G1 1XQ",
    compactness: 0.86,
    surfaceArea: 588.0,
    wallArea: 294.0,
    roofArea: 147.0,
    height: 7.0,
    orientation: "South",
    glazingArea: "40%",
    status: "High Intensity"
  }
];

// Mock Data: Flexible Asset Tracking mapped to specific equipment profiles
const mockFlexibleAssets = [
  { id: "AST-902", bldgId: "BLDG-001", type: "HVAC Unit", model: "Carrier Infinity 26", draw: "4.5 kW", priority: "Critical" },
  { id: "AST-411", bldgId: "BLDG-001", type: "Commercial Oven", model: "Blodgett Zephaire", draw: "11.0 kW", priority: "Flexible" },
  { id: "AST-104", bldgId: "BLDG-002", type: "Water Heat Pump", model: "Rheem ProTerra", draw: "3.8 kW", priority: "Flexible" },
  { id: "AST-773", bldgId: "BLDG-003", type: "Chiller Network", model: "Trane Stealth", draw: "22.5 kW", priority: "Critical" }
];

export default function BuildingsInventory() {
  const [selectedBldg, setSelectedBldg] = useState<string>("BLDG-001");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filter building rows based on simple search bar queries
  const filteredBuildings = mockBuildingsMatrix.filter(bldg => 
    bldg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    bldg.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter linked equipment items based on the active building row selection
  const activeAssets = mockFlexibleAssets.filter(asset => asset.bldgId === selectedBldg);

  return (
    <>
      {/* Page Heading & Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Matrix Profile Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your physical structural vector entries and their corresponding operational assets.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-500 transition-colors shrink-0">
          <Plus className="h-4 w-4" /> New Model Profile
        </button>
      </div>

      {/* Main Splitting Layout Framework */}
      <div className="space-y-8">
        
        {/* Module A: Building Vector Table (CRUD Console) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">Building Profile Matrix</h3>
            </div>
            
            {/* Search input to sort matrices locally */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search matrices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Dynamic Scrollable Data Table Container */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-medium dark:border-slate-800 dark:bg-slate-950/40">
                  <th className="p-4 font-semibold">Asset Identity</th>
                  <th className="p-4 font-semibold">Postcode</th>
                  <th className="p-4 font-semibold">Comp. ($R_c$)</th>
                  <th className="p-4 font-semibold">Surface Area</th>
                  <th className="p-4 font-semibold">Wall Area</th>
                  <th className="p-4 font-semibold">Glazing</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
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
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{bldg.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{bldg.id}</div>
                    </td>
                    <td className="p-4 font-medium font-mono text-slate-600 dark:text-slate-400">{bldg.postcode}</td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{bldg.compactness}</td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{bldg.surfaceArea} m²</td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{bldg.wallArea} m²</td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{bldg.glazingArea}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                        bldg.status === "Optimized" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50" :
                        bldg.status === "Review Needed" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" :
                        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                      }`}>
                        {bldg.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-slate-500 hover:text-blue-500 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button className="p-1 text-slate-500 hover:text-rose-500 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Module B: Sub-Inventory for Flexible Operational Assets */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-lg tracking-tight">Flexible Asset Registries</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing connected hardware components for: <span className="font-mono text-emerald-600 font-semibold">{selectedBldg}</span>
                </p>
              </div>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50 transition-colors dark:border-slate-800 dark:hover:bg-slate-800">
              <Plus className="h-3.5 w-3.5" /> Attach Asset
            </button>
          </div>

          {/* Connected Assets List Cards */}
          <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeAssets.length > 0 ? (
              activeAssets.map((asset) => (
                <div key={asset.id} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">{asset.id}</span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-slate-50 mt-0.5">{asset.type}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">{asset.model}</p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide border uppercase ${
                      asset.priority === "Critical" 
                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400"
                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400"
                    }`}>
                      {asset.priority}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Power Consumption Draw:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{asset.draw}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                <Layers className="h-8 w-8 text-slate-300" />
                No operational hardware equipment linked to this structural layout matrix.
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}