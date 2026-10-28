// src/app/(dashboard)/dashboard/page.tsx
import { creerClientServeur } from "@/lib/supabase/server";
import FileAttente from "./file-attente";

export default async function DashboardPage() {
  const supabase = await creerClientServeur();

  const { data: { user } } = await supabase.auth.getUser();

  // Rôle de l'utilisateur (enregistrement + encaissement)
  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const monRole = profil?.role ?? "laveur";
  const peutEncaisser = monRole === "gerante" || monRole === "admin";

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "id, statut, notes, laveur_id, debut_lavage, fin_lavage, canal, encaissements(id, numero_recu, montant, paye_le)"
    )
    .order("created_at", { ascending: true });

  // Catalogue et noms des laveurs : utiles seulement pour l'encaissement
  const { data: prestations } = peutEncaisser
    ? await supabase
        .from("prestations")
        .select("id, nom, prix")
        .eq("active", true)
        .order("prix", { ascending: true })
    : { data: [] };

  const { data: laveurs } = peutEncaisser
    ? await supabase.from("profils").select("id, nom_complet")
    : { data: [] };

  return (
    <FileAttente
      reservationsInitiales={(reservations ?? []).map((r) => {
        const liste = Array.isArray(r.encaissements)
          ? r.encaissements
          : r.encaissements
            ? [r.encaissements]
            : [];
        return { ...r, encaissement: liste[0] ?? null };
      })}
      monId={user?.id ?? ""}
      monRole={monRole}
      prestations={prestations ?? []}
      laveurs={laveurs ?? []}
    />
  );
}
