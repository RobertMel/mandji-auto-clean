// src/app/(dashboard)/dashboard/stats/page.tsx
import { exigerGestionnaire } from "@/lib/session";
import StatsClient from "./stats-client";

export default async function StatsPage() {
  const { supabase } = await exigerGestionnaire();

  // Les 3 lectures partent en même temps
  const [{ data: laveurs }, { data: lavages }, { data: encaissements }] = await Promise.all([
    // Tous les laveurs (pour afficher chacun, même à 0)
    supabase.from("profils").select("id, nom_complet, surnom").eq("role", "laveur").order("nom_complet"),
    // Tous les lavages terminés (la période est filtrée côté navigateur)
    supabase
      .from("reservations")
      .select("laveur_id, fin_lavage")
      .eq("statut", "terminee")
      .not("fin_lavage", "is", null),
    // Encaissements payés (chiffre d'affaires) — les factures à régler n'y sont pas encore
    supabase.from("encaissements").select("montant, mode_paiement, paye_le").eq("statut", "paye"),
  ]);

  // Ordre « Laveur 1, 2, … 10 » (tri numérique)
  const tries = (laveurs ?? []).sort((a, b) =>
    a.nom_complet.localeCompare(b.nom_complet, "fr", { numeric: true })
  );

  return (
    <StatsClient
      laveurs={tries}
      lavages={lavages ?? []}
      encaissements={encaissements ?? []}
    />
  );
}
