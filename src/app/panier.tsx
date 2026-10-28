// src/app/panier.tsx
"use client";

import { useState } from "react";

export type Prestation = {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  duree_minutes: number | null;
};

import { WHATSAPP_NUMBER } from "@/lib/config";

export default function Panier({ prestations }: { prestations: Prestation[] }) {
  const [selection, setSelection] = useState<string[]>([]);
  const [nom, setNom] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [creneau, setCreneau] = useState("");

  // Ajoute ou retire une prestation du panier
  const basculer = (id: string) => {
    setSelection((actuel) =>
      actuel.includes(id)
        ? actuel.filter((x) => x !== id)
        : [...actuel, id]
    );
  };

  const choisies = prestations.filter((p) => selection.includes(p.id));
  const total = choisies.reduce((somme, p) => somme + p.prix, 0);
  const dureeTotale = choisies.reduce(
    (somme, p) => somme + (p.duree_minutes ?? 0),
    0
  );

  // Construit le message WhatsApp pré-rempli
  const construireLien = () => {
    const lignes = [
      "Bonjour Mandji Auto Clean, je souhaite réserver.",
      "",
      `Nom : ${nom || "(non renseigné)"}`,
      `Véhicule : ${vehicule || "(non renseigné)"}`,
      `Créneau souhaité : ${creneau || "(à convenir)"}`,
      "",
      "Prestations :",
      ...choisies.map(
        (p) => `- ${p.nom} (${p.prix.toLocaleString("fr-FR")} FCFA)`
      ),
      "",
      `Total : ${total.toLocaleString("fr-FR")} FCFA`,
      "",
      "Je joins une photo de mon véhicule ci-dessous.",
    ];
    const texte = encodeURIComponent(lignes.join("\n"));
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${texte}`;
  };

  return (
    <section id="prestations" className="px-6 py-20 bg-white">
      <h2 className="mb-3 text-3xl font-bold text-center">Nos prestations</h2>
      <p className="mb-12 text-center text-gray-600">
        Sélectionnez vos prestations, puis envoyez votre demande sur WhatsApp.
      </p>

      {/* Cartes sélectionnables */}
      <div className="grid max-w-5xl gap-6 mx-auto sm:grid-cols-2 lg:grid-cols-3">
        {prestations.map((p) => {
          const active = selection.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => basculer(p.id)}
              className={`p-6 text-left border rounded-2xl transition ${
                active
                  ? "border-[#1F8A3B] bg-green-50 ring-2 ring-[#1F8A3B]"
                  : "border-gray-200 hover:border-[#23B5D3] hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{p.nom}</h3>
                {active && <span className="text-[#1F8A3B] font-bold">✓</span>}
              </div>
              {p.description && (
                <p className="mt-2 text-sm text-gray-600">{p.description}</p>
              )}
              <div className="flex items-baseline justify-between mt-6">
                <span className="text-2xl font-bold text-[#1F8A3B]">
                  {p.prix.toLocaleString("fr-FR")} FCFA
                </span>
                {p.duree_minutes && (
                  <span className="text-sm text-gray-500">
                    ~{p.duree_minutes} min
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Récapitulatif du panier — n'apparaît qu'après une sélection */}
      {choisies.length > 0 && (
        <div className="max-w-xl p-8 mx-auto mt-12 border border-gray-200 rounded-2xl">
          <h3 className="mb-6 text-xl font-bold">Votre demande</h3>

          <ul className="pb-4 mb-4 space-y-2 border-b border-gray-100">
            {choisies.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>{p.nom}</span>
                <span className="font-medium">
                  {p.prix.toLocaleString("fr-FR")} FCFA
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between mb-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-[#1F8A3B]">
              {total.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          {dureeTotale > 0 && (
            <p className="mb-6 text-sm text-gray-500">
              Durée estimée : environ {dureeTotale} minutes
            </p>
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Votre nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
            />
            <input
              type="text"
              placeholder="Votre véhicule (ex : Toyota RAV4 blanc)"
              value={vehicule}
              onChange={(e) => setVehicule(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
            />
            <input
              type="text"
              placeholder="Créneau souhaité (ex : samedi matin)"
              value={creneau}
              onChange={(e) => setCreneau(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
            />
          </div>

         
          <a

            href={construireLien()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 mt-6 font-medium text-center text-white transition rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
          >
            Envoyer ma demande sur WhatsApp
          </a>

          <p className="mt-4 text-xs text-center text-gray-500">
            Pensez à joindre une photo de votre véhicule dans la conversation.
          </p>
        </div>
      )}
    </section>
  );
}