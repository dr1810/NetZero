// lib/api.ts

export const DJANGO_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export interface BuildingProfile {
  id: number;
  user_email: string;
  postcode: string;
  grid_zone_id: string | null;
  relative_compactness: number;
  surface_area: number;
  wall_area: number;
  roof_area: number;
  overall_height: number;
  orientation: number;
  glazing_area: number;
  glazing_area_distribution: number;
  calculated_base_load_kw: number;
  thermal_inertia_coefficient: number;
  created_at: string;
}

export interface NewBuildingInput {
  user_email: string;
  postcode: string;
  relative_compactness: number;
  surface_area: number;
  wall_area: number;
  roof_area: number;
  overall_height: number;
  orientation: number;
  glazing_area: number;
  glazing_area_distribution: number;
}

export interface AssetProfile {
  id: number;
  building: number;
  name: string;
  electrical_capacity_kw: number;
  criticality_classification: string;
  is_modulated_active: boolean;
  registered_at: string;
}

export const fetchBuildings = async (): Promise<BuildingProfile[]> => {
  const res = await fetch(`${DJANGO_BASE_URL}/buildings/`, { cache: 'no-store' });
  
  if (!res.ok) {
    // Log the actual error response from Django
    const errorData = await res.text(); 
    console.error(`API Error ${res.status}:`, errorData);
    
    throw new Error(`Failed to retrieve building matrix records: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
};

export const fetchAssets = async (): Promise<AssetProfile[]> => {
  const res = await fetch(`${DJANGO_BASE_URL}/assets/`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to retrieve flexible asset registries.');
  return res.json();
};

export const createBuildingProfile = async (payload: NewBuildingInput) => {
  const res = await fetch(`${DJANGO_BASE_URL}/buildings/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorDetails = await res.json().catch(() => ({}));
    throw new Error(errorDetails.user_email?.[0] || 'Validation constraints rejected input data.');
  }
  return res.json();
};

export const deleteBuilding = async (id: number) => {
  const res = await fetch(`${DJANGO_BASE_URL}/buildings/${id}/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to delete building profile: ${res.statusText}`);
  }
  return true;
};