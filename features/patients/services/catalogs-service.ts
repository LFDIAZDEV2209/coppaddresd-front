import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  CatalogOption,
  CatalogSearchItem,
  CityOption,
  CountryOption,
  PostalCodeOption,
  StateOption,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/catalogs`;

export async function fetchCountries(signal?: AbortSignal): Promise<CountryOption[]> {
  return apiFetch<CountryOption[]>(`${PATH}/countries`, { signal });
}

export async function fetchStates(
  countryId: string,
  signal?: AbortSignal,
): Promise<StateOption[]> {
  return apiFetch<StateOption[]>(
    `${PATH}/states?countryId=${encodeURIComponent(countryId)}`,
    { signal },
  );
}

export async function searchCities(
  stateId: string,
  search: string,
  signal?: AbortSignal,
): Promise<CityOption[]> {
  const params = new URLSearchParams({ stateId });
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  return apiFetch<CityOption[]>(`${PATH}/cities?${params.toString()}`, { signal });
}

export async function fetchPostalCodes(
  cityId: string,
  signal?: AbortSignal,
): Promise<PostalCodeOption[]> {
  return apiFetch<PostalCodeOption[]>(
    `${PATH}/postal-codes?cityId=${encodeURIComponent(cityId)}`,
    { signal },
  );
}

export async function fetchBloodTypes(signal?: AbortSignal): Promise<CatalogOption[]> {
  return apiFetch<CatalogOption[]>(`${PATH}/blood-types`, { signal });
}

export async function fetchDocumentTypes(signal?: AbortSignal): Promise<CatalogOption[]> {
  return apiFetch<CatalogOption[]>(`${PATH}/document-types`, { signal });
}

export async function fetchEthnicities(signal?: AbortSignal): Promise<CatalogOption[]> {
  return apiFetch<CatalogOption[]>(`${PATH}/ethnicities`, { signal });
}

export async function searchIcd10Codes(
  search: string,
  signal?: AbortSignal,
): Promise<CatalogSearchItem[]> {
  return apiFetch<CatalogSearchItem[]>(
    `${PATH}/icd10-codes?search=${encodeURIComponent(search)}`,
    { signal },
  );
}

export async function searchMedications(
  search: string,
  signal?: AbortSignal,
): Promise<CatalogSearchItem[]> {
  return apiFetch<CatalogSearchItem[]>(
    `${PATH}/medications?search=${encodeURIComponent(search)}`,
    { signal },
  );
}

export async function searchAllergens(
  search: string,
  signal?: AbortSignal,
): Promise<CatalogSearchItem[]> {
  return apiFetch<CatalogSearchItem[]>(
    `${PATH}/allergens?search=${encodeURIComponent(search)}`,
    { signal },
  );
}