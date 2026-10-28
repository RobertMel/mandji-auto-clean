// src/app/(dashboard)/dashboard/clients/page.tsx
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import ListeClients, { type ClientResume } from "./liste-clients";

type Ligne = {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  vehicules: { marque: string | null; couleur: string | null; immatriculation: string | null }[];
  reservations: {
    created_at: string;
    encaissements: { montant: number }[] | { montant: number } | null;
  }[];
};

export default async function ClientsPage() {
  const supabase = await creerClientServeur();

  const { data: estGestionnaire } = await supabase.rpc("est_gestionnaire");
  if (!estGestionnaire) redirect("/dashboard");

  const { data } = await supabase
    .from("clients")
    .select(
      `id, nom, prenom, telephone,
       vehicules ( marque, couleur, immatriculation ),
       reservations ( created_at, encaissements ( montant ) )`
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
      vehicules: c.vehicules
        .map((v) => [v.marque, v.couleur, v.immatriculation].filter(Boolean).join(" "))
        .filter(Boolean),
      passages: c.reservations.length,
      totalDepense: montants.reduce((s, e) => s + e.montant, 0),
      derniereVisite: dates.at(-1) ?? null,
    };
  });

  return <ListeClients clients={clients} />;
}
