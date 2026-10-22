export function validateProduct(product) {
    const errors = [];
    const { dimensions } = product;
    if (!product.sku.trim())
        errors.push("El SKU no debe estar vacío.");
    if (!(product.weightKg > 0 && product.weightKg <= 100)) {
        errors.push("El peso debe ser mayor que 0 y no superar 100 kg.");
    }
    if (![dimensions.lengthCm, dimensions.widthCm, dimensions.heightCm].every((dimension) => dimension > 0 && dimension <= 200)) {
        errors.push("Cada dimensión debe ser mayor que 0 y no superar 200 cm.");
    }
    if (product.stockQuantity < 0)
        errors.push("El stock no puede ser negativo.");
    if (product.minStockThreshold < 0) {
        errors.push("El umbral mínimo no puede ser negativo.");
    }
    if (product.unitCostUSD <= 0)
        errors.push("El costo unitario debe ser mayor que 0.");
    return { valid: errors.length === 0, errors };
}
export function validateShipment(shipment) {
    const errors = [];
    if (shipment.quantity <= 0)
        errors.push("La cantidad debe ser mayor que 0.");
    if (shipment.declaredValueUSD <= 0) {
        errors.push("El valor declarado debe ser mayor que 0.");
    }
    if (shipment.destination.distanceKm < 0) {
        errors.push("La distancia no puede ser negativa.");
    }
    return { valid: errors.length === 0, errors };
}
export function validateCarrier(carrier) {
    const errors = [];
    if (carrier.baseRateUSD < 0 ||
        carrier.ratePerKgUSD < 0 ||
        carrier.ratePerKmUSD < 0) {
        errors.push("Las tarifas no pueden ser negativas.");
    }
    if (carrier.avgDeliveryDays <= 0) {
        errors.push("Los días promedio de entrega deben ser mayores que 0.");
    }
    if (carrier.onTimeRate < 0 || carrier.onTimeRate > 100) {
        errors.push("La tasa de puntualidad debe estar entre 0 y 100.");
    }
    if (carrier.maxWeightKg <= 0) {
        errors.push("El peso máximo debe ser mayor que 0.");
    }
    if (carrier.operatesIn.length === 0) {
        errors.push("El transportista debe operar en al menos un país.");
    }
    return { valid: errors.length === 0, errors };
}
