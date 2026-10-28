// src/app/(dashboard)/dashboard/page.tsx
import { estGestionnaire, exigerConnexion } from "@/lib/session";
import FileAttente from "./file-attente";

export default async function DashboardPage() {
  const { supabase, userId, profil } = await exigerConnexion();
  const monRole = profil.role;
  const peutEncaisser = estGestionnaire(monRole);

  // Les lectures partent en même temps (catalogue et noms des laveurs :
  // utiles seulement pour l'encaissement)
  const [{ data: reservations }, { data: prestations }, { data: laveurs }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "id, statut, notes, laveur_id, debut_lavage, fin_lavage, canal, encaissements(id, numero_recu, montant, paye_le)"
      )
      .order("created_at", { ascending: true }),
    peutEncaisser
      ? supabase.from("prestations").select("id, nom, prix").eq("active", true).order("prix", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; nom: string; prix: number }[] }),
    peutEncaisser
      ? supabase.from("profils").select("id, nom_complet")
      : Promise.resolve({ data: [] as { id: string; nom_complet: string }[] }),
  ]);

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
      monId={userId}
      monRole={monRole}
      prestations={prestations ?? []}
      laveurs={laveurs ?? []}
    />
  );
}
