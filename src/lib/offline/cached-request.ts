import { apiRequest } from "@/lib/api";
import { idbGet, idbPut } from "./idb";

export async function cachedApiRequest<T>(key: string, path: string): Promise<T> {
  try {
    const data = await apiRequest<T>(path);
    await idbPut("cache", { key, data, at: Date.now() });
    return data;
  } catch (error) {
    const cached = await idbGet<{ key: string; data: T }>("cache", key);
    if (cached) return cached.data;
    throw error;
  }
}
