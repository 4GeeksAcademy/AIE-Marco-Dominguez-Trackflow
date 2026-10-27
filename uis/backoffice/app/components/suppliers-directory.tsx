"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  categories,
  categoryLabels,
  countries,
  type Supplier,
  type SupplierCategory,
  type SupplierCountry,
  type SupplierInput,
  type SupplierStatus,
} from "@/app/types/supplier";
import {
  createSupplier,
  getSuppliers,
  updateSupplierRate,
  updateSupplierStatus,
} from "@/app/lib/suppliers-api";

const initialForm = {
  name: "",
  country: "USA" as SupplierCountry,
  categories: [] as SupplierCategory[],
  rate: "",
  status: "active" as SupplierStatus,
  serviceZone: "",
  contactEmail: "",
  notes: "",
};

function formatRate(rate: number, currency: Supplier["currency"]): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(rate);
}

function displayError(cause: unknown): string {
  return cause instanceof Error ? cause.message : "No se pudo completar la operación.";
}

export default function SuppliersDirectory() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [reload, setReload] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const requestKey = JSON.stringify([country, category, reload]);
  const loading = loadedRequest !== requestKey;

  useEffect(() => {
    let active = true;
    // Ignora una respuesta anterior si el usuario cambia los filtros durante la petición.
    getSuppliers({ country, category })
      .then((records) => {
        if (!active) return;
        setSuppliers(records);
        setRateDrafts(Object.fromEntries(records.map((record) => [record.id, String(record.rate_per_shipment)])));
        setError("");
        setLoadedRequest(requestKey);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(displayError(cause));
        setLoadedRequest(requestKey);
      });

    return () => {
      active = false;
    };
  }, [country, category, reload, requestKey]);

  function updateSupplier(updated: Supplier) {
    setSuppliers((current) => current.map((item) => item.id === updated.id ? updated : item));
    setRateDrafts((current) => ({ ...current, [updated.id]: String(updated.rate_per_shipment) }));
  }

  async function submitNewSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (form.categories.length === 0) {
      setError("Selecciona al menos una categoría.");
      return;
    }

    const input: SupplierInput = {
      name: form.name.trim(),
      country: form.country,
      categories: form.categories,
      rate_per_shipment: Number(form.rate),
      currency: form.country === "USA" ? "USD" : "EUR",
      status: form.status,
      service_zone: form.serviceZone.trim() || null,
      contact_email: form.contactEmail.trim() || null,
      notes: form.notes.trim() || null,
    };

    // La moneda se deriva del país para impedir combinaciones incompatibles desde el formulario.
    setSaving(true);
    try {
      await createSupplier(input);
      setForm(initialForm);
      setFormOpen(false);
      setError("");
      setNotice("Proveedor registrado.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(displayError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveRate(supplier: Supplier) {
    const rate = Number(rateDrafts[supplier.id]);
    if (!Number.isFinite(rate) || rate <= 0) {
      setError("La tarifa debe ser mayor que cero.");
      return;
    }
    try {
      // La respuesta incluye el timestamp nuevo; se sustituye la fila sin recargar la página.
      updateSupplier(await updateSupplierRate(supplier.id, rate));
      setError("");
      setNotice(`Tarifa actualizada para ${supplier.name}.`);
    } catch (cause) {
      setError(displayError(cause));
    }
  }

  async function changeStatus(supplier: Supplier, status: SupplierStatus) {
    try {
      updateSupplier(await updateSupplierStatus(supplier.id, status));
      setError("");
      setNotice(`Estado actualizado para ${supplier.name}.`);
    } catch (cause) {
      setError(displayError(cause));
    }
  }

  function toggleCategory(value: SupplierCategory) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(value)
        ? current.categories.filter((item) => item !== value)
        : [...current.categories, value],
    }));
  }

  const activeCount = suppliers.filter((supplier) => supplier.status === "active").length;

  return (
    <main className="directory-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">OPERACIONES · COMPRAS</p>
          <h1>Directorio de proveedores</h1>
          <p className="page-subtitle">Una vista compartida de los contratos de USA y España.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => { setError(""); setFormOpen(true); }}>
          <span aria-hidden="true">+</span> Nuevo proveedor
        </button>
      </section>

      <section className="summary-strip" aria-label="Resumen del directorio">
        <div><span className="summary-value">{loading ? "—" : suppliers.length}</span><span className="summary-label">Proveedores visibles</span></div>
        <div><span className="summary-value active-value">{loading ? "—" : activeCount}</span><span className="summary-label">Activos en la vista</span></div>
        <p>Tarifas en la moneda de cada contrato</p>
      </section>

      <section className="directory-section" aria-label="Listado de proveedores">
        <div className="toolbar">
          <div className="toolbar-title"><h2>Proveedores</h2><span>DIRECTORIO ACTUAL</span></div>
          <div className="filters">
            <label>
              <span>País</span>
              <select value={country} onChange={(event) => setCountry(event.target.value)}>
                <option value="">Todos</option>
                {countries.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="category-filter">
              <span>Categoría</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Todas</option>
                {categories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
              </select>
            </label>
            <button className="icon-button" type="button" title="Actualizar listado" aria-label="Actualizar listado" onClick={() => setReload((value) => value + 1)}>↻</button>
          </div>
        </div>

        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}

        {loading ? (
          <div className="loading-state" aria-live="polite">Cargando proveedores…</div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state"><span className="empty-mark">0</span><h2>No hay proveedores en esta vista</h2><p>Cambia los filtros o registra un proveedor nuevo.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Proveedor</th><th>Categorías</th><th>Tarifa / unidad</th><th>Estado</th><th>Actualizado</th></tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className={supplier.status === "suspended" ? "suspended-row" : ""}>
                    <td className="supplier-cell">
                      <strong>{supplier.name}</strong>
                      <span>{supplier.country}{supplier.service_zone ? ` · ${supplier.service_zone}` : ""}</span>
                      {supplier.contact_email && <a href={`mailto:${supplier.contact_email}`}>{supplier.contact_email}</a>}
                    </td>
                    <td><div className="category-list">{supplier.categories.map((value) => <span className="category-tag" key={value}>{categoryLabels[value]}</span>)}</div></td>
                    <td>
                      <form className="rate-control" onSubmit={(event) => { event.preventDefault(); void saveRate(supplier); }}>
                        <label className="sr-only" htmlFor={`rate-${supplier.id}`}>Tarifa de {supplier.name}</label>
                        <input
                          id={`rate-${supplier.id}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={rateDrafts[supplier.id] ?? supplier.rate_per_shipment}
                          onChange={(event) => setRateDrafts((current) => ({ ...current, [supplier.id]: event.target.value }))}
                        />
                        <span className="currency-code">{supplier.currency}</span>
                        <button className="save-rate" type="submit" title="Guardar tarifa" aria-label={`Guardar tarifa de ${supplier.name}`}>↵</button>
                      </form>
                      <span className="rate-reference">Actual: {formatRate(supplier.rate_per_shipment, supplier.currency)}</span>
                    </td>
                    <td>
                      <label className={`status-select status-${supplier.status}`}>
                        <span className="status-dot" aria-hidden="true" />
                        <span className="sr-only">Estado de {supplier.name}</span>
                        <select value={supplier.status} onChange={(event) => void changeStatus(supplier, event.target.value as SupplierStatus)}>
                          <option value="active">Activo</option>
                          <option value="suspended">Suspendido</option>
                        </select>
                      </label>
                    </td>
                    <td className="updated-cell">{new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(supplier.updated_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <section className="supplier-dialog" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="dialog-heading"><div><p className="eyebrow">NUEVO REGISTRO</p><h2 id="form-title">Añadir proveedor</h2></div><button className="icon-button close-button" type="button" aria-label="Cerrar formulario" onClick={() => setFormOpen(false)}>×</button></div>
            <form onSubmit={(event) => void submitNewSupplier(event)}>
              <div className="form-grid">
                <label className="form-field wide-field"><span>Nombre comercial *</span><input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label className="form-field"><span>País *</span><select value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value as SupplierCountry }))}><option value="USA">USA</option><option value="Spain">Spain</option></select></label>
                <label className="form-field"><span>Tarifa por envío / unidad *</span><input required type="number" min="0.01" step="0.01" value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} /></label>
                <label className="form-field"><span>Moneda del contrato</span><input readOnly value={form.country === "USA" ? "USD" : "EUR"} /></label>
                <label className="form-field"><span>Estado inicial</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SupplierStatus }))}><option value="active">Activo</option><option value="suspended">Suspendido</option></select></label>
                <label className="form-field"><span>Zona de servicio</span><input maxLength={120} value={form.serviceZone} onChange={(event) => setForm((current) => ({ ...current, serviceZone: event.target.value }))} /></label>
                <label className="form-field"><span>Email de contacto</span><input type="email" maxLength={254} value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} /></label>
                <label className="form-field wide-field"><span>Notas operativas</span><textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              </div>
              <fieldset className="category-options">
                <legend>Categorías de producto *</legend>
                <div>{categories.map((value) => <label key={value}><input type="checkbox" checked={form.categories.includes(value)} onChange={() => toggleCategory(value)} /><span>{categoryLabels[value]}</span></label>)}</div>
              </fieldset>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Registrar proveedor"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}