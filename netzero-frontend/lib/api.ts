// lib/api.ts

export const DJANGO_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export interface BuildingProfile {
  id: number;
  owner?: number | null;
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
export interface NewAssetInput {
  building: number;
  name: string;
  electrical_capacity_kw: number;
  criticality_classification:
    | "CRITICAL"
    | "FLEXIBLE"
    | "SHEDDABLE";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const createAsset = async (
  payload: NewAssetInput
) => {
  const res = await fetch(buildUrl("/assets/"), {
    method: "POST",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(
      errorData || "Failed to register flexible asset."
    );
  }

  return res.json();
};

export const deleteAccount = async () => {
  const res = await authFetch("/auth/delete-account/", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {}

  let bodyJson: Record<string, unknown> | null = null;
  try {
    bodyJson = JSON.parse(bodyText || "null");
  } catch {}

  if (!res.ok) {
    const message =
      (isRecord(bodyJson) && typeof bodyJson.detail === "string" && bodyJson.detail) ||
      bodyText ||
      `Failed to delete account (${res.status})`;
    throw new Error(message);
  }

  return bodyJson;
};

function getAuthToken() {
  try {
    return localStorage.getItem("netzero_token");
  } catch (e) {
    return null;
  }
}

function getRefreshToken() {
  try {
    return localStorage.getItem("netzero_refresh");
  } catch (e) {
    return null;
  }
}

async function tryRefreshAccess(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(buildUrl("/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return false;

    const data = await res.json().catch(() => null);
    const newAccess = data?.access || data?.token || null;
    const newRefresh = data?.refresh || null;
    if (newAccess) {
      localStorage.setItem("netzero_token", newAccess);
      if (newRefresh) localStorage.setItem("netzero_refresh", newRefresh);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function authFetch(path: string, opts: RequestInit = {}, retry = true) {
  const headers = Object.assign({}, opts.headers || {}, buildAuthHeaders());
  const merged = Object.assign({}, opts, { headers });
  const res = await fetch(buildUrl(path), merged);
  if (res.ok) return res;

  // On 401, attempt refresh once (don't rely on response body contents)
  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshAccess();
    if (refreshed) {
      // retry once with new token
      const headers2 = Object.assign({}, opts.headers || {}, buildAuthHeaders());
      const merged2 = Object.assign({}, opts, { headers: headers2 });
      return fetch(buildUrl(path), merged2);
    } else {
      // clear tokens, show toast and redirect to login
      try { localStorage.removeItem("netzero_token"); localStorage.removeItem("netzero_refresh"); } catch (e) {}
      if (typeof window !== 'undefined') {
        try { showToast('Session expired. Redirecting to login...', 2500); } catch (e) {}
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
    }
  }

  return res;
}

function buildAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function buildUrl(path: string) {
  const raw = DJANGO_BASE_URL || "";
  const base = raw.replace(/\/+$/g, "");
  const cleanPath = path.replace(/^\/+/g, "");
  if (base.endsWith("/api")) return `${base}/${cleanPath}`;
  return `${base}/api/${cleanPath}`;
}

// Minimal toast helper (imperative, avoids adding new UI dependencies)
function showToast(message: string, timeout = 3000) {
  try {
    const id = `netzero-toast-${Date.now()}`;
    const el = document.createElement('div');
    el.id = id;
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.bottom = '16px';
    el.style.zIndex = '99999';
    el.style.background = 'rgba(17,24,39,0.95)';
    el.style.color = 'white';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 6px 20px rgba(2,6,23,0.4)';
    el.style.fontSize = '13px';
    el.innerText = message;
    document.body.appendChild(el);
    setTimeout(() => {
      try { el.style.opacity = '0'; el.remove(); } catch (e) {}
    }, timeout);
  } catch (e) {
    // fallback to alert when DOM operations fail
    try { alert(message); } catch (e) {}
  }
}

export const fetchBuildings = async (): Promise<BuildingProfile[]> => {
  const token = getAuthToken();
  if (!token) throw new Error("No access token found. Please sign in.");

  const res = await authFetch("/buildings/", { cache: "no-store" });

  if (!res.ok) {
    const errorData = await res.text().catch(() => "");
    console.error(`API Error ${res.status} on ${res.url}`);
    try {
      console.error("Response headers:", Array.from(res.headers.entries()));
    } catch (e) {}
    console.error("Response body:", errorData);

    // If still unauthorized, remove tokens
    if (res.status === 401) {
      try { localStorage.removeItem("netzero_token"); localStorage.removeItem("netzero_refresh"); } catch (e) {}
    }

    throw new Error(`Failed to retrieve building matrix records: ${res.status} - ${errorData}`);
  }

  return res.json();
};

export const fetchAssets = async (): Promise<AssetProfile[]> => {
  const token = getAuthToken();
  if (!token) throw new Error("No access token found. Please sign in.");

  const res = await fetch(buildUrl("/assets/"), {
    cache: "no-store",
    headers: buildAuthHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      try {
        const parsed = JSON.parse(body || "{}");
        if (parsed.code === "token_not_valid") localStorage.removeItem("netzero_token");
      } catch (e) {}
    }
    throw new Error("Failed to retrieve flexible asset registries.");
  }

  return res.json();
};

export const createBuildingProfile = async (payload: NewBuildingInput) => {
  const res = await authFetch("/buildings/", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Try to read JSON body first, fall back to text
  let bodyJson: Record<string, unknown> | null = null;
  let bodyText = "";
  try {
    const txt = await res.text();
    bodyText = txt;
    try {
      bodyJson = JSON.parse(txt || "null");
    } catch (e) {
      bodyJson = null;
    }
  } catch (e) {}

  if (!res.ok) {
    const detailMessage =
      isRecord(bodyJson) && typeof bodyJson.detail === "string"
        ? bodyJson.detail
        : null;
    const fallbackMessage =
      isRecord(bodyJson) && typeof bodyJson.message === "string"
        ? bodyJson.message
        : null;
    const messageFromBody = detailMessage || fallbackMessage || (typeof bodyText === "string" && bodyText.trim() ? bodyText : null);
    const payloadToThrow = {
      status: res.status,
      url: res.url,
      message: messageFromBody || `Validation constraints rejected input data (status ${res.status}).`,
      body: bodyJson || bodyText || null,
    };

    console.error('Create building failed:', res.status, res.url, payloadToThrow);
    throw new Error(JSON.stringify(payloadToThrow));
  }

  return bodyJson;
};

export const updateBuilding = async (id: number, payload: NewBuildingInput) => {
  const res = await authFetch(`/buildings/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let bodyText = "";
    try { bodyText = await res.text(); } catch (e) {}
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText || "null"); } catch (e) { bodyJson = null; }
    const message = (bodyJson && (bodyJson.detail || bodyJson.message)) || bodyText || `Update failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
};

export const deleteBuilding = async (id: number) => {
  const res = await fetch(buildUrl(`/buildings/${id}/`), {
    method: 'DELETE',
    headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to delete building profile: ${res.statusText}`);
  }
  return true;
};

export const fetchBuilding = async (id: number) => {
  const res = await authFetch(`/buildings/${id}/`);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Failed to fetch building ${id}`);
  }
  return res.json();
};

export const emailReport = async (id: number) => {
  const res = await authFetch(`/buildings/${id}/email_report/`, { method: 'POST' });

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch (e) {}

  let bodyJson: Record<string, unknown> | null = null;
  try { bodyJson = JSON.parse(bodyText || "null"); } catch (e) { bodyJson = null; }

  if (!res.ok) {
    const reasonFromBody =
      isRecord(bodyJson) && typeof bodyJson.reason === "string"
        ? bodyJson.reason
        : isRecord(bodyJson) && typeof bodyJson.detail === "string"
        ? bodyJson.detail
        : null;
    const reason = reasonFromBody || bodyText || `Status ${res.status}`;
    try { showToast(`Report send failed: ${reason}`); } catch (e) {}
    throw new Error(reason);
  }

  if (
    isRecord(bodyJson) &&
    typeof bodyJson.status === "string" &&
    bodyJson.status === "EMAIL_NOT_SENT"
  ) {
    const reason =
      typeof bodyJson.reason === "string"
        ? bodyJson.reason
        : "Email delivery is not configured.";
    try { showToast(`Report send failed: ${reason}`); } catch (e) {}
    throw new Error(reason);
  }

  return bodyJson;
};

export interface CarbonPreference {
  id?: number;
  building: number;
  carbon_intensity_threshold: number;
  daily_carbon_budget_kg: number;
  automation_enabled: boolean;
}

export async function createCarbonPreference(
  payload: CarbonPreference
) {
  const response = await fetch(
    buildUrl("/preferences/"),
    {
      method: "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create preference");
  }

  return response.json();
}

export async function updateCarbonPreference(
  id: number,
  payload: CarbonPreference
) {
  const response = await fetch(
    buildUrl(`/preferences/${id}/`),
    {
      method: "PUT",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update preference");
  }

  return response.json();
}

export async function downloadESGReport(buildingId: number) {
  const token = getAuthToken();
  if (!token) throw new Error("No access token found. Please sign in.");

  const res = await authFetch(`/buildings/${buildingId}/generate_report/`);

  if (!res.ok) {
    // Try to extract useful error information (JSON or text)
    let body = "";
    try {
      const txt = await res.text();
      // Try JSON first
      try {
        const j = JSON.parse(txt || "{}");
        body = j.detail || j.message || JSON.stringify(j);
      } catch (e) {
        body = txt || `${res.status} ${res.statusText}`;
      }
    } catch (e) {
      body = `${res.status} ${res.statusText}`;
    }

    // If unauthorized, clear tokens to force login on next action
    if (res.status === 401 || res.status === 403) {
      try { localStorage.removeItem("netzero_token"); localStorage.removeItem("netzero_refresh"); } catch (e) {}
      throw new Error(`Authentication error (${res.status}) — please sign in again.`);
    }

    console.error('ESG report download failed:', res.status, body);
    throw new Error(body || `Failed to download report: ${res.status}`);
  }

  const blob = await res.blob();

  // Prefer filename from Content-Disposition, fallback to building-specific CSV
  let filename = `esg_report_${buildingId}.csv`;
  try {
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename\*=UTF-8''([^;\n\r]+)/) || cd.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    } else {
      const ct = res.headers.get("Content-Type") || "";
      if (ct.includes("csv")) filename = `esg_report_${buildingId}.csv`;
      else if (ct.includes("pdf")) filename = `esg_report_${buildingId}.pdf`;
    }
  } catch (e) {}

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchBuildingSchedule(buildingId: number) {
  const token = getAuthToken();
  if (!token) throw new Error("No access token found. Please sign in.");
  const res = await authFetch(`/buildings/${buildingId}/schedule/`);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Failed to fetch schedule: ${res.status}`);
  }

  return res.json();
}

// ============================================================
// CARBON MONITORING API (Phase 1)
// ============================================================

export interface CarbonIntensityResponse {
  current_intensity: number;
  timestamp: string;
  index: string;
  region_id: string;
  source: string;
  threshold: number;
  should_modulate: boolean;
}

export interface ModulationEvent {
  id: number;
  building: number;
  asset: number;
  asset_name: string;
  action_type: 'DELAYED' | 'REDUCED' | 'SHUTDOWN' | 'RESTORED';
  trigger_type: 'AUTOMATIC' | 'MANUAL' | 'SCHEDULED';
  triggered_at: string;
  carbon_intensity_at_time: number;
  carbon_threshold: number;
  carbon_intensity_index: string;
  estimated_carbon_saved_kg: number | null;
}

export interface ModulationEventsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ModulationEvent[];
}

export interface TriggerModulationResponse {
  status: 'success' | 'dry_run' | 'no_action' | 'error';
  message?: string;
  applied_count?: number;
  decisions?: Array<{
    asset_id: number;
    asset_name: string;
    action: string;
    current_state: boolean;
    new_state: boolean;
    estimated_carbon_saved?: number;
  }>;
}

/**
 * Get current carbon intensity for a building
 */
export async function getCarbonIntensity(buildingId: number): Promise<CarbonIntensityResponse> {
  const res = await authFetch(`/buildings/${buildingId}/carbon-intensity/`);
  
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Failed to fetch carbon intensity: ${res.status}`);
  }
  
  return res.json();
}

/**
 * Get modulation events for a building (paginated)
 */
export async function getModulationEvents(
  buildingId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<ModulationEventsResponse> {
  const res = await authFetch(
    `/buildings/${buildingId}/modulation-events/?page=${page}&page_size=${pageSize}`
  );
  
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Failed to fetch modulation events: ${res.status}`);
  }
  
  return res.json();
}

/**
 * Manually trigger modulation for a building
 */
export async function triggerModulation(
  buildingId: number,
  dryRun: boolean = false
): Promise<TriggerModulationResponse> {
  const res = await authFetch(`/buildings/${buildingId}/trigger-modulation/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: dryRun }),
  });
  
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Failed to trigger modulation: ${res.status}`);
  }
  
  return res.json();
}