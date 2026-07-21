// src/app/(dashboard)/dashboard/page.tsx
import { creerClientServeur } from "@/lib/supabase/server";
import FileAttente from "./file-attente";

export default async function DashboardPage() {
  const supabase = await creerClientServeur();

  // On lit les réservations du jour qui ne sont pas encore terminées,
  // + celles terminées aujourd'hui (pour le compteur en bas).
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, statut, notes, laveur_id, debut_lavage, fin_lavage, canal")
    .order("created_at", { ascending: true });

  // Qui suis-je ? (pour n'activer "Terminé" que sur mes lavages)
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <FileAttente
      reservationsInitiales={reservations ?? []}
      monId={user?.id ?? ""}
    />
  );
}