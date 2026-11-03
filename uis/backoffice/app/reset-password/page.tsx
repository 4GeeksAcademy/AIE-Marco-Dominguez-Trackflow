"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { resetPassword } from "@/app/lib/auth-client";
import PasswordInput from "@/app/components/password-input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Read the one-time token in the browser so this route does not need client-side suspense.
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    if (!token) {
      setError("El enlace no contiene un token de restablecimiento.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      router.replace("/login?passwordReset=success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <div className="auth-heading">
          <p className="eyebrow">TRACKFLOW · CUENTA</p>
          <h1 id="reset-password-title">Crear contraseña nueva</h1>
        </div>
        {token === null ? (
          <p role="status">Comprobando enlace…</p>
        ) : token === "" ? (
          <p className="auth-form-error" role="alert">
            El enlace no es válido. Solicita uno nuevo usando el formulario de recuperación.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="new-password">Nueva contraseña</label>
              <PasswordInput
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
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
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            {error && <p className="auth-form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </form>
        )}
        <p className="auth-switch"><Link href="/forgot-password">Solicitar otro enlace</Link></p>
      </section>
    </main>
  );
}
