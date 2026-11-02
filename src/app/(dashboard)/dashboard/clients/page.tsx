// src/app/(dashboard)/dashboard/clients/page.tsx
import { exigerGestionnaire } from "@/lib/session";
import ListeClients, { type ClientResume } from "./liste-clients";

type Ligne = {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  entreprise: boolean;
  vehicules: { marque: string | null; couleur: string | null; immatriculation: string | null }[];
  reservations: {
    created_at: string;
    encaissements: { montant: number; statut: string }[] | { montant: number; statut: string } | null;
  }[];
};

export default async function ClientsPage() {
  const { supabase } = await exigerGestionnaire();

  const { data } = await supabase
    .from("clients")
    .select(
      `id, nom, prenom, telephone, entreprise,
       vehicules ( marque, couleur, immatriculation ),
       reservations ( created_at, encaissements ( montant, statut ) )`
    )
    .order("created_at", { ascending: false });

  const clients: ClientResume[] = ((data ?? []) as unknown as Ligne[]).map((c) => {
    const montants = c.reservations.flatMap((r) =>
      Array.isArray(r.encaissements)
        ? r.encaissements
        : r.encaissements
          ? [r.encaissements]
          : []
    );
    const dates = c.reservations.map((r) => r.created_at).sort();
    return {
      id: c.id,
      nom: [c.prenom, c.nom].filter(Boolean).join(" "),
      telephone: c.telephone,
      entreprise: c.entreprise,
      aPayer: montants.filter((e) => e.statut !== "paye").reduce((s, e) => s + e.montant, 0),
      vehicules: c.vehicules
        .map((v) => [v.marque, v.couleur, v.immatriculation].filter(Boolean).join(" "))
        .filter(Boolean),
      passages: c.reservations.length,
      totalDepense: montants.filter((e) => e.statut === "paye").reduce((s, e) => s + e.montant, 0),
      derniereVisite: dates.at(-1) ?? null,
    };
  });

  return <ListeClients clients={clients} />;
}
