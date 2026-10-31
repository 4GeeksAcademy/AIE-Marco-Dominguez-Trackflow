import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import AuthGuard from "@/app/components/auth-guard";
import SessionActions from "@/app/components/session-actions";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-trackflow-sans", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-trackflow-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "TrackFlow | Directorio de proveedores",
  description: "Directorio operativo de proveedores de TrackFlow.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${plexMono.variable}`}>
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand-lockup" href="/" aria-label="TrackFlow, directorio">
              <span className="brand-mark" aria-hidden="true">T</span><span>TRACKFLOW</span>
            </Link>
            <nav aria-label="Navegación principal"><Link className="nav-link active" href="/">Directorio</Link><span className="nav-context">OPERACIONES</span></nav>
            <span className="market-label"><i /> USA <b>·</b> España</span>
            <SessionActions />
          </header>
          <AuthGuard>{children}</AuthGuard>
          <footer className="app-footer"><span>TRACKFLOW · SUPPLIER OPERATIONS</span><span>LOS ANGELES / ZARAGOZA</span></footer>
        </div>
      </body>
    </html>
  );
}