"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { forgotPassword } from "@/app/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <div className="auth-heading">
          <p className="eyebrow">TRACKFLOW · CUENTA</p>
          <h1 id="forgot-password-title">Recuperar contraseña</h1>
        </div>
        {submitted ? (
          <p className="auth-success" role="status">
            Si esa dirección está registrada, recibirás un enlace en breve.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                disabled={submitting}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {error && <p className="auth-form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}
        <p className="auth-switch"><Link href="/login">Volver a iniciar sesión</Link></p>
      </section>
    </main>
  );
}
