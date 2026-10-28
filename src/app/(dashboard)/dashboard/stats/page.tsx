// src/app/(dashboard)/dashboard/stats/page.tsx
import { exigerGestionnaire } from "@/lib/session";
import StatsClient from "./stats-client";

export default async function StatsPage() {
  const { supabase } = await exigerGestionnaire();

  // Les 3 lectures partent en même temps
  const [{ data: laveurs }, { data: lavages }, { data: encaissements }] = await Promise.all([
    // Tous les laveurs (pour afficher chacun, même à 0)
    supabase.from("profils").select("id, nom_complet").eq("role", "laveur").order("nom_complet"),
    // Tous les lavages terminés (la période est filtrée côté navigateur)
    supabase
      .from("reservations")
      .select("laveur_id, fin_lavage")
      .eq("statut", "terminee")
      .not("fin_lavage", "is", null),
    // Encaissements (chiffre d'affaires)
    supabase.from("encaissements").select("montant, mode_paiement, paye_le"),
  ]);

  return (
    <StatsClient
      laveurs={laveurs ?? []}
      lavages={lavages ?? []}
      encaissements={encaissements ?? []}
    />
  );
}
