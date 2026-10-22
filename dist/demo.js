import { filterLowStockProducts, filterProductsByCategory, filterProductsByWarehouse, sortCarriersByReliability, sortProductsByStock, } from "./utils/collections.js";
import { sampleCarriers, sampleProducts, sampleShipments } from "./data/sample-data.js";
import { binarySearchProductByWeight, findProductBySKU, findShipmentById, } from "./utils/search.js";
import { calculateAverageShipmentDistance, calculateShippingCost, calculateTotalInventoryValue, countProductsByCategory, findTopCarriers, groupShipmentsByStatus, scoreCarrierForShipment, selectBestCarrier, } from "./utils/transformations.js";
import { validateCarrier, validateProduct, validateShipment, } from "./utils/validations.js";
function getElement(selector) {
    const element = document.querySelector(selector);
    if (element === null)
        throw new Error(`No se encontró el elemento ${selector}`);
    return element;
}
const resultElement = getElement("#result");
const resultTitle = getElement("#result-title");
const filterModeElement = getElement("#filter-mode");
const filterValueElement = getElement("#filter-value");
function showResult(title, result) {
    resultTitle.textContent = title;
    resultElement.textContent = JSON.stringify(result, null, 2);
}
function bindButton(id, action) {
    getElement(`#${id}`).addEventListener("click", action);
}
function updateFilterOptions() {
    const options = filterModeElement.value === "warehouse"
        ? [["Los Angeles", "Los Angeles"], ["Zaragoza", "Zaragoza"]]
        : filterModeElement.value === "category"
            ? [
                ["Fashion", "Fashion"],
                ["Electronics", "Electronics"],
                ["Cosmetics", "Cosmetics"],
                ["Home", "Home"],
                ["Other", "Other"],
            ]
            : [];
    filterValueElement.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
    filterValueElement.disabled = options.length === 0;
}
filterModeElement.addEventListener("change", updateFilterOptions);
updateFilterOptions();
bindButton("run-filter", () => {
    const mode = filterModeElement.value;
    const value = filterValueElement.value;
    if (mode === "warehouse") {
        showResult("Productos por almacén", filterProductsByWarehouse(sampleProducts, value));
    }
    else if (mode === "category") {
        showResult("Productos por categoría", filterProductsByCategory(sampleProducts, value));
    }
    else {
        showResult("Productos con stock bajo", filterLowStockProducts(sampleProducts));
    }
});
bindButton("sort-products", () => {
    const order = getElement("#product-order").value;
    showResult("Productos ordenados por stock", sortProductsByStock(sampleProducts, order));
});
bindButton("search-product", () => {
    const sku = getElement("#product-sku").value;
    showResult("Búsqueda de producto por SKU", findProductBySKU(sampleProducts, sku));
});
bindButton("search-shipment", () => {
    const id = getElement("#shipment-id").value.trim();
    showResult("Búsqueda de envío por ID", findShipmentById(sampleShipments, id));
});
bindButton("search-weight", () => {
    const targetWeight = getElement("#target-weight").valueAsNumber;
    const sortedProducts = [...sampleProducts].sort((first, second) => first.weightKg - second.weightKg);
    const index = binarySearchProductByWeight(sortedProducts, targetWeight);
    showResult("Búsqueda binaria por peso (índice del array ordenado)", index === -1 ? null : { index, product: sortedProducts[index] });
});
bindButton("sort-carriers", () => {
    const order = getElement("#carrier-order").value;
    showResult("Transportistas ordenados por puntualidad", sortCarriersByReliability(sampleCarriers, order));
});
bindButton("evaluate-carriers", () => {
    const shipmentId = getElement("#evaluation-shipment").value;
    const shipment = findShipmentById(sampleShipments, shipmentId);
    const product = findProductBySKU(sampleProducts, getElement("#evaluation-sku").value);
    if (shipment === null || product === null) {
        showResult("Evaluación de transportistas", { error: "Selecciona un envío y un SKU existentes." });
        return;
    }
    const scores = sampleCarriers.map((carrier) => ({
        carrier: carrier.name,
        score: scoreCarrierForShipment(carrier, shipment, product),
        cost: calculateShippingCost(shipment, product, carrier),
    }));
    showResult("Evaluación de transportistas", {
        scores,
        bestOption: selectBestCarrier(sampleCarriers, shipment, product),
    });
});
bindButton("run-report", () => {
    const report = getElement("#report-type").value;
    if (report === "categories") {
        showResult("Productos por categoría", countProductsByCategory(sampleProducts));
    }
    else if (report === "inventory") {
        showResult("Valor total del inventario (USD)", calculateTotalInventoryValue(sampleProducts));
    }
    else if (report === "distance") {
        showResult("Distancia media de envíos (km)", calculateAverageShipmentDistance(sampleShipments));
    }
    else if (report === "statuses") {
        showResult("Envíos agrupados por estado", groupShipmentsByStatus(sampleShipments));
    }
    else {
        const topN = getElement("#top-n").valueAsNumber;
        showResult("Transportistas más utilizados", findTopCarriers(sampleShipments, topN));
    }
});
bindButton("run-validation", () => {
    const entity = getElement("#validation-entity").value;
    if (entity === "product") {
        showResult("Validación de producto", validateProduct(sampleProducts[0]));
    }
    else if (entity === "shipment") {
        showResult("Validación de envío", validateShipment(sampleShipments[0]));
    }
    else {
        showResult("Validación de transportista", validateCarrier(sampleCarriers[0]));
    }
});
showResult("Datos de ejemplo listos", {
    products: sampleProducts.length,
    carriers: sampleCarriers.length,
    shipments: sampleShipments.length,
    hint: "Elige una operación para ver sus resultados.",
});
