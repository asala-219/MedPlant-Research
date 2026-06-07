/** Override with `.env.local`: VITE_API_BASE_URL=http://localhost:8000 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const BASE = API_BASE_URL;

/** Resolve plant image paths served by the FastAPI backend. */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/")) return `${BASE}${url}`;
  return url;
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch { /* ignore parse errors */ }
    throw new Error(detail);
  }
  return res.json();
}

async function put<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

async function del<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

async function postForm<T>(path: string, formData: FormData, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

async function delAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

async function getAuth<T>(path: string, token: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

export const ADMIN_TOKEN_KEY = "omaniethno_admin_token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Plant {
  id: number;
  family: string | null;
  scientific_name: string;
  local_name: string | null;
  part_used: string | null;
  traditional_use: string | null;
  source: string | null;
  image_url: string | null;
  conditions: string[];
  compounds: Compound[];
  related_plants?: RelatedPlant[];
}

export interface Compound {
  name: string;
  imppat_id: string | null;
}

export interface RelatedPlant {
  id: number;
  scientific_name: string;
  local_name: string | null;
}

export interface Condition {
  id: number;
  name: string;
  plant_count: number;
}

export interface PlantRef {
  id: number;
  scientific_name: string;
  local_name: string | null;
  family?: string | null;
  part_used?: string | null;
  reference?: string | null;
}

export interface ConditionDetail {
  id: number;
  name: string;
  plant_count: number;
  plants: PlantRef[];
  compounds: { id: number; name: string; imppat_id: string | null }[];
}

export interface CompoundDetail {
  id: number;
  name: string;
  imppat_id: string | null;
  plant_count: number;
  plants: PlantRef[];
}

export interface FamilyDetail {
  name: string;
  plant_count: number;
  plants: PlantRef[];
  conditions: string[];
}

export interface PlantsResponse {
  total: number;
  skip: number;
  limit: number;
  data: Plant[];
}

export interface GraphNode {
  id: string;
  type: "Plant" | "Condition" | "Compound" | "Family";
  label: string;
  local_name?: string;
  imppat_id?: string;
  db_id?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "TREATS" | "CONTAINS" | "BELONGS_TO" | "CO_TREATS" | "SHARES_COMPOUND";
  weight?: number;
  derived?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AdminColumn {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  default: string | null;
}

export interface AdminTable {
  name: string;
  label: string;
  row_count: number;
  columns: AdminColumn[];
  pk: string[];
  auto_pk: string | null;
  required: string[];
  allow_add_column: boolean;
}

export interface AdminRowsResponse {
  total: number;
  skip: number;
  limit: number;
  columns: AdminColumn[];
  rows: Record<string, unknown>[];
  pk: string[];
  auto_pk: string | null;
}

export interface StatsData {
  plants: number;
  compounds: number;
  conditions: number;
  families: number;
  plant_condition_links: number;
  plant_compound_links: number;
  top_conditions: { name: string; count: number }[];
  top_families: { name: string; count: number }[];
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const api = {
  plants: (params?: {
    search?: string;
    family?: string;
    condition?: string;
    compound?: string;
    skip?: number;
    limit?: number;
  }) => get<PlantsResponse>("/api/plants", params as Record<string, string | number | undefined>),

  plant: (id: number) => get<Plant>(`/api/plants/${id}`),

  conditions: () => get<Condition[]>("/api/conditions"),

  condition: (id: number) => get<ConditionDetail>(`/api/conditions/${id}`),

  compounds: (search?: string, limit?: number) =>
    get<Compound[]>("/api/compounds", { search, limit }),

  compound: (id: number) => get<CompoundDetail>(`/api/compounds/${id}`),

  family: (name: string) => get<FamilyDetail>(`/api/families/${encodeURIComponent(name)}`),

  stats: () => get<StatsData>("/api/stats"),

  graphStats: () => get<{ total_nodes: number; total_edges: number; nodes_by_type: Record<string, number>; edges_by_type: Record<string, number> }>("/api/graph/stats"),

  plantGraph: (id: number, depth?: number) =>
    get<GraphData>(`/api/graph/plant/${id}`, { depth }),

  conditionGraph: (id: number) => get<GraphData>(`/api/graph/condition/${id}`),

  compoundGraph: (id: number) => get<GraphData>(`/api/graph/compound/${id}`),

  familyGraph: (name: string) => get<GraphData>(`/api/graph/family/${encodeURIComponent(name)}`),

  graphSearch: (q: string) => get<GraphData>("/api/graph/search", { q }),

  fullGraph: (types?: string) => get<GraphData>("/api/graph/full", { types }),

  chat: (message: string, history?: { role: string; content: string }[]) =>
    post<{ reply: string }>("/api/chat", { message, history: history ?? [] }),

  adminStatus: () => get<{ enabled: boolean }>("/api/admin/status"),

  adminLogin: (password: string) =>
    post<{ token: string }>("/api/admin/login", { password }),

  adminLogout: (token: string) =>
    post<{ ok: boolean }>("/api/admin/logout", {}, token),

  adminTables: (token: string) =>
    getAuth<AdminTable[]>("/api/admin/tables", token),

  adminRows: (token: string, table: string, params?: { skip?: number; limit?: number; search?: string }) =>
    getAuth<AdminRowsResponse>(`/api/admin/tables/${table}/rows`, token, params),

  adminCreateRow: (token: string, table: string, data: Record<string, unknown>) =>
    post<Record<string, unknown>>(`/api/admin/tables/${table}/rows`, { data }, token),

  adminUpdateRow: (token: string, table: string, pk: Record<string, unknown>, data: Record<string, unknown>) =>
    put<Record<string, unknown>>(`/api/admin/tables/${table}/rows`, { pk, data }, token),

  adminDeleteRow: (token: string, table: string, pk: Record<string, unknown>) =>
    del<{ deleted: boolean }>(`/api/admin/tables/${table}/rows`, { pk }, token),

  adminAddColumn: (token: string, table: string, name: string, type: string, defaultValue?: string) =>
    post<{ table: string; column: string; type: string; columns: AdminColumn[] }>(
      `/api/admin/tables/${table}/columns`,
      { name, type, default: defaultValue },
      token,
    ),

  adminRebuildGraph: (token: string) =>
    post<{ nodes: number; edges: number; message: string }>("/api/admin/rebuild-graph", {}, token),

  adminUploadPlantImage: (token: string, plantId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return postForm<{ plant_id: number; image_url: string }>(
      `/api/admin/plants/${plantId}/image`,
      fd,
      token,
    );
  },

  adminDeletePlantImage: (token: string, plantId: number) =>
    delAuth<{ plant_id: number; image_url: null }>(`/api/admin/plants/${plantId}/image`, token),
};

/**
 * Map a graph node to its detail-page route. Clicking a node navigates to the
 * page that shows everything we hold about that entity (plant, condition,
 * compound or family). Returns null when the node carries no usable id.
 */
export function nodePath(node: GraphNode): string | null {
  switch (node.type) {
    case "Plant":
      return node.db_id != null ? `/plant/${node.db_id}` : null;
    case "Condition":
      return node.db_id != null ? `/condition/${node.db_id}` : null;
    case "Compound":
      return node.db_id != null ? `/compound/${node.db_id}` : null;
    case "Family":
      return `/family/${encodeURIComponent(node.label)}`;
    default:
      return null;
  }
}
