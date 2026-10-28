// src/app/(dashboard)/dashboard/encaisser.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

export type PrestationCatalogue = {
  id: string;
  nom: string;
  prix: number;
};

const MODES = [
  { valeur: "especes", libelle: "Espèces" },
  { valeur: "mobile_money", libelle: "Mobile Money" },
  { valeur: "carte", libelle: "Carte" },
  { valeur: "virement", libelle: "Virement" },
] as const;

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export default function Encaisser({
  reservationId,
  vehicule,
  prestations,
  onFermer,
}: {
  reservationId: string;
  vehicule: string;
  prestations: PrestationCatalogue[];
  onFermer: () => void;
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const [montantSaisi, setMontantSaisi] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("especes");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const router = useRouter();

  const basculer = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const total = prestations
    .filter((p) => selection.includes(p.id))
    .reduce((somme, p) => somme + p.prix, 0);

  // Tant que la gérante n'a pas modifié le montant, il suit le total.
  const montant = montantSaisi === null ? total : Number(montantSaisi) || 0;
  const remise = total - montant;

  const valider = async () => {
    setChargement(true);
    setErreur("");

    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("encaisser_reservation", {
      p_reservation_id: reservationId,
      p_prestation_ids: selection,
      p_montant: montant,
      p_mode: mode,
    });

    setChargement(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    onFermer();
    router.refresh();
  };

  const invalide = selection.length === 0 || montant < 0 || montant > total;

  return (
    <div className="p-5 mt-3 border border-gray-200 rounded-xl bg-gray-50">
      <h3 className="mb-1 font-bold">Encaisser</h3>
      <p className="mb-4 text-sm text-gray-500">{vehicule}</p>

      {/* Prestations réalisées */}
      <p className="mb-2 text-sm font-medium">Prestations réalisées</p>
      <div className="grid gap-2 mb-5 sm:grid-cols-2">
        {prestations.map((p) => {
          const active = selection.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => basculer(p.id)}
              className={`flex justify-between px-4 py-3 text-sm text-left border rounded-lg transition ${
                active
                  ? "border-[#1F8A3B] bg-green-50 ring-1 ring-[#1F8A3B]"
                  : "border-gray-200 bg-white hover:border-[#23B5D3]"
              }`}
            >
              <span>
                {active && <span className="mr-1 font-bold text-[#1F8A3B]">✓</span>}
                {p.nom}
              </span>
              <span className="font-medium">{fcfa(p.prix)}</span>
            </button>
          );
        })}
      </div>

      {/* Montant */}
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="text-gray-500">Total catalogue</span>
        <span className="font-medium">{fcfa(total)}</span>
      </div>
      <label className="flex items-center justify-between gap-4 mb-1">
        <span className="text-sm font-medium">Montant encaissé</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={total}
            step={500}
            value={montantSaisi ?? String(total)}
            onChange={(e) => setMontantSaisi(e.target.value)}
            className="w-32 px-3 py-2 text-right bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
          />
          <span className="text-sm text-gray-500">FCFA</span>
        </div>
      </label>
      {remise > 0 && (
        <p className="mb-1 text-xs text-right text-orange-600">Remise : {fcfa(remise)}</p>
      )}
      {montant > total && (
        <p className="mb-1 text-xs text-right text-red-600">
          Le montant dépasse le total des prestations.
        </p>
      )}

      {/* Mode de paiement */}
      <p className="mt-4 mb-2 text-sm font-medium">Mode de paiement</p>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.valeur}
            onClick={() => setMode(m.valeur)}
            className={`px-4 py-2 text-sm rounded-full transition ${
              mode === m.valeur
                ? "bg-[#23B5D3] text-white"
                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {m.libelle}
          </button>
        ))}
      </div>

      {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-3 mt-6">
        <button
          onClick={valider}
          disabled={chargement || invalide}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "..." : `Valider ${fcfa(montant)}`}
        </button>
        <button
          onClick={onFermer}
          className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
