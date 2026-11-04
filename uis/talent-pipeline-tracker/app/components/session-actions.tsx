"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/lib/auth-client";

export default function SessionActions() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <div className="session-actions">
      <Link href="/account/profile">Mi perfil</Link>
      <button type="button" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}