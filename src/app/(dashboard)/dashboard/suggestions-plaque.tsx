// src/app/(dashboard)/dashboard/suggestions-plaque.tsx
// Tapez une plaque (3 caractères suffisent, espaces et tirets ignorés) :
// les véhicules déjà venus s'affichent avec leur client, un clic remplit le
// formulaire.
"use client";

import { useEffect, useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { formaterInternational } from "@/lib/config";

export type VehiculeConnu = {
  vehicule_id: string;
  immatriculation: string | null;
  marque: string | null;
  couleur: string | null;
  client_id: string | null;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  entreprise: boolean;
  passages: number;
  dernier_passage: string | null;
};

const normaliser = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const nomClientConnu = (v: VehiculeConnu) =>
  v.nom && v.nom !== "Sans nom" ? [v.prenom, v.nom].filter(Boolean).join(" ") : "";

export default function SuggestionsPlaque({
  plaque,
  onChoisir,
}: {
  plaque: string;
  onChoisir: (v: VehiculeConnu) => void;
}) {
  const q = normaliser(plaque);
  // Résultats mémorisés avec la recherche qui les a produits
  const [resultat, setResultat] = useState<{ q: string; liste: VehiculeConnu[] } | null>(null);
  // Plaque choisie : on masque la liste tant qu'elle n'est pas modifiée
  const [choisie, setChoisie] = useState<string | null>(null);

  useEffect(() => {
    if (q.length < 3) return;
    let annule = false;
    const minuterie = setTimeout(async () => {
      const supabase = creerClientNavigateur();
      const { data } = await supabase.rpc("chercher_par_plaque", { p_plaque: q });
      if (!annule) setResultat({ q, liste: (data as VehiculeConnu[] | null) ?? [] });
    }, 250);
    return () => {
      annule = true;
      clearTimeout(minuterie);
    };
  }, [q]);

  if (q.length < 3 || choisie === q) return null;
  const liste = resultat?.q === q ? resultat.liste : null;
  if (!liste) return <p className="mt-1 text-xs text-gray-400">Recherche…</p>;
  if (liste.length === 0)
    return <p className="mt-1 text-xs text-gray-500">Nouveau véhicule : aucune visite avec cette plaque.</p>;

  return (
    <ul className="mt-2 overflow-hidden bg-white border rounded-lg divide-y border-[#23B5D3] divide-gray-100">
      {liste.map((v) => {
        const nom = nomClientConnu(v);
        return (
          <li key={v.vehicule_id}>
            <button
              type="button"
              onClick={() => {
                setChoisie(normaliser(v.immatriculation ?? ""));
                onChoisir(v);
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-cyan-50"
            >
              <span className="font-semibold tracking-wide">{v.immatriculation}</span>
              {(v.marque || v.couleur) && (
                <span className="text-gray-500"> · {[v.marque, v.couleur].filter(Boolean).join(" ")}</span>
              )}
              <span className="block text-xs text-gray-600">
                {nom || "Client sans nom"}
                {v.entreprise && " (entreprise)"}
                {v.telephone && ` · ${formaterInternational(v.telephone)}`}
                {" · "}
                {v.passages} passage{v.passages > 1 ? "s" : ""}
                {v.dernier_passage && `, dernier le ${new Date(v.dernier_passage).toLocaleDateString("fr-FR")}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
