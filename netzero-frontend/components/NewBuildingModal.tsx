// components/NewBuildingModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { createBuildingProfile, NewBuildingInput } from '@/lib/api';
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewBuildingModal({ isOpen, onClose, onSuccess }: ModalProps) {
  const [formData, setFormData] = useState<NewBuildingInput>({
    user_email: '',
    postcode: '',
    relative_compactness: 0.98,
    surface_area: 514.5,
    wall_area: 294.0,
    roof_area: 110.25,
    overall_height: 7.0,
    orientation: 2,
    glazing_area: 0.0,
    glazing_area_distribution: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = name !== 'user_email' && name !== 'postcode';
    setFormData((prev) => ({ ...prev, [name]: isNumeric ? parseFloat(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createBuildingProfile(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error onboarding twin instance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
          <h3 className="text-xl font-bold">Initialize Thermodynamic Vector</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">User Email</label>
              <input type="email" name="user_email" required value={formData.user_email} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">UK Postcode</label>
              <input type="text" name="postcode" required value={formData.postcode} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Surf. Area</label>
              <input type="number" step="any" name="surface_area" value={formData.surface_area} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Wall Area</label>
              <input type="number" step="any" name="wall_area" value={formData.wall_area} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Roof Area</label>
              <input type="number" step="any" name="roof_area" value={formData.roof_area} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Height</label>
              <input type="number" step="any" name="overall_height" value={formData.overall_height} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Compactness</label>
              <input type="number" step="any" name="relative_compactness" value={formData.relative_compactness} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Orientation</label>
              <select name="orientation" value={formData.orientation} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-white dark:bg-slate-950">
                <option value={2}>North (2)</option>
                <option value={3}>East (3)</option>
                <option value={4}>South (4)</option>
                <option value={5}>West (5)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Glazing</label>
              <input type="number" step="any" name="glazing_area" value={formData.glazing_area} onChange={handleChange} className="w-full text-sm p-2 border rounded-lg bg-transparent" />
            </div>
          </div>

          {error && <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200">{error}</div>}

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2.5 rounded-lg text-sm mt-4 disabled:bg-slate-400">
            <Sparkles className="h-4 w-4" /> {loading ? 'Running Edge PyTorch Matrix Pipeline...' : 'Initialize Live Digital Twin'}
          </button>
        </form>
      </div>
    </div>
  );
}