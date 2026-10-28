// src/app/(dashboard)/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import Deconnexion from "./deconnexion";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await creerClientServeur();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role, actif")
    .eq("id", user.id)
    .single();

  // Compte sans profil ou désactivé : aucun accès (deny by default).
  if (!profil || !profil.actif) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Mandji" className="h-10" />
          <nav className="hidden gap-6 text-sm font-medium sm:flex">
            <Link href="/dashboard" className="hover:text-[#1F8A3B]">Lavages</Link>
            {(profil.role === "gerante" || profil.role === "admin") && (
              <>
                <Link href="/dashboard/clients" className="hover:text-[#1F8A3B]">
                  Clients
                </Link>
                <Link href="/dashboard/prestations" className="hover:text-[#1F8A3B]">
                  Prestations
                </Link>
                <Link href="/dashboard/stock" className="hover:text-[#1F8A3B]">
                  Stock
                </Link>
                <Link href="/dashboard/compta" className="hover:text-[#1F8A3B]">
                  Compta
                </Link>
                <Link href="/dashboard/stats" className="hover:text-[#1F8A3B]">
                  Statistiques
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{profil.nom_complet}</p>
            <p className="text-xs text-gray-500 capitalize">{profil.role}</p>
          </div>
          <Deconnexion />
        </div>
      </header>

      {children}
    </div>
  );
}