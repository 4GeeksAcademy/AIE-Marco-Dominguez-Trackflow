"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/lib/auth-client";

export default function SessionActions() {
  const pathname = usePathname();
  if (["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname)) {
    return null;
  }

  return (
    <div className="session-actions">
      <Link href="/account/profile">Mi perfil</Link>
      <Link href="/account/change-password">Cambiar contraseña</Link>
      <button type="button" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}