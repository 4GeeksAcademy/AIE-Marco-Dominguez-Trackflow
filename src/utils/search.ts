import type { Product, Shipment } from "../types/models.js";

export function findProductBySKU(products: Product[], sku: string): Product | null {
  const normalizedSku = sku.trim().toLocaleLowerCase();
  return products.find(
    (product) => product.sku.toLocaleLowerCase() === normalizedSku,
  ) ?? null;
}

export function findShipmentById(shipments: Shipment[], id: string): Shipment | null {
  return shipments.find((shipment) => shipment.id === id) ?? null;
}

export function binarySearchProductByWeight(
  sortedProducts: Product[],
  targetWeight: number,
): number {
  let low = 0;
  let high = sortedProducts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const weight = sortedProducts[middle].weightKg;

    if (weight === targetWeight) return middle;
    if (weight < targetWeight) low = middle + 1;
    else high = middle - 1;
  }

  return -1;
}