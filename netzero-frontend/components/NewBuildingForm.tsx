"use client";

import React, { useState } from "react";
import { createBuildingProfile, NewBuildingInput } from "@/lib/api";
import { Cpu, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";

const AVAILABLE_POSTCODES = [
  { code: "EC1A 1BB", label: "EC1A 1BB - London Central" },
  { code: "E16 4AN", label: "E16 4AN - London Docklands" },
  { code: "IV1 1SG", label: "IV1 1SG - North Scotland (Highlands)" },
  { code: "EH1 1RE", label: "EH1 1RE - South Scotland (Edinburgh)" },
  { code: "G1 1HX", label: "G1 1HX - South Scotland (Glasgow)" },
  { code: "M1 1AE", label: "M1 1AE - North West England (Manchester)" },
  { code: "NE1 1EN", label: "NE1 1EN - North East England (Newcastle)" },
  { code: "S1 2BP", label: "S1 2BP - South Yorkshire (Sheffield)" },
  { code: "B1 1TF", label: "B1 1TF - West Midlands (Birmingham)" },
  { code: "NG1 1AA", label: "NG1 1AA - East Midlands (Nottingham)" },
  { code: "LL11 1AY", label: "LL11 1AY - North Wales & Merseyside" },
  { code: "CF10 1EP", label: "CF10 1EP - South Wales (Cardiff)" },
  { code: "CB1 1PT", label: "CB1 1PT - East England (Cambridge)" },
  { code: "BS1 5TR", label: "BS1 5TR - South West England (Bristol)" },
  { code: "SO14 3FE", label: "SO14 3FE - Southern England (Southampton)" },
  { code: "BN1 1GE", label: "BN1 1GE - South East England (Brighton)" }
];

interface FormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void; 
}

export default function NewBuildingForm({ isOpen, onClose, onSuccess }: FormProps) {
  const [formData, setFormData] = useState<NewBuildingInput>({
    user_email: "",
    postcode: "EC1A 1BB", // Default to first item
    relative_compactness: 0.7,
    surface_area: 150,
    wall_area: 120,
    roof_area: 80,
    overall_height: 3.5,
    orientation: 2,
    glazing_area: 0.25,
    glazing_area_distribution: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);

  if (!isOpen) return null;

  // Updated to handle both select and input elements
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInferenceResult(null);

    try {
      const result = await createBuildingProfile(formData);
      setInferenceResult(result);
      await onSuccess(); 
      
      setTimeout(() => {
        onClose();
        setInferenceResult(null); 
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || "Engine validation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl font-sans max-h-[90vh] overflow-y-auto">
        
        <button onClick={onClose} type="button" className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Cpu className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base font-bold text-slate-900">Initialize Digital Twin Telemetry</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Operator Email</label>
              <input
                type="email"
                name="user_email"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
                placeholder="operator@netzero.internal"
                value={formData.user_email}
                onChange={handleInputChange}
              />
            </div>
            
            {/* UPDATED: Postcode Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">UK Postcode</label>
              <select
                name="postcode"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500 bg-white"
                value={formData.postcode}
                onChange={handleInputChange}
              >
                {AVAILABLE_POSTCODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ... rest of your fields remain unchanged ... */}
          
        </form>
      </div>
    </div>
  );
}