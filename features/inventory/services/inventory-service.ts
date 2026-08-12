import {
  mockAnalytics,
  mockEntries,
  mockExits,
  mockMovements,
  mockProducts,
} from "../mocks/inventory";
import type {
  InventoryEntry,
  InventoryExit,
  InventoryFilters,
  InventoryMovement,
  Product,
  ProductInput,
} from "../types";

let products = [...mockProducts];
let movements = [...mockMovements];
let entries = [...mockEntries];
let exits = [...mockExits];

export async function fetchProducts(
  filters: InventoryFilters,
): Promise<Product[]> {
  await delay(550);
  const query = filters.search.trim().toLowerCase();
  return products.filter((product) => {
    const state = getProductState(product);
    return (
      (!query ||
        `${product.name} ${product.sku} ${product.activeIngredient}`
          .toLowerCase()
          .includes(query)) &&
      (!filters.category || product.category === filters.category) &&
      (filters.status === "all" ||
        state === filters.status ||
        (filters.status === "Inactivo" && product.status === "Inactivo"))
    );
  });
}

export async function createProduct(input: ProductInput): Promise<Product> {
  await delay(700);
  const product: Product = {
    ...input,
    id: `prd-${Date.now()}`,
    createdAt: new Date().toISOString().slice(0, 10),
    stock: input.stock ?? 0,
  };
  products = [product, ...products];
  return product;
}
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Product> {
  await delay(700);
  const current = products.find((product) => product.id === id);
  if (!current) throw new Error("Producto no encontrado.");
  const product = { ...current, ...input, stock: input.stock ?? current.stock };
  products = products.map((item) => (item.id === id ? product : item));
  return product;
}
export function getProduct(id: string) {
  return products.find((product) => product.id === id);
}
export function getCategories() {
  return [...new Set(products.map((product) => product.category))].sort();
}
export function getSuppliers() {
  return [...new Set(products.map((product) => product.supplier))].sort();
}
export function getProductState(product: Product): InventoryFilters["status"] {
  if (product.status === "Inactivo") return "Inactivo";
  if (product.stock === 0) return "Sin stock";
  if (new Date(product.expirationDate) < new Date("2024-06-18"))
    return "Vencido";
  if (new Date(product.expirationDate) <= new Date("2025-02-01"))
    return "Próximo a vencer";
  if (product.stock <= product.minimumStock) return "Stock bajo";
  return "Disponible";
}
export async function fetchMovements(filters: {
  search: string;
  direction: "all" | "Entrada" | "Salida";
}): Promise<InventoryMovement[]> {
  await delay(600);
  const query = filters.search.toLowerCase();
  return movements.filter(
    (movement) =>
      (!query ||
        `${movement.productName} ${movement.lot} ${movement.user} ${movement.reference}`
          .toLowerCase()
          .includes(query)) &&
      (filters.direction === "all" || movement.direction === filters.direction),
  );
}
export async function createEntry(
  entry: Omit<InventoryEntry, "id" | "reference" | "totalCost">,
): Promise<InventoryEntry> {
  await delay(800);
  const created = {
    ...entry,
    id: `ent-${Date.now()}`,
    reference: `ENT-${String(entries.length + 43).padStart(5, "0")}`,
    totalCost: entry.lines.reduce(
      (total, line) => total + line.quantity * line.unitCost,
      0,
    ),
  };
  entries = [created, ...entries];
  entry.lines.forEach((line) =>
    adjustStock(
      line,
      line.quantity,
      created.reference,
      "Entrada",
      entry.reason,
    ),
  );
  return created;
}
export async function createExit(
  exit: Omit<InventoryExit, "id" | "reference">,
): Promise<InventoryExit> {
  await delay(800);
  for (const line of exit.lines) {
    const product = getProduct(line.productId);
    if (!product || line.quantity > product.stock)
      throw new Error(`Stock insuficiente para ${line.productName}.`);
  }
  const created = {
    ...exit,
    id: `sal-${Date.now()}`,
    reference: `SAL-${String(exits.length + 119).padStart(5, "0")}`,
  };
  exits = [created, ...exits];
  exit.lines.forEach((line) =>
    adjustStock(line, -line.quantity, created.reference, "Salida", exit.reason),
  );
  return created;
}
export function fetchAnalytics() {
  return mockAnalytics;
}
export function getEntries() {
  return entries;
}
export function getExits() {
  return exits;
}
function adjustStock(
  line: {
    productId: string;
    productName: string;
    quantity: number;
    lot: string;
  },
  delta: number,
  reference: string,
  direction: "Entrada" | "Salida",
  reason: string,
) {
  const product = products.find((item) => item.id === line.productId);
  if (!product) return;
  const before = product.stock;
  product.stock += delta;
  movements = [
    {
      id: `mov-${Date.now()}-${Math.random()}`,
      dateTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      productId: product.id,
      productName: line.productName,
      direction,
      quantity: line.quantity,
      stockBefore: before,
      stockAfter: product.stock,
      lot: line.lot,
      user: "Carlos Ruiz",
      reason,
      reference,
    },
    ...movements,
  ];
}
function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
