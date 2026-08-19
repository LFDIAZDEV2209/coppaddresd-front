import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  InventoryAnalytics,
  InventoryEntry,
  InventoryExit,
  InventoryFilters,
  InventoryMovement,
  PaginatedEntries,
  PaginatedExits,
  PaginatedMovements,
  PaginatedProducts,
  Product,
  ProductInput,
  ProductListItem,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/inventory`;

// --- Products ---

/** Server-side search/category, computed stock states derived client-side. */
export async function fetchProducts(
  filters: InventoryFilters,
): Promise<ProductListItem[]> {
  const params = new URLSearchParams({ pageSize: "200" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.status === "Inactivo") params.set("status", "Inactivo");

  const result = await apiFetch<PaginatedProducts>(
    `${PATH}/products?${params.toString()}`,
  );

  return result.data.filter((product) => {
    if (filters.status === "Inactivo") return product.status === "Inactivo";
    if (filters.status === "all") return true;
    return getProductState(product) === filters.status;
  });
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return apiFetch<Product>(`${PATH}/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Product> {
  return apiFetch<Product>(`${PATH}/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`${PATH}/products/${id}`);
}

export async function getCategories(): Promise<string[]> {
  return apiFetch<string[]>(`${PATH}/products/categories`);
}

export async function getSuppliers(): Promise<string[]> {
  return apiFetch<string[]>(`${PATH}/products/suppliers`);
}

export function getProductState(
  product: Pick<ProductListItem, "status" | "stock" | "minimumStock" | "expirationDate">,
): Exclude<InventoryFilters["status"], "all"> {
  if (product.status === "Inactivo") return "Inactivo";
  if (product.stock === 0) return "Sin stock";

  const today = DateOnlyToday();
  const expiration = product.expirationDate
    ? new Date(`${product.expirationDate}T00:00:00`)
    : null;

  if (expiration) {
    const expDate = DateOnly(expiration);
    if (expDate < today) return "Vencido";
    const soon = new Date(today.toISOString().slice(0, 10));
    soon.setDate(soon.getDate() + 90);
    if (expDate <= DateOnly(soon)) return "Próximo a vencer";
  }

  if (product.stock <= product.minimumStock) return "Stock bajo";
  return "Disponible";
}

// --- Movements ---

export async function fetchMovements(filters: {
  search: string;
  direction: "all" | "Entrada" | "Salida";
}): Promise<InventoryMovement[]> {
  const params = new URLSearchParams({ pageSize: "200" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.direction !== "all") params.set("direction", filters.direction);

  const result = await apiFetch<PaginatedMovements>(
    `${PATH}/movements?${params.toString()}`,
  );
  return result.data;
}

// --- Entries ---

export async function createEntry(
  entry: Omit<InventoryEntry, "id" | "reference" | "totalCost">,
): Promise<InventoryEntry> {
  return apiFetch<InventoryEntry>(`${PATH}/entries`, {
    method: "POST",
    body: JSON.stringify({
      date: entry.date,
      reason: entry.reason,
      supplier: entry.supplier,
      document: entry.document,
      responsible: entry.responsible,
      notes: entry.notes,
      lines: entry.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        lot: line.lot,
        expirationDate: line.expirationDate || null,
        unitCost: line.unitCost,
      })),
    }),
  });
}

export async function fetchEntries(): Promise<InventoryEntry[]> {
  const result = await apiFetch<PaginatedEntries>(
    `${PATH}/entries?pageSize=100`,
  );
  return result.data;
}

// --- Exits ---

export async function createExit(
  exit: Omit<InventoryExit, "id" | "reference">,
): Promise<InventoryExit> {
  return apiFetch<InventoryExit>(`${PATH}/exits`, {
    method: "POST",
    body: JSON.stringify({
      date: exit.date,
      reason: exit.reason,
      responsible: exit.responsible,
      patientName: exit.patientName || null,
      notes: exit.notes,
      lines: exit.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        lot: line.lot,
        expirationDate: line.expirationDate || null,
        unitCost: line.unitCost,
      })),
    }),
  });
}

export async function fetchExits(): Promise<InventoryExit[]> {
  const result = await apiFetch<PaginatedExits>(`${PATH}/exits?pageSize=100`);
  return result.data;
}

// --- Analytics ---

export async function fetchAnalytics(): Promise<InventoryAnalytics> {
  return apiFetch<InventoryAnalytics>(`${PATH}/analytics`);
}

// --- Helpers ---

function DateOnlyToday(): Date {
  return DateOnly(new Date());
}

function DateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
