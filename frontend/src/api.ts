import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
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
  const clean = uri.split("?")[0].toLowerCase();
  const ext = clean.endsWith(".png") ? "png" : "jpg";
  const name = `tube_${Date.now()}.${ext}`;
  const type = ext === "png" ? "image/png" : "image/jpeg";

  if (Platform.OS === "web") {
    // Web: turn the (blob:/data:) uri into a real Blob before appending.
    const form = new FormData();
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
    const res = await fetch(`${API}/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return ((await res.json()) as { image_path: string }).image_path;
  }

  // Native: React Native's FormData rejects file parts on new-architecture
  // builds ("unsupported FormData part implementation"). Use FileSystem's
  // native multipart uploader instead — it streams a real file:// path and
  // never touches the JS FormData polyfill. ImagePicker can hand back ph://
  // (iOS) or content:// (Android) uris, so copy into cache first for a valid
  // file:// path.
  let localUri = uri;
  const dest = `${FileSystem.cacheDirectory}${name}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    localUri = dest;
  } catch {
    localUri = uri;
  }
  const result = await FileSystem.uploadAsync(`${API}/upload`, localUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType: type,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status} ${result.body ?? ""}`.trim());
  }
  return (JSON.parse(result.body) as { image_path: string }).image_path;
}

// Fetch an image URL and return a base64 data URI (used to embed the original
// photo directly inside the exported PDF report).
export async function imageToDataUri(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
