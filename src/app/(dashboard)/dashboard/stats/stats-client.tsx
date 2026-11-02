// src/app/(dashboard)/dashboard/stats/stats-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Laveur = { id: string; nom_complet: string; surnom: string | null };
type Lavage = { laveur_id: string | null; fin_lavage: string | null };
type Encaissement = { montant: number; mode_paiement: string | null; paye_le: string | null };
type Periode = "jour" | "semaine" | "mois" | "tout";

const MODES: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  carte: "Carte",
  virement: "Virement",
};

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

// Renvoie la date de début de la période (ou null pour "tout").
function debutPeriode(p: Periode): Date | null {
  const now = new Date();
  const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (p === "jour") return aujourdhui;
  if (p === "semaine") {
    const jour = now.getDay(); // 0 = dimanche, 1 = lundi...
    const decalage = jour === 0 ? 6 : jour - 1; // recule jusqu'au lundi
    const lundi = new Date(aujourdhui);
    lundi.setDate(aujourdhui.getDate() - decalage);
    return lundi;
  }
  if (p === "mois") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null; // "tout"
}

const LIBELLES: Record<Periode, string> = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois",
  tout: "Depuis le début",
};

export default function StatsClient({
  laveurs,
  lavages,
  encaissements,
}: {
  laveurs: Laveur[];
  lavages: Lavage[];
  encaissements: Encaissement[];
}) {
  const router = useRouter();
  const [periode, setPeriode] = useState<Periode>("jour");
  // Nom affiché d'une case laveur (ex. « Laveur 1 » → Karin)
  const [edition, setEdition] = useState<string | null>(null);
  const [saisie, setSaisie] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const enregistrerNom = async (id: string) => {
    setEnregistrement(true);
    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("definir_surnom_laveur", { p_laveur_id: id, p_surnom: saisie });
    setEnregistrement(false);
    if (error) return alert("Impossible d'enregistrer le nom : " + error.message);
    setEdition(null);
    router.refresh();
  };

  const debut = debutPeriode(periode);

  // Lavages dans la période choisie
  const lavagesPeriode = lavages.filter((l) => {
    if (!l.fin_lavage) return false;
    if (!debut) return true; // "tout"
    return new Date(l.fin_lavage) >= debut;
  });

  const total = lavagesPeriode.length;

  // Chiffre d'affaires de la période, total et par mode de paiement
  const encaissementsPeriode = encaissements.filter(
    (e) => !!e.paye_le && (!debut || new Date(e.paye_le) >= debut)
  );
  const chiffreAffaires = encaissementsPeriode.reduce((s, e) => s + e.montant, 0);
  const parMode = Object.keys(MODES)
    .map((mode) => ({
      mode,
      montant: encaissementsPeriode
        .filter((e) => e.mode_paiement === mode)
        .reduce((s, e) => s + e.montant, 0),
    }))
    .filter((m) => m.montant > 0);

  // Décompte par laveur, chacun affiché même à 0
  // (ordre fixe des cases : Laveur 1, 2, 3…)
  const parLaveur = laveurs.map((laveur) => ({
    id: laveur.id,
    case_: laveur.nom_complet,
    surnom: laveur.surnom,
    nombre: lavagesPeriode.filter((l) => l.laveur_id === laveur.id).length,
  }));

  const maxi = Math.max(1, ...parLaveur.map((l) => l.nombre)); // pour les barres

  return (
    <main className="max-w-3xl px-6 py-10 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Statistiques</h1>

      {/* Filtre de période */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(["jour", "semaine", "mois", "tout"] as Periode[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`px-4 py-2 text-sm rounded-full transition ${
              periode === p
                ? "bg-[#1F8A3B] text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {LIBELLES[p]}
          </button>
        ))}
      </div>

      {/* Totaux */}
      <div className="grid gap-4 mb-4 sm:grid-cols-2">
        <div className="p-6 text-center border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-500">
            Voitures lavées — {LIBELLES[periode].toLowerCase()}
          </p>
          <p className="text-4xl font-bold text-[#1F8A3B]">{total}</p>
        </div>
        <div className="p-6 text-center border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-500">
            Chiffre d&apos;affaires — {LIBELLES[periode].toLowerCase()}
          </p>
          <p className="text-3xl font-bold text-[#1F8A3B]">{fcfa(chiffreAffaires)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {encaissementsPeriode.length} encaissement
            {encaissementsPeriode.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Répartition par mode de paiement */}
      {parMode.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {parMode.map((m) => (
            <span
              key={m.mode}
              className="px-3 py-1 text-sm border border-gray-200 rounded-full"
            >
              {MODES[m.mode]} : <strong>{fcfa(m.montant)}</strong>
            </span>
          ))}
        </div>
      )}
      {parMode.length === 0 && <div className="mb-8" />}

      {/* Par laveur */}
      <h2 className="mb-1 text-lg font-bold">Par laveur</h2>
      <p className="mb-4 text-sm text-gray-500">
        Touchez ✎ pour noter qui occupe chaque case (le nom apparaît partout : file, compta, factures).
      </p>
      <div className="space-y-3">
        {parLaveur.map((l) => (
          <div
            key={l.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 border border-gray-200 rounded-xl"
          >
            {edition === l.id ? (
              <div className="flex flex-wrap items-center w-full gap-2">
                <span className="text-sm text-gray-500 shrink-0">{l.case_} ·</span>
                <input
                  autoFocus
                  type="text"
                  maxLength={40}
                  value={saisie}
                  placeholder="Nom (ex : Karin)"
                  onChange={(e) => setSaisie(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") enregistrerNom(l.id);
                    if (e.key === "Escape") setEdition(null);
                  }}
                  className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
                />
                <button
                  onClick={() => enregistrerNom(l.id)}
                  disabled={enregistrement}
                  className="px-4 py-1.5 text-sm font-medium text-white rounded-full bg-[#1F8A3B] disabled:opacity-50"
                >
                  {enregistrement ? "..." : "OK"}
                </button>
                <button onClick={() => setEdition(null)} className="px-2 py-1.5 text-sm text-gray-500">
                  Annuler
                </button>
              </div>
            ) : (
            <>
            <button
              onClick={() => {
                setEdition(l.id);
                setSaisie(l.surnom ?? "");
              }}
              title="Modifier le nom affiché"
              className="w-36 text-left group shrink-0"
            >
              <span className="block text-xs text-gray-400">{l.case_}</span>
              <span className="block font-medium truncate">
                {l.surnom ?? <span className="text-gray-400">Sans nom</span>}{" "}
                <span className="text-gray-400 group-hover:text-[#1F8A3B]">✎</span>
              </span>
            </button>
            {/* Barre de progression visuelle */}
            <div className="flex-1 h-3 overflow-hidden bg-gray-100 rounded-full">
              <div
                className="h-full bg-[#23B5D3] rounded-full transition-all"
                style={{ width: `${(l.nombre / maxi) * 100}%` }}
              />
            </div>
            <span className="w-8 font-bold text-right">{l.nombre}</span>
            </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}