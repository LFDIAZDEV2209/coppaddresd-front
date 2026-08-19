export type StoreItemStatus = "Visible" | "Oculto";

export interface StoreItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productType: string;
  salePrice: number;
  description: string | null;
  featured: boolean;
  status: StoreItemStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface StoreItemListItem {
  id: string;
  productName: string;
  productSku: string;
  productType: string;
  salePrice: number;
  stock: number;
  featured: boolean;
  status: StoreItemStatus;
  createdAt: string;
}

export interface CreateStoreItemInput {
  productId: string;
  salePrice: number;
  description?: string;
  featured: boolean;
}

export interface UpdateStoreItemInput {
  salePrice: number;
  description?: string;
  featured: boolean;
}

export interface PaginatedStoreItems {
  data: StoreItemListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StoreFilters {
  status: "all" | "Visible" | "Oculto";
}
