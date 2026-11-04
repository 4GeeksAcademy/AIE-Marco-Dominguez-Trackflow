"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getCurrentUser,
  updateMyProfile,
  type CurrentUser,
} from "@/app/lib/auth-client";

type ProfileFields = { name: string; phone: string; address: string };

export default function AccountProfile() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [fields, setFields] = useState<ProfileFields>({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setFields({
          name: currentUser.profile?.name ?? "",
          phone: currentUser.profile?.phone ?? "",
          address: currentUser.profile?.address ?? "",
        });
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el perfil.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function updateField(name: keyof ProfileFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // La API recibe null cuando un campo opcional queda vacío.
      await updateMyProfile({
        name: fields.name.trim() || null,
        phone: fields.phone.trim() || null,
        address: fields.address.trim() || null,
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="auth-page"><p role="status">Cargando perfil…</p></main>;
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="profile-title">
        <div className="auth-heading">
          <p className="eyebrow">PEOPLE &amp; TALENT · TRACKFLOW</p>
          <h1 id="profile-title">Mi perfil</h1>
        </div>
        {user && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input type="email" value={user.email} readOnly />
            </label>
            <label className="auth-field">
              <span>Nombre</span>
              <input value={fields.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Teléfono</span>
              <input type="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Dirección</span>
              <input value={fields.address} onChange={(event) => updateField("address", event.target.value)} />
            </label>
            {error && <p className="auth-form-error" role="alert">{error}</p>}
            {saved && <p className="auth-success" role="status">Perfil actualizado.</p>}
            <button className="primary-button auth-submit" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        )}
        {!user && error && <p className="auth-form-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}