// src/app/(dashboard)/dashboard/compta/formulaire-depense.tsx
"use client";

import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { MODES_PAIEMENT } from "@/lib/config";
import { CATEGORIES_DEPENSES, versIso } from "@/lib/compta";

const champ =
  "w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]";

// « produits » est géré automatiquement via la page Stock
const CATEGORIES_SAISISSABLES = Object.entries(CATEGORIES_DEPENSES).filter(([k]) => k !== "produits");

export default function FormulaireDepense({
  onTermine,
  onAnnuler,
}: {
  onTermine: () => void;
  onAnnuler: () => void;
}) {
  const [date, setDate] = useState(versIso(new Date()));
  const [categorie, setCategorie] = useState("salaires");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("especes");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const enregistrer = async () => {
    const m = Number(montant);
    if (!libelle.trim()) return setErreur("Indiquez un libellé (ex : Salaire de Paul, facture SEEG...).");
    if (!Number.isInteger(m) || m <= 0) return setErreur("Le montant doit être un nombre entier positif (FCFA).");
    setChargement(true);
    setErreur("");
    const supabase = creerClientNavigateur();
    const { error } = await supabase.from("depenses").insert({
      depense_le: date,
      categorie,
      libelle: libelle.trim(),
      montant: m,
      mode_paiement: mode,
    });
    setChargement(false);
    if (error) return setErreur("Erreur : " + error.message);
    onTermine();
  };

  return (
    <div className="p-5 mb-8 border border-gray-200 rounded-xl bg-gray-50">
      <h2 className="mb-1 font-bold">Nouvelle dépense</h2>
      <p className="mb-4 text-xs text-gray-500">
        Les achats de produits d&apos;entretien se saisissent dans l&apos;onglet Stock : ils sont repris ici automatiquement.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
        </label>
        <label className="text-sm">
          Catégorie
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={champ}>
            {CATEGORIES_SAISISSABLES.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Libellé
          <input
            type="text"
            placeholder="Ex : Salaire octobre — Paul, facture d'eau..."
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            className={champ}
          />
        </label>
        <label className="text-sm">
          Montant (FCFA)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={500}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className={champ}
          />
        </label>
        <label className="text-sm">
          Payé par
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={champ}>
            {Object.entries(MODES_PAIEMENT).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-3 mt-4">
        <button
          onClick={enregistrer}
          disabled={chargement}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "..." : "Enregistrer la dépense"}
        </button>
        <button
          onClick={onAnnuler}
          className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
