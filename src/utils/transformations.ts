import type {
  Carrier,
  Product,
  ProductCategory,
  Shipment,
  ShipmentStatus,
} from "../types/models.js";

const priorityMultipliers = {
  Standard: 1,
  Express: 1.3,
  "Same-day": 1.6,
} as const;

const productCategories: ProductCategory[] = [
  "Fashion",
  "Electronics",
  "Cosmetics",
  "Home",
  "Other",
];

const shipmentStatuses: ShipmentStatus[] = [
  "Pending",
  "Assigned",
  "In transit",
  "Delivered",
  "Failed",
];

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateShippingCost(
  shipment: Shipment,
  product: Product,
  carrier: Carrier,
): number {
  const baseCost =
    carrier.baseRateUSD +
    product.weightKg * carrier.ratePerKgUSD * shipment.quantity +
    shipment.destination.distanceKm * carrier.ratePerKmUSD;

  return roundToCents(baseCost * priorityMultipliers[shipment.priority]);
}

export function scoreCarrierForShipment(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
): number {
  const countryScore = carrier.operatesIn.includes(shipment.destination.country) ? 20 : 0;
  const weightScore = product.weightKg * shipment.quantity <= carrier.maxWeightKg ? 20 : 0;
  const priorityScore = carrier.acceptsPriority.includes(shipment.priority) ? 15 : 0;
  const fragileScore = product.isFragile
    ? carrier.handlesFragile ? 15 : 0
    : 15;
  const reliabilityScore = carrier.onTimeRate * 0.3;

  return roundToCents(
    countryScore + weightScore + priorityScore + fragileScore + reliabilityScore,
  );
}

export function selectBestCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): { carrier: Carrier; score: number; cost: number } | null {
  let bestOption: { carrier: Carrier; score: number; cost: number } | null = null;

  for (const carrier of carriers) {
    const score = scoreCarrierForShipment(carrier, shipment, product);
    if (score < 50) continue;

    const cost = calculateShippingCost(shipment, product, carrier);
    if (bestOption === null || cost < bestOption.cost) {
      bestOption = { carrier, score, cost };
    }
  }

  return bestOption;
}

export function countProductsByCategory(
  products: Product[],
): Record<ProductCategory, number> {
  const counts = Object.fromEntries(
    productCategories.map((category) => [category, 0]),
  ) as Record<ProductCategory, number>;

  for (const product of products) counts[product.category] += 1;
  return counts;
}

export function calculateTotalInventoryValue(products: Product[]): number {
  const total = products.reduce(
    (sum, product) => sum + product.stockQuantity * product.unitCostUSD,
    0,
  );
  return roundToCents(total);
}

export function calculateAverageShipmentDistance(shipments: Shipment[]): number {
  if (shipments.length === 0) return 0;
  const totalDistance = shipments.reduce(
    (sum, shipment) => sum + shipment.destination.distanceKm,
    0,
  );
  return roundToCents(totalDistance / shipments.length);
}

export function groupShipmentsByStatus(
  shipments: Shipment[],
): Record<ShipmentStatus, Shipment[]> {
  const groups: Record<ShipmentStatus, Shipment[]> = {
    Pending: [],
    Assigned: [],
    "In transit": [],
    Delivered: [],
    Failed: [],
  };

  for (const shipment of shipments) groups[shipment.status].push(shipment);
  return groups;
}

export function findTopCarriers(
  shipments: Shipment[],
  topN: number,
): Array<{ carrier: string; count: number }> {
  if (topN <= 0) return [];

  const counts = new Map<string, number>();
  for (const shipment of shipments) {
    if (shipment.carrier === null) continue;
    counts.set(shipment.carrier, (counts.get(shipment.carrier) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([carrier, count]) => ({ carrier, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, Math.floor(topN));
}