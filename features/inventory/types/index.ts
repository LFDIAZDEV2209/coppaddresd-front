export type ProductType =
  | "Medicamento"
  | "Insumo médico"
  | "Material hospitalario"
  | "Producto de farmacia"
  | "Alimento saludable"
  | "Snack saludable"
  | "Bebida"
  | "Suplemento"
  | "Dispositivo de salud"
  | "Equipamiento fitness"
  | "Cuidado personal"
  | "Otro";
export type ProductStatus = "Activo" | "Inactivo";
export type MovementDirection = "Entrada" | "Salida";
export type EntryReason =
  | "Compra"
  | "Recepción de proveedor"
  | "Devolución de cliente"
  | "Donación"
  | "Ajuste positivo";
export type ExitReason =
  | "Dispensación"
  | "Venta"
  | "Consumo interno"
  | "Devolución a proveedor"
  | "Producto vencido"
  | "Producto dañado"
  | "Ajuste de inventario"
  | "Otro";

export interface Product {
  id: string;
  sku: string;
  name: string;
  productType: ProductType;
  category: string;
  activeIngredient: string | null;
  presentation: string;
  concentration: string | null;
  unit: string;
  manufacturer: string | null;
  supplier: string | null;
  lot: string | null;
  expirationDate: string | null;
  stock: number;
  minimumStock: number;
  maximumStock: number;
  location: string | null;
  status: ProductStatus;
  createdAt: string;
  unitCost: number;
  notes: string | null;
}

export type ProductInput = Omit<
  Product,
  "id" | "createdAt" | "stock" | "activeIngredient" | "concentration" | "manufacturer" | "supplier" | "lot" | "expirationDate" | "location" | "notes"
> & {
  stock?: number;
  activeIngredient: string;
  concentration: string;
  manufacturer: string;
  supplier: string;
  lot: string;
  expirationDate: string;
  location: string;
  notes: string;
};

export interface InventoryLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  lot: string;
  expirationDate: string;
  unitCost: number;
}

export interface InventoryEntry {
  id: string;
  reference: string;
  date: string;
  reason: EntryReason;
  supplier: string;
  document: string;
  responsible: string;
  notes: string;
  lines: InventoryLine[];
  totalCost: number;
}

export interface InventoryExit {
  id: string;
  reference: string;
  date: string;
  reason: ExitReason;
  responsible: string;
  patientName?: string;
  notes: string;
  lines: InventoryLine[];
}

export interface InventoryMovement {
  id: string;
  dateTime: string;
  productId: string;
  productName: string;
  direction: MovementDirection;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  lot: string;
  user: string;
  reason: string;
  reference: string;
}

export interface InventoryFilters {
  search: string;
  category: string;
  status:
    | "all"
    | "Con alertas"
    | "Disponible"
    | "Stock bajo"
    | "Sin stock"
    | "Próximo a vencer"
    | "Vencido"
    | "Inactivo";
}

export interface InventoryAnalytics {
  totalValue: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
  entries: number;
  exits: number;
  unitsEntered: number;
  unitsExited: number;
  movementSeries: { label: string; entries: number; exits: number }[];
  topMoving: { name: string; quantity: number }[];
  categoryValue: { category: string; value: number }[];
  products: ProductListItem[];
}

export interface InventoryReportFilters {
  from: string;
  to: string;
  category: string;
  movementType: "all" | MovementDirection;
}

// --- Paginated results from backend API ---

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  productType: ProductType;
  category: string;
  activeIngredient: string | null;
  presentation: string;
  concentration: string | null;
  unit: string;
  supplier: string | null;
  manufacturer: string | null;
  lot: string | null;
  expirationDate: string | null;
  stock: number;
  minimumStock: number;
  maximumStock: number;
  location: string | null;
  status: ProductStatus;
  unitCost: number;
  notes: string | null;
}

export interface PaginatedProducts {
  data: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedMovements {
  data: InventoryMovement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedEntries {
  data: InventoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedExits {
  data: InventoryExit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
