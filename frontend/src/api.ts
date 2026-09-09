import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export function fileUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path; // seed/demo remote images
  return `${API}/files/${path}`;
}

export type Parameters = {
  deposit_area_pct: number;
  deposit_length_mm: number;
  deposit_coverage_pct: number;
  avg_intensity_l: number;
  avg_color_a: number;
  avg_color_b: number;
  max_intensity: number;
  thickness_index_mm: number;
  deposit_start_mm: number;
  deposit_end_mm: number;
};

export type TestMeta = {
  sample_id: string;
  oil_type: string;
  batch: string;
  operator: string;
  temperature_c: number;
  duration_hours: number;
  air_flow: number;
  oil_flow: number;
  remark: string;
};

export type TestRecord = {
  id: string;
  image_path: string;
  meta: TestMeta;
  rating: number;
  performance: string;
  confidence: number;
  status: string;
  deposit_level_label: string;
  parameters: Parameters;
  ai_summary: string;
  ai_model: string;
  created_at: string;
};

export type DashboardData = {
  latest: TestRecord | null;
  total: number;
  passed: number;
  failed: number;
  avg_rating: number;
};

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => getJSON<DashboardData>(`${API}/dashboard`) });
}

export function useTests(q?: string) {
  return useQuery({
    queryKey: ["tests", q ?? ""],
    queryFn: () => getJSON<TestRecord[]>(`${API}/tests${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useTest(id: string) {
  return useQuery({ queryKey: ["test", id], queryFn: () => getJSON<TestRecord>(`${API}/tests/${id}`), enabled: !!id });
}

export function useTrend() {
  return useQuery({
    queryKey: ["trend"],
    queryFn: () =>
      getJSON<{ id: string; rating: number; status: string; sample_id: string; created_at: string }[]>(`${API}/trend`),
  });
}

export async function uploadImage(uri: string): Promise<string> {
  const name = uri.split("/").pop() || "photo.jpg";
  const extMatch = name.split(".").pop()?.toLowerCase();
  const ext = extMatch === "png" ? "png" : "jpg";
  const type = `image/${ext === "png" ? "png" : "jpeg"}`;
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await fetch(`${API}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  return data.image_path as string;
}

export type AnalyzePayload = Partial<TestMeta> & { image_path: string };

export function useAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AnalyzePayload) => {
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Analysis failed: ${res.status}`);
      }
      return (await res.json()) as TestRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    },
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/tests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    },
  });
}
