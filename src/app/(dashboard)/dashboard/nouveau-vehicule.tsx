// src/app/(dashboard)/dashboard/nouveau-vehicule.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

export default function NouveauVehicule() {
  const [ouvert, setOuvert] = useState(false);
  const [marque, setMarque] = useState("");
  const [couleur, setCouleur] = useState("");
  const [immat, setImmat] = useState("");
  const [note, setNote] = useState("");
  const [chargement, setChargement] = useState(false);
  const router = useRouter();
  const supabase = creerClientNavigateur();

  const enregistrer = async () => {
    setChargement(true);

    // Construit une note lisible à partir des champs remplis
    const descriptif = [marque, couleur, immat].filter(Boolean).join(" ");
    const notesFinales = [descriptif, note].filter(Boolean).join(" — ") || "Véhicule";

    const { error } = await supabase.from("reservations").insert({
      statut: "en_attente",
      canal: "sur_place",
      notes: notesFinales,
      vehicule_marque: marque || null,
      vehicule_couleur: couleur || null,
      vehicule_immatriculation: immat || null,
    });

    setChargement(false);

    if (error) {
      alert("Erreur : " + error.message);
      return;
    }

    // Réinitialise et referme
    setMarque("");
    setCouleur("");
    setImmat("");
    setNote("");
    setOuvert(false);
    router.refresh();
  };

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
      >
        + Nouveau véhicule
      </button>
    );
  }

  return (
    <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
      <h3 className="mb-4 font-bold">Enregistrer un véhicule</h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Marque (ex : Toyota)"
          value={marque}
          onChange={(e) => setMarque(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
        />
        <input
          type="text"
          placeholder="Couleur"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
        />
        <input
          type="text"
          placeholder="Plaque"
          value={immat}
          onChange={(e) => setImmat(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
        />
      </div>

      <input
        type="text"
        placeholder="Note (ex : nom du client, prestation souhaitée)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-4 py-2 mt-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={enregistrer}
          disabled={chargement}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "..." : "Enregistrer"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}