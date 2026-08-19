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
  activeIngredient: string;
  presentation: string;
  concentration: string;
  unit: string;
  manufacturer: string;
  supplier: string;
  lot: string;
  expirationDate: string;
  stock: number;
  minimumStock: number;
  maximumStock: number;
  location: string;
  status: ProductStatus;
  createdAt: string;
  unitCost: number;
  notes: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "stock"> & {
  stock?: number;
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
  movementSeries: { label: string; entries: number; exits: number }[];
  topMoving: { name: string; quantity: number }[];
  categoryValue: { category: string; value: number }[];
}

export interface InventoryReportFilters {
  from: string;
  to: string;
  category: string;
  movementType: "all" | MovementDirection;
}
