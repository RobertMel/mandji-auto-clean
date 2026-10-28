// src/app/(dashboard)/dashboard/clients/liste-clients.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { fcfa, formaterInternational } from "@/lib/config";

export type ClientResume = {
  id: string;
  nom: string;
  telephone: string;
  vehicules: string[];
  passages: number;
  totalDepense: number;
  derniereVisite: string | null;
};

type Tri = "recent" | "fideles" | "depense";

// Minuscules, sans accents ni espaces : "Émma  C" -> "emmac"
const simplifier = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s/g, "");

export default function ListeClients({ clients }: { clients: ClientResume[] }) {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("recent");

  const q = simplifier(recherche);
  const chiffres = recherche.replace(/\D/g, "").replace(/^0+/, "");

  const filtres = clients
    .filter((c) => {
      if (!q) return true;
      return (
        simplifier(c.nom).includes(q) ||
        c.vehicules.some((v) => simplifier(v).includes(q)) ||
        (chiffres.length >= 3 && c.telephone.includes(chiffres))
      );
    })
    .sort((a, b) => {
      if (tri === "fideles") return b.passages - a.passages;
      if (tri === "depense") return b.totalDepense - a.totalDepense;
      return (b.derniereVisite ?? "").localeCompare(a.derniereVisite ?? "");
    });

  return (
    <main className="max-w-4xl px-6 py-10 mx-auto">
      <h1 className="mb-2 text-2xl font-bold">Clients</h1>
      <p className="mb-6 text-sm text-gray-500">
        {clients.length} client{clients.length > 1 ? "s" : ""} enregistré
        {clients.length > 1 ? "s" : ""}. Un client est créé dès qu&apos;on saisit son
        téléphone (nouveau véhicule ou reçu).
      </p>

      <input
        type="search"
        placeholder="Rechercher : nom, téléphone ou plaque"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ["recent", "Visite récente"],
            ["fideles", "Plus fidèles"],
            ["depense", "Plus gros montants"],
          ] as [Tri, string][]
        ).map(([valeur, libelle]) => (
          <button
            key={valeur}
            onClick={() => setTri(valeur)}
            className={`px-4 py-2 text-sm rounded-full transition ${
              tri === valeur
                ? "bg-[#1F8A3B] text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {filtres.length === 0 ? (
        <p className="text-gray-500">
          {clients.length === 0 ? "Aucun client pour l'instant." : "Aucun résultat."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtres.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/clients/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 border border-gray-200 rounded-xl hover:border-[#23B5D3]"
            >
              <div className="min-w-0">
                <p className="font-medium">{c.nom}</p>
                <p className="text-sm text-gray-500">{formaterInternational(c.telephone)}</p>
                {c.vehicules.length > 0 && (
                  <p className="text-xs text-gray-400 truncate">{c.vehicules.join(" · ")}</p>
                )}
              </div>
              <div className="text-sm text-right">
                <p>
                  <span className="font-bold">{c.passages}</span> passage
                  {c.passages > 1 ? "s" : ""}
                </p>
                <p className="text-[#1F8A3B] font-medium">{fcfa(c.totalDepense)}</p>
                {c.derniereVisite && (
                  <p className="text-xs text-gray-400">
                    {new Date(c.derniereVisite).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
