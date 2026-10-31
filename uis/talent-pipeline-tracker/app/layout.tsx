import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import AuthGuard from "@/app/components/auth-guard";
import SessionActions from "@/app/components/session-actions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackFlow | People & Talent",
  description: "Pipeline de candidaturas de TrackFlow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand-lockup" href="/" aria-label="TrackFlow, inicio">
              <span className="brand-mark" aria-hidden="true">T</span>
              <span>TRACKFLOW</span>
            </Link>
            <nav className="primary-nav" aria-label="Navegación principal">
              <Link href="/">Candidaturas</Link>
              <Link href="/incidents">Incidencias</Link>
            </nav>
            <div className="workspace-name"><span>People &amp; Talent</span><span className="workspace-divider">/</span><span>Equipo interno</span></div>
            <Suspense fallback={null}>
              <SessionActions />
            </Suspense>
          </header>
          <Suspense fallback={<main className="auth-loading" role="status">Comprobando sesión…</main>}>
            <AuthGuard>{children}</AuthGuard>
          </Suspense>
          <footer className="app-footer"><span>TRACKFLOW TALENT OPERATIONS</span><span>LOS ANGELES · ZARAGOZA</span></footer>
        </div>
      </body>
    </html>
  );
}
