"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { changePassword } from "@/app/lib/auth-client";
import PasswordInput from "@/app/components/password-input";

type PasswordFields = {
  current: string;
  next: string;
  confirmation: string;
};

const emptyFields: PasswordFields = { current: "", next: "", confirmation: "" };

export default function ChangePasswordPage() {
  const [fields, setFields] = useState(emptyFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateField(name: keyof PasswordFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);

    if (fields.next !== fields.confirmation) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(fields.current, fields.next);
      setFields(emptyFields);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="change-password-title">
        <div className="auth-heading">
          <p className="eyebrow">TRACKFLOW · CUENTA</p>
          <h1 id="change-password-title">Cambiar contraseña</h1>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="current-password">Contraseña actual</label>
            <PasswordInput
              id="current-password"
              name="current-password"
              autoComplete="current-password"
              required
              value={fields.current}
              onChange={(event) => updateField("current", event.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="new-password">Nueva contraseña</label>
            <PasswordInput
              id="new-password"
              name="new-password"
              autoComplete="new-password"
              minLength={8}
              required
              value={fields.next}
              onChange={(event) => updateField("next", event.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="confirmation">Confirmar nueva contraseña</label>
            <PasswordInput
              id="confirmation"
              name="confirmation"
              autoComplete="new-password"
              minLength={8}
              required
              value={fields.confirmation}
              onChange={(event) => updateField("confirmation", event.target.value)}
            />
          </div>
          {error && <p className="auth-form-error" role="alert">{error}</p>}
          {saved && <p className="auth-success" role="status">Contraseña actualizada correctamente.</p>}
          <button className="primary-button auth-submit" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
        <p className="auth-switch"><Link href="/account/profile">Volver a mi perfil</Link></p>
      </section>
    </main>
  );
}
