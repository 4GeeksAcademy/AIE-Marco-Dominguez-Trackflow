import type {
  Carrier,
  Product,
  ProductCategory,
  WarehouseLocation,
} from "../types/models.js";

export function filterProductsByWarehouse(
  products: Product[],
  warehouse: WarehouseLocation,
): Product[] {
  return products.filter((product) => product.warehouse === warehouse);
}

export function filterProductsByCategory(
  products: Product[],
  category: ProductCategory,
): Product[] {
  return products.filter((product) => product.category === category);
}

export function filterLowStockProducts(products: Product[]): Product[] {
  return products.filter(
    (product) => product.stockQuantity <= product.minStockThreshold,
  );
}

export function sortProductsByStock(
  products: Product[],
  order: "asc" | "desc",
): Product[] {
  const direction = order === "asc" ? 1 : -1;
  return [...products].sort(
    (first, second) => direction * (first.stockQuantity - second.stockQuantity),
  );
}

export function sortCarriersByReliability(
  carriers: Carrier[],
  order: "asc" | "desc",
): Carrier[] {
  const direction = order === "asc" ? 1 : -1;
  return [...carriers].sort(
    (first, second) => direction * (first.onTimeRate - second.onTimeRate),
  );
}