import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  CreateStoreItemInput,
  PaginatedStoreItems,
  StoreFilters,
  StoreItem,
  StoreStats,
  UpdateStoreItemInput,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/store/items`;

export async function fetchStoreStats(): Promise<StoreStats> {
  return apiFetch<StoreStats>(`${PATH}/stats`);
}

export async function fetchStoreItems(
  filters: StoreFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<PaginatedStoreItems> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters.status !== "all") params.set("status", filters.status);

  return apiFetch<PaginatedStoreItems>(`${PATH}?${params.toString()}`, {
    signal,
  });
}

export async function getStoreItem(id: string): Promise<StoreItem> {
  return apiFetch<StoreItem>(`${PATH}/${id}`);
}

export async function createStoreItem(
  input: CreateStoreItemInput,
): Promise<StoreItem> {
  return apiFetch<StoreItem>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStoreItem(
  id: string,
  input: UpdateStoreItemInput,
): Promise<StoreItem> {
  return apiFetch<StoreItem>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function hideStoreItem(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

export async function restoreStoreItem(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}/restore`, { method: "POST" });
}
