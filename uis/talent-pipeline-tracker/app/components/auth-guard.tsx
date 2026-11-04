"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ApiError,
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  sessionExpiredEvent,
} from "@/app/lib/auth-client";

type AuthGuardProps = { children: ReactNode };
type SessionCheck = { pathname: string; error?: string };

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionCheck, setSessionCheck] = useState<SessionCheck | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const publicRoute = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    const redirectToLogin = () => router.replace("/login");
    window.addEventListener(sessionExpiredEvent, redirectToLogin);
    return () => window.removeEventListener(sessionExpiredEvent, redirectToLogin);
  }, [router]);

  useEffect(() => {
    if (publicRoute) return;

    let active = true;

    // El servidor no puede leer localStorage; la sesión se comprueba en el navegador.
    if (!getAccessToken()) {
      router.replace("/login");
      return () => { active = false; };
    }

    getCurrentUser()
      .then(() => {
        if (active) setSessionCheck({ pathname });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (!(cause instanceof ApiError) || cause.status !== 401) {
          setSessionCheck({
            pathname,
            error: "No se pudo verificar la sesión. Comprueba la conexión e inténtalo de nuevo.",
          });
          return;
        }
        clearAccessToken();
        router.replace("/login");
      });

    return () => { active = false; };
  }, [pathname, publicRoute, retryCount, router]);

  if (publicRoute) return children;
  const currentCheck = sessionCheck?.pathname === pathname ? sessionCheck : null;
  if (currentCheck?.error) {
    return (
      <main className="auth-loading" role="alert">
        <p>{currentCheck.error}</p>
        <button type="button" onClick={() => {
          setSessionCheck(null);
          setRetryCount((count) => count + 1);
        }}>Reintentar</button>
      </main>
    );
  }
  if (!currentCheck) {
    return <main className="auth-loading" role="status">Comprobando sesión…</main>;
  }
  return children;
}