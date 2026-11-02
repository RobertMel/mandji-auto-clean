// src/app/(dashboard)/dashboard/compta/factures-a-regler.tsx
// Factures pas encore payées (entreprises qui règlent en fin de mois...),
// regroupées par client, avec confirmation du paiement en lot.
"use client";

import { useState } from "react";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { MODES_PAIEMENT, dateCourteFr, fcfa } from "@/lib/config";
import { versIso } from "@/lib/compta";

export type FactureARegler = {
  id: string;
  numero: string;
  montant: number;
  echeance: string | null;
  dateLavage: string | null;
  vehicule: string | null;
  client: { id: string; nom: string; prenom: string | null; entreprise: boolean } | null;
};

type Groupe = {
  cle: string;
  nom: string;
  entreprise: boolean;
  clientId: string | null;
  factures: FactureARegler[];
};

function regrouper(factures: FactureARegler[]): Groupe[] {
  const map = new Map<string, Groupe>();
  for (const f of factures) {
    const connu = f.client && f.client.nom !== "Sans nom";
    const cle = connu ? f.client!.id : "_";
    if (!map.has(cle)) {
      map.set(cle, {
        cle,
        nom: connu ? [f.client!.prenom, f.client!.nom].filter(Boolean).join(" ") : "Client non renseigné",
        entreprise: !!f.client?.entreprise,
        clientId: connu ? f.client!.id : null,
        factures: [],
      });
    }
    map.get(cle)!.factures.push(f);
  }
  return [...map.values()]
    .map((g) => ({ ...g, factures: g.factures.sort((a, b) => (a.dateLavage ?? "").localeCompare(b.dateLavage ?? "")) }))
    .sort((a, b) => Number(b.entreprise) - Number(a.entreprise) || a.nom.localeCompare(b.nom, "fr"));
}

export default function FacturesARegler({
  factures,
  onConfirme,
}: {
  factures: FactureARegler[];
  onConfirme: () => void;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null); // groupe en cours de confirmation
  const [selection, setSelection] = useState<string[]>([]);
  const [mode, setMode] = useState("virement");
  const [date, setDate] = useState(() => versIso(new Date()));
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  if (factures.length === 0) return null;
  const groupes = regrouper(factures);
  const aujourdhui = versIso(new Date());

  const ouvrir = (g: Groupe) => {
    setOuvert(g.cle);
    setSelection(g.factures.map((f) => f.id));
    setErreur("");
  };

  const confirmer = async () => {
    if (selection.length === 0) return setErreur("Cochez au moins une facture.");
    const payeLe = date === aujourdhui ? new Date() : new Date(`${date}T12:00:00`);
    if (Number.isNaN(payeLe.getTime()) || date > aujourdhui) return setErreur("Date de paiement invalide.");
    setChargement(true);
    setErreur("");
    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("confirmer_paiements", {
      p_encaissement_ids: selection,
      p_mode: mode,
      p_paye_le: payeLe.toISOString(),
    });
    setChargement(false);
    if (error) return setErreur("Erreur : " + error.message);
    setOuvert(null);
    onConfirme();
  };

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-bold">Factures à régler</h2>
      <p className="mb-4 text-sm text-gray-500">
        Lavages déjà faits, pas encore payés (entreprises en fin de mois…). Ils entrent dans la compta à la
        confirmation du paiement.
      </p>

      <div className="space-y-3">
        {groupes.map((g) => {
          const total = g.factures.reduce((s, f) => s + f.montant, 0);
          const enRetard = g.factures.some((f) => f.echeance && f.echeance < aujourdhui);
          const totalSelection = g.factures.filter((f) => selection.includes(f.id)).reduce((s, f) => s + f.montant, 0);
          return (
            <div key={g.cle} className="p-4 border border-orange-200 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {g.clientId ? (
                      <Link href={`/dashboard/clients/${g.clientId}`} className="hover:text-[#1F8A3B]">
                        {g.nom}
                      </Link>
                    ) : (
                      g.nom
                    )}
                    {g.entreprise && (
                      <span className="ml-2 px-2 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-100 rounded-full align-middle">
                        Entreprise
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {g.factures.length} lavage{g.factures.length > 1 ? "s" : ""}
                    {enRetard && <span className="text-red-600"> · échéance dépassée</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-orange-700">{fcfa(total)}</span>
                  {ouvert !== g.cle && (
                    <button
                      onClick={() => ouvrir(g)}
                      className="px-4 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
                    >
                      Confirmer le paiement
                    </button>
                  )}
                </div>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {g.factures.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    {ouvert === g.cle && (
                      <input
                        type="checkbox"
                        checked={selection.includes(f.id)}
                        onChange={() =>
                          setSelection((s) => (s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id]))
                        }
                        className="w-4 h-4 accent-[#1F8A3B]"
                        aria-label={`Facture n° ${f.numero}`}
                      />
                    )}
                    <Link href={`/dashboard/recu/${f.id}`} className="flex justify-between flex-1 min-w-0 gap-2 hover:text-[#1F8A3B]">
                      <span className="truncate">
                        <span className="text-gray-400">n° {f.numero}</span>
                        {f.dateLavage && ` · ${dateCourteFr(f.dateLavage)}`}
                        {f.vehicule && ` · ${f.vehicule}`}
                      </span>
                      <span className="shrink-0">{fcfa(f.montant)}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {ouvert === g.cle && (
                <div className="p-3 mt-3 rounded-lg bg-orange-50">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(MODES_PAIEMENT).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMode(v)}
                        aria-pressed={mode === v}
                        className={`px-3 py-1.5 text-sm rounded-full transition ${
                          mode === v
                            ? "bg-[#23B5D3] text-white"
                            : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <label className="flex flex-wrap items-center gap-2 mb-3 text-sm">
                    Payé le
                    <input
                      type="date"
                      value={date}
                      max={aujourdhui}
                      onChange={(e) => setDate(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg"
                    />
                  </label>
                  {erreur && <p className="mb-2 text-sm text-red-600">{erreur}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={confirmer}
                      disabled={chargement || selection.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
                    >
                      {chargement ? "..." : `Confirmer ${fcfa(totalSelection)}`}
                    </button>
                    <button
                      onClick={() => setOuvert(null)}
                      className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
