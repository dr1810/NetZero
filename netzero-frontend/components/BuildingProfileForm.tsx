"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function BuildingProfileForm() {
  const [formData, setFormData] = useState({
    name: "",
    postcode: "",
    relative_compactness: "",
    surface_area: "",
    wall_area: "",
    roof_area: "",
    overall_height: "",
    orientation: "",
    glazing_area: "",
    glazing_area_distribution: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      postcode: formData.postcode,
      relative_compactness: parseFloat(formData.relative_compactness),
      surface_area: parseFloat(formData.surface_area),
      wall_area: parseFloat(formData.wall_area),
      roof_area: parseFloat(formData.roof_area),
      overall_height: parseFloat(formData.overall_height),
      orientation: parseInt(formData.orientation),
      glazing_area: parseFloat(formData.glazing_area),
      glazing_area_distribution: parseInt(formData.glazing_area_distribution),
    };

    try {
      const response = await fetch("http://localhost:8000/api/buildings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        alert("Building Digital Twin created successfully!");
        setFormData({
          name: "", postcode: "", relative_compactness: "", surface_area: "",
          wall_area: "", roof_area: "", overall_height: "", orientation: "",
          glazing_area: "", glazing_area_distribution: "",
        });
      } else {
        alert("Error saving building profile.");
      }
    } catch (error) {
      console.error("Backend connection failed:", error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-zinc-950 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Thermodynamic Digital Twin Onboarding</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Provide your facility&apos;s physical vector metadata to initialize baseline thermal load calculations.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Building Name</Label>
              <Input id="name" name="name" placeholder="e.g., London HQ Office" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode" className="text-sm font-medium">UK Postcode</Label>
              <Input id="postcode" name="postcode" placeholder="e.g., SW1A 1AA" value={formData.postcode} onChange={handleChange} required />
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              UCI Dataset Architecture Parameters
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* UCI Dataset Parameter Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="relative_compactness">Relative Compactness</Label>
              <Input id="relative_compactness" name="relative_compactness" type="number" step="any" placeholder="e.g., 0.98" value={formData.relative_compactness} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surface_area">Surface Area (m²)</Label>
              <Input id="surface_area" name="surface_area" type="number" step="any" placeholder="e.g., 514.5" value={formData.surface_area} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wall_area">Wall Area (m²)</Label>
              <Input id="wall_area" name="wall_area" type="number" step="any" placeholder="e.g., 294.0" value={formData.wall_area} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roof_area">Roof Area (m²)</Label>
              <Input id="roof_area" name="roof_area" type="number" step="any" placeholder="e.g., 110.25" value={formData.roof_area} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overall_height">Overall Height (m)</Label>
              <Input id="overall_height" name="overall_height" type="number" step="any" placeholder="e.g., 7.0" value={formData.overall_height} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation Value (2-5)</Label>
              <Input id="orientation" name="orientation" type="number" min="2" max="5" placeholder="e.g., 2" value={formData.orientation} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="glazing_area">Glazing Area Ratio</Label>
              <Input id="glazing_area" name="glazing_area" type="number" step="any" placeholder="e.g., 0.10" value={formData.glazing_area} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="glazing_area_distribution">Glazing Distribution Array (1-5)</Label>
              <Input id="glazing_area_distribution" name="glazing_area_distribution" type="number" min="1" max="5" placeholder="e.g., 1" value={formData.glazing_area_distribution} onChange={handleChange} required />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button type="submit" className="w-full font-medium transition-colors">
            Generate Digital Twin Matrix
          </Button>
        </div>
      </form>
    </div>
  );
}