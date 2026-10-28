// src/app/(dashboard)/dashboard/prestations/catalogue.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { rafraichirAccueil } from "./actions";

export type PrestationComplete = {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  duree_minutes: number | null;
  active: boolean;
};

type Brouillon = {
  nom: string;
  description: string;
  prix: string;
  duree: string;
};

const VIDE: Brouillon = { nom: "", description: "", prix: "", duree: "" };

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

const champ =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]";

// Contrôle les valeurs saisies et les convertit pour la base.
function valider(b: Brouillon) {
  const nom = b.nom.trim();
  const prix = Number(b.prix);
  const duree = b.duree.trim() === "" ? null : Number(b.duree);

  if (!nom) return { erreur: "Le nom est obligatoire." };
  if (b.prix.trim() === "" || !Number.isInteger(prix) || prix < 0)
    return { erreur: "Le prix doit être un nombre entier (FCFA)." };
  if (duree !== null && (!Number.isInteger(duree) || duree <= 0))
    return { erreur: "La durée doit être un nombre de minutes." };

  return {
    valeurs: {
      nom,
      description: b.description.trim() || null,
      prix,
      duree_minutes: duree,
    },
  };
}

function Formulaire({
  brouillon,
  setBrouillon,
}: {
  brouillon: Brouillon;
  setBrouillon: (b: Brouillon) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <input
        type="text"
        placeholder="Nom (ex : Lavage complet)"
        value={brouillon.nom}
        onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })}
        className={`${champ} sm:col-span-2`}
      />
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={500}
        placeholder="Prix (FCFA)"
        value={brouillon.prix}
        onChange={(e) => setBrouillon({ ...brouillon, prix: e.target.value })}
        className={champ}
      />
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={5}
        placeholder="Durée (min)"
        value={brouillon.duree}
        onChange={(e) => setBrouillon({ ...brouillon, duree: e.target.value })}
        className={champ}
      />
      <input
        type="text"
        placeholder="Description (facultatif)"
        value={brouillon.description}
        onChange={(e) =>
          setBrouillon({ ...brouillon, description: e.target.value })
        }
        className={`${champ} sm:col-span-4`}
      />
    </div>
  );
}

export default function Catalogue({
  prestations,
}: {
  prestations: PrestationComplete[];
}) {
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nouveau, setNouveau] = useState<Brouillon>(VIDE);
  const [edition, setEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>(VIDE);
  const [chargement, setChargement] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const router = useRouter();
  const supabase = creerClientNavigateur();

  // Après chaque modification : rafraîchit cette page et le site public.
  const apres = async () => {
    await rafraichirAccueil();
    router.refresh();
  };

  const ajouter = async () => {
    const { erreur: e, valeurs } = valider(nouveau);
    if (e || !valeurs) return setErreur(e ?? "");
    setErreur("");
    setChargement("nouveau");

    const { error } = await supabase.from("prestations").insert(valeurs);
    setChargement(null);
    if (error) return setErreur("Erreur : " + error.message);

    setNouveau(VIDE);
    setAjoutOuvert(false);
    await apres();
  };

  const ouvrirEdition = (p: PrestationComplete) => {
    setErreur("");
    setEdition(p.id);
    setBrouillon({
      nom: p.nom,
      description: p.description ?? "",
      prix: String(p.prix),
      duree: p.duree_minutes ? String(p.duree_minutes) : "",
    });
  };

  const enregistrer = async (id: string) => {
    const { erreur: e, valeurs } = valider(brouillon);
    if (e || !valeurs) return setErreur(e ?? "");
    setErreur("");
    setChargement(id);

    const { error } = await supabase
      .from("prestations")
      .update(valeurs)
      .eq("id", id);
    setChargement(null);
    if (error) return setErreur("Erreur : " + error.message);

    setEdition(null);
    await apres();
  };

  // Masquer plutôt que supprimer : l'historique des encaissements
  // continue de pointer vers la prestation.
  const basculerActive = async (p: PrestationComplete) => {
    setChargement(p.id);
    const { error } = await supabase
      .from("prestations")
      .update({ active: !p.active })
      .eq("id", p.id);
    setChargement(null);
    if (error) return setErreur("Erreur : " + error.message);
    await apres();
  };

  const actives = prestations.filter((p) => p.active).length;

  return (
    <main className="max-w-4xl px-6 py-10 mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold">Prestations</h1>
        {!ajoutOuvert && (
          <button
            onClick={() => {
              setErreur("");
              setAjoutOuvert(true);
            }}
            className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
          >
            + Nouvelle prestation
          </button>
        )}
      </div>
      <p className="mb-8 text-sm text-gray-500">
        {actives} visible{actives > 1 ? "s" : ""} sur le site ·{" "}
        {prestations.length - actives} masquée
        {prestations.length - actives > 1 ? "s" : ""}
      </p>

      {erreur && (
        <p className="p-3 mb-6 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
          {erreur}
        </p>
      )}

      {/* Ajout */}
      {ajoutOuvert && (
        <div className="p-5 mb-8 border border-gray-200 rounded-xl bg-gray-50">
          <h2 className="mb-4 font-bold">Nouvelle prestation</h2>
          <Formulaire brouillon={nouveau} setBrouillon={setNouveau} />
          <div className="flex gap-3 mt-4">
            <button
              onClick={ajouter}
              disabled={chargement === "nouveau"}
              className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
            >
              {chargement === "nouveau" ? "..." : "Ajouter"}
            </button>
            <button
              onClick={() => {
                setAjoutOuvert(false);
                setNouveau(VIDE);
                setErreur("");
              }}
              className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {prestations.map((p) =>
          edition === p.id ? (
            <div
              key={p.id}
              className="p-5 border rounded-xl border-[#23B5D3] bg-cyan-50"
            >
              <Formulaire brouillon={brouillon} setBrouillon={setBrouillon} />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => enregistrer(p.id)}
                  disabled={chargement === p.id}
                  className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
                >
                  {chargement === p.id ? "..." : "Enregistrer"}
                </button>
                <button
                  onClick={() => {
                    setEdition(null);
                    setErreur("");
                  }}
                  className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-4 p-4 border rounded-xl ${
                p.active ? "border-gray-200" : "border-dashed border-gray-300 bg-gray-50"
              }`}
            >
              <div className={p.active ? "" : "opacity-60"}>
                <p className="font-medium">
                  {p.nom}
                  {!p.active && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (masquée)
                    </span>
                  )}
                </p>
                {p.description && (
                  <p className="text-sm text-gray-500">{p.description}</p>
                )}
                <p className="mt-1 text-sm">
                  <span className="font-bold text-[#1F8A3B]">{fcfa(p.prix)}</span>
                  {p.duree_minutes && (
                    <span className="text-gray-500"> · ~{p.duree_minutes} min</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => ouvrirEdition(p)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  Modifier
                </button>
                <button
                  onClick={() => basculerActive(p)}
                  disabled={chargement === p.id}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
                >
                  {chargement === p.id ? "..." : p.active ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Les modifications de prix s&apos;appliquent aux prochains encaissements.
        Les lavages déjà encaissés gardent le prix de l&apos;époque.
      </p>
    </main>
  );
}
