// src/app/(dashboard)/dashboard/stats/stats-client.tsx
"use client";

import { useState } from "react";

type Laveur = { id: string; nom_complet: string };
type Lavage = { laveur_id: string | null; fin_lavage: string | null };
type Encaissement = { montant: number; mode_paiement: string; paye_le: string };
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
  const [periode, setPeriode] = useState<Periode>("jour");

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
    (e) => !debut || new Date(e.paye_le) >= debut
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
  const parLaveur = laveurs
    .map((laveur) => ({
      nom: laveur.nom_complet,
      nombre: lavagesPeriode.filter((l) => l.laveur_id === laveur.id).length,
    }))
    .sort((a, b) => b.nombre - a.nombre);

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
      <h2 className="mb-4 text-lg font-bold">Par laveur</h2>
      <div className="space-y-3">
        {parLaveur.map((l) => (
          <div
            key={l.nom}
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl"
          >
            <span className="w-28 font-medium truncate">{l.nom}</span>
            {/* Barre de progression visuelle */}
            <div className="flex-1 h-3 overflow-hidden bg-gray-100 rounded-full">
              <div
                className="h-full bg-[#23B5D3] rounded-full transition-all"
                style={{ width: `${(l.nombre / maxi) * 100}%` }}
              />
            </div>
            <span className="w-8 font-bold text-right">{l.nombre}</span>
          </div>
        ))}
      </div>
    </main>
  );
}