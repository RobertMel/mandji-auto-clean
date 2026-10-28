// src/app/(dashboard)/dashboard/stock/formulaire-achat.tsx
"use client";

import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { fcfa } from "@/lib/config";
import type { Produit } from "@/lib/stock";

const champ =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]";

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function FormulaireAchat({
  produits,
  produitInitial,
  lieuxConnus,
  onTermine,
  onAnnuler,
}: {
  produits: Produit[];
  produitInitial: string | null;
  lieuxConnus: string[];
  onTermine: () => void;
  onAnnuler: () => void;
}) {
  const [produitId, setProduitId] = useState(produitInitial ?? produits[0]?.id ?? "");
  const [date, setDate] = useState(aujourdhui());
  const [quantite, setQuantite] = useState("1");
  const [contenance, setContenance] = useState("");
  const [unite, setUnite] = useState<"L" | "cl">("L");
  const [prix, setPrix] = useState("");
  const [lieu, setLieu] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const q = Number(quantite);
  const c = Number(contenance.replace(",", "."));
  const p = Number(prix);
  const valide =
    !!produitId &&
    Number.isInteger(q) && q > 0 &&
    c > 0 &&
    prix.trim() !== "" && Number.isInteger(p) && p >= 0;

  const enregistrer = async () => {
    if (!valide) {
      setErreur("Vérifiez la quantité, la contenance et le prix (nombres entiers en FCFA).");
      return;
    }
    setChargement(true);
    setErreur("");
    const supabase = creerClientNavigateur();
    const { error } = await supabase.from("achats_stock").insert({
      produit_id: produitId,
      achete_le: date,
      quantite: q,
      contenance: c,
      unite,
      prix_unitaire: p,
      lieu: lieu.trim() || null,
    });
    setChargement(false);
    if (error) return setErreur("Erreur : " + error.message);
    onTermine();
  };

  return (
    <div className="p-5 mb-8 border border-gray-200 rounded-xl bg-gray-50">
      <h2 className="mb-4 font-bold">Enregistrer un achat</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Produit
          <select
            value={produitId}
            onChange={(e) => setProduitId(e.target.value)}
            className={`${champ} mt-1`}
          >
            {produits.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Date d&apos;achat
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${champ} mt-1`}
          />
        </label>

        <label className="text-sm">
          Nombre de flacons achetés
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className={`${champ} mt-1`}
          />
        </label>
        <label className="text-sm">
          Contenance d&apos;un flacon
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder={unite === "L" ? "Ex : 1 ou 1,5" : "Ex : 50"}
              value={contenance}
              onChange={(e) => setContenance(e.target.value)}
              className={champ}
            />
            <select
              value={unite}
              onChange={(e) => setUnite(e.target.value as "L" | "cl")}
              className="px-2 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
            >
              <option value="L">L</option>
              <option value="cl">cl</option>
            </select>
          </div>
        </label>

        <label className="text-sm">
          Prix d&apos;un flacon (FCFA)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className={`${champ} mt-1`}
          />
        </label>
        <label className="text-sm">
          Lieu d&apos;achat <span className="text-gray-400">(facultatif)</span>
          <input
            type="text"
            list="lieux-connus"
            placeholder="Ex : Marché du Grand Village"
            value={lieu}
            onChange={(e) => setLieu(e.target.value)}
            className={`${champ} mt-1`}
          />
          <datalist id="lieux-connus">
            {lieuxConnus.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
      </div>

      {valide && (
        <p className="mt-4 text-sm">
          Total de l&apos;achat :{" "}
          <span className="font-bold text-[#1F8A3B]">{fcfa(q * p)}</span>
          <span className="text-gray-500">
            {" "}· {q} × {contenance} {unite} · soit {fcfa(Math.round(p / (unite === "L" ? c : c / 100)))} le litre
          </span>
        </p>
      )}

      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-3 mt-4">
        <button
          onClick={enregistrer}
          disabled={chargement}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "..." : "Enregistrer l'achat"}
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
