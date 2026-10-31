"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, login, register, type RegistrationInput } from "@/app/lib/auth-client";

type AuthFormProps = { mode: "login" | "register" };
type FieldName = "email" | "password" | "name" | "phone" | "address";
type AuthFields = Record<FieldName, string>;

const emptyFields: AuthFields = { email: "", password: "", name: "", phone: "", address: "" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState(emptyFields);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  function updateField(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFieldErrors({});

    try {
      if (isRegister) {
        const input: RegistrationInput = {
          email: fields.email,
          password: fields.password,
          name: fields.name || undefined,
          phone: fields.phone || undefined,
          address: fields.address || undefined,
        };
        await register(input);
      } else {
        await login({ email: fields.email, password: fields.password });
      }
      router.replace("/");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError && isRegister) {
        // FastAPI ubica errores de validación en loc; se muestran junto al campo correspondiente.
        const nextErrors: Partial<Record<FieldName, string>> = {};
        for (const issue of cause.validationIssues) {
          const field = issue.loc?.[issue.loc.length - 1];
          if (field && field in emptyFields && issue.msg) nextErrors[field as FieldName] = issue.msg;
        }
        if (cause.status === 409) nextErrors.email = cause.message;
        if (Object.keys(nextErrors).length > 0) setFieldErrors(nextErrors);
        else setFormError(cause.message);
      } else {
        setFormError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(name: FieldName, label: string, type = "text") {
    const error = fieldErrors[name];
    return (
      <label className="auth-field">
        <span>{label}</span>
        <input
          type={type}
          name={name}
          value={fields[name]}
          onChange={(event) => updateField(name, event.target.value)}
          autoComplete={name === "email" ? "email" : name === "password" ? (isRegister ? "new-password" : "current-password") : "off"}
          required={name === "email" || name === "password"}
          minLength={name === "password" ? 8 : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {error && <span className="auth-field-error" id={`${name}-error`}>{error}</span>}
      </label>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-heading">
          <p className="eyebrow">TRACKFLOW · CUENTA</p>
          <h1 id="auth-title">{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {renderField("email", "Email", "email")}
          {renderField("password", "Contraseña", "password")}
          {isRegister && (
            <>
              {renderField("name", "Nombre")}
              {renderField("phone", "Teléfono", "tel")}
              {renderField("address", "Dirección")}
            </>
          )}
          {formError && <p className="auth-form-error" role="alert">{formError}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Procesando…" : isRegister ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes una cuenta?"}{" "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </Link>
        </p>
      </section>
    </main>
  );
}