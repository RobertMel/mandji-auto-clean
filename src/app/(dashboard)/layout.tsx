// src/app/(dashboard)/layout.tsx
import Link from "next/link";
import { exigerConnexion } from "@/lib/session";
import Deconnexion from "./deconnexion";
import NavDashboard from "./nav-dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Session lue une seule fois, partagée avec la page affichée
  const { profil } = await exigerConnexion();

  const gestionnaire = profil.role === "gerante" || profil.role === "admin";

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 print:hidden">
        <div className="flex items-center justify-between max-w-5xl gap-3 px-4 py-3 mx-auto sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-symbole.png" alt="" className="w-9 h-9" />
            <span className="hidden font-bold sm:inline">Mandji Auto Clean</span>
          </Link>

          <div className="flex items-center min-w-0 gap-3">
            <div className="min-w-0 text-right">
              <p className="text-sm font-medium truncate">{profil.nom_complet}</p>
              <p className="text-xs text-gray-500">
                {({ gerante: "Gérante", admin: "Admin", laveur: "Laveur" } as Record<string, string>)[profil.role] ?? profil.role}
              </p>
            </div>
            <Deconnexion />
          </div>
        </div>
      </header>
      <NavDashboard gestionnaire={gestionnaire} />

      {children}
    </div>
  );
}
