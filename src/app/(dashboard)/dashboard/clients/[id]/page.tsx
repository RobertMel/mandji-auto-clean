// src/app/(dashboard)/dashboard/clients/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import { MODES_PAIEMENT, fcfa, formatNumeroRecu } from "@/lib/config";
import FicheClient from "./fiche-client";

type Encaissement = {
  id: string;
  numero_recu: number | null;
  montant: number;
  mode_paiement: string;
  paye_le: string;
};

type Passage = {
  id: string;
  created_at: string;
  statut: string;
  notes: string | null;
  reservation_prestations: { prestation: { nom: string } | null }[];
  encaissements: Encaissement[] | Encaissement | null;
};

type ClientDetaille = {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  vehicules: {
    id: string;
    marque: string | null;
    couleur: string | null;
    immatriculation: string | null;
  }[];
  reservations: Passage[];
};

const STATUTS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  terminee: "Terminé",
  annulee: "Annulé",
};

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await creerClientServeur();

  const { data: estGestionnaire } = await supabase.rpc("est_gestionnaire");
  if (!estGestionnaire) redirect("/dashboard");

  const { data } = await supabase
    .from("clients")
    .select(
      `id, nom, prenom, telephone, email, notes, created_at,
       vehicules ( id, marque, couleur, immatriculation ),
       reservations (
         id, created_at, statut, notes,
         reservation_prestations ( prestation:prestations ( nom ) ),
         encaissements ( id, numero_recu, montant, mode_paiement, paye_le )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const client = data as unknown as ClientDetaille;

  const passages = [...client.reservations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => {
      const enc = Array.isArray(r.encaissements)
        ? r.encaissements[0]
        : r.encaissements ?? undefined;
      return {
        ...r,
        encaissement: enc ?? null,
        prestations: r.reservation_prestations
          .map((l) => l.prestation?.nom)
          .filter(Boolean) as string[],
      };
    });

  const total = passages.reduce((s, p) => s + (p.encaissement?.montant ?? 0), 0);

  return (
    <main className="max-w-4xl px-6 py-10 mx-auto">
      <Link href="/dashboard/clients" className="text-sm text-gray-500 hover:text-[#1F8A3B]">
        ← Tous les clients
      </Link>

      <FicheClient
        client={{
          id: client.id,
          nom: client.nom,
          prenom: client.prenom ?? "",
          telephone: client.telephone,
          email: client.email ?? "",
          notes: client.notes ?? "",
        }}
      />

      {/* Chiffres clés */}
      <div className="grid gap-4 mb-10 sm:grid-cols-3">
        <div className="p-5 text-center border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-500">Passages</p>
          <p className="text-3xl font-bold text-[#1F8A3B]">{passages.length}</p>
        </div>
        <div className="p-5 text-center border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-500">Total dépensé</p>
          <p className="text-2xl font-bold text-[#1F8A3B]">{fcfa(total)}</p>
        </div>
        <div className="p-5 text-center border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-500">Client depuis</p>
          <p className="text-xl font-bold">
            {new Date(client.created_at).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Véhicules */}
      <h2 className="mb-3 text-lg font-bold">Véhicules</h2>
      {client.vehicules.length === 0 ? (
        <p className="mb-10 text-gray-500">Aucun véhicule enregistré.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-10">
          {client.vehicules.map((v) => (
            <span key={v.id} className="px-4 py-2 text-sm border border-gray-200 rounded-full">
              {[v.marque, v.couleur, v.immatriculation].filter(Boolean).join(" ")}
            </span>
          ))}
        </div>
      )}

      {/* Historique */}
      <h2 className="mb-3 text-lg font-bold">Historique</h2>
      {passages.length === 0 ? (
        <p className="text-gray-500">Aucun passage.</p>
      ) : (
        <div className="space-y-2">
          {passages.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4 border border-gray-200 rounded-xl"
            >
              <div>
                <p className="text-sm text-gray-500">
                  {new Date(p.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {p.statut !== "terminee" && (
                    <span className="ml-2 text-xs text-orange-600">
                      {STATUTS[p.statut] ?? p.statut}
                    </span>
                  )}
                </p>
                <p className="font-medium">
                  {p.prestations.length > 0 ? p.prestations.join(", ") : p.notes ?? "Lavage"}
                </p>
              </div>
              {p.encaissement ? (
                <Link
                  href={`/dashboard/recu/${p.encaissement.id}`}
                  className="text-sm text-right hover:text-[#1F8A3B]"
                >
                  <span className="font-bold">{fcfa(p.encaissement.montant)}</span>
                  <span className="block text-xs text-gray-400">
                    {MODES_PAIEMENT[p.encaissement.mode_paiement] ?? p.encaissement.mode_paiement}{" "}
                    · reçu n° {formatNumeroRecu(p.encaissement.numero_recu)} →
                  </span>
                </Link>
              ) : (
                <span className="text-xs text-gray-400">Non encaissé</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
