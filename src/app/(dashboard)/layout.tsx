// src/app/(dashboard)/layout.tsx
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
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Mandji" className="h-10" />
          <nav className="hidden gap-6 text-sm font-medium sm:flex">
            <a href="/dashboard" className="hover:text-[#1F8A3B]">Lavages</a>
            {(profil.role === "gerante" || profil.role === "admin") && (
              <>
                <a href="/dashboard/prestations" className="hover:text-[#1F8A3B]">
                  Prestations
                </a>
                <a href="/dashboard/stats" className="hover:text-[#1F8A3B]">
                  Statistiques
                </a>
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