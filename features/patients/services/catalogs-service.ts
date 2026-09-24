import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  CatalogOption,
  CatalogSearchItem,
  CityOption,
  CountryOption,
  PostalCodeOption,
  PostalCodeSearch,
  StateOption,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/catalogs`;

/**
 * Caché de catálogos estáticos en memoria (TTL 5 min): evita re-peticiones al
 * backend al navegar entre lista → crear → editar dentro de la misma sesión.
 * Los catálogos son datos de baja volatilidad; una ventana de 5 minutos de
 * datos eventualmente consistentes es aceptable (ver skill caching).
 */
const STATIC_CATALOG_TTL_MS = 5 * 60_000;

const staticCache = new Map<string, { data: unknown; expires: number }>();

async function cachedStatic<T>(
  key: string,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const entry = staticCache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  const data = await fetcher(signal);
  staticCache.set(key, { data, expires: Date.now() + STATIC_CATALOG_TTL_MS });
  return data;
}

export async function fetchCountries(signal?: AbortSignal): Promise<CountryOption[]> {
  return cachedStatic("countries", () => apiFetch<CountryOption[]>(`${PATH}/countries`), signal);
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

/** Códigos postales del catálogo local (fallback de desarrollo/offline). */
export async function fetchPostalCodes(
  cityId: string,
  signal?: AbortSignal,
): Promise<PostalCodeOption[]> {
  return apiFetch<PostalCodeOption[]>(
    `${PATH}/postal-codes?cityId=${encodeURIComponent(cityId)}`,
    { signal },
  );
}

/**
 * Autocompletado escalable de códigos postales: el backend consulta un
 * proveedor externo (Zippopotam, con caché) y degrada a la BD local.
 */
export async function searchPostalCodes(
  params: {
    countryCode?: string;
    stateCode?: string;
    city?: string;
    zip?: string;
  },
  signal?: AbortSignal,
): Promise<PostalCodeSearch[]> {
  const query = new URLSearchParams();
  if (params.countryCode) query.set("countryCode", params.countryCode);
  if (params.stateCode) query.set("stateCode", params.stateCode);
  if (params.city) query.set("city", params.city);
  if (params.zip) query.set("zip", params.zip);
  return apiFetch<PostalCodeSearch[]>(`${PATH}/postal-codes/search?${query.toString()}`, {
    signal,
  });
}

export async function fetchBloodTypes(signal?: AbortSignal): Promise<CatalogOption[]> {
  return cachedStatic("blood-types", () => apiFetch<CatalogOption[]>(`${PATH}/blood-types`), signal);
}

export async function fetchDocumentTypes(signal?: AbortSignal): Promise<CatalogOption[]> {
  return cachedStatic(
    "document-types",
    () => apiFetch<CatalogOption[]>(`${PATH}/document-types`),
    signal,
  );
}

export async function fetchEthnicities(signal?: AbortSignal): Promise<CatalogOption[]> {
  return cachedStatic("ethnicities", () => apiFetch<CatalogOption[]>(`${PATH}/ethnicities`), signal);
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

export async function searchCptCodes(
  search: string,
  signal?: AbortSignal,
): Promise<CatalogSearchItem[]> {
  return apiFetch<CatalogSearchItem[]>(
    `${PATH}/cpt-codes?search=${encodeURIComponent(search)}`,
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
