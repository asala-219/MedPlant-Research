/** Override with `.env.local`: VITE_API_BASE_URL=http://localhost:8000 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const BASE = API_BASE_URL;

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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
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

  compounds: (search?: string, limit?: number) =>
    get<Compound[]>("/api/compounds", { search, limit }),

  stats: () => get<StatsData>("/api/stats"),

  graphStats: () => get<{ total_nodes: number; total_edges: number; nodes_by_type: Record<string, number>; edges_by_type: Record<string, number> }>("/api/graph/stats"),

  plantGraph: (id: number, depth?: number) =>
    get<GraphData>(`/api/graph/plant/${id}`, { depth }),

  conditionGraph: (id: number) => get<GraphData>(`/api/graph/condition/${id}`),

  graphSearch: (q: string) => get<GraphData>("/api/graph/search", { q }),

  fullGraph: (types?: string) => get<GraphData>("/api/graph/full", { types }),

  chat: (message: string, history?: { role: string; content: string }[]) =>
    post<{ reply: string }>("/api/chat", { message, history: history ?? [] }),
};
