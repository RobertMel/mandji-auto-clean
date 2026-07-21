// src/app/(dashboard)/dashboard/stats/page.tsx
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import StatsClient from "./stats-client";

export default async function StatsPage() {
  const supabase = await creerClientServeur();

  // Garde : seuls gérante et admin accèdent à cette page.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profil || (profil.role !== "gerante" && profil.role !== "admin")) {
    redirect("/dashboard");
  }

  // Tous les laveurs (pour afficher chacun, même à 0).
  const { data: laveurs } = await supabase
    .from("profils")
    .select("id, nom_complet")
    .eq("role", "laveur")
    .order("nom_complet");

  // Tous les lavages terminés (on filtrera la période côté client).
  const { data: lavages } = await supabase
    .from("reservations")
    .select("laveur_id, fin_lavage")
    .eq("statut", "terminee")
    .not("fin_lavage", "is", null);

  return (
    <StatsClient
      laveurs={laveurs ?? []}
      lavages={lavages ?? []}
    />
  );
}