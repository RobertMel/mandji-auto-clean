// src/app/(dashboard)/dashboard/lavage-hors-site.tsx
// Gérante / admin : enregistrer après coup un lavage déjà réalisé (hors site,
// à domicile...) et payé, à la date choisie.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { MODES_PAIEMENT, PAYS_DEFAUT, fcfa, libelleLaveur, numeroWhatsApp } from "@/lib/config";
import ChampTelephone from "../champ-telephone";
import type { PrestationCatalogue } from "./encaisser";

type Laveur = { id: string; nom_complet: string; surnom?: string | null };

const champ =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]";

const deuxChiffres = (n: number) => String(n).padStart(2, "0");
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
};
const maintenant = () => {
  const d = new Date();
  return `${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;
};

export default function LavageHorsSite({
  prestations,
  laveurs,
}: {
  prestations: PrestationCatalogue[];
  laveurs: Laveur[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(aujourdhui);
  const [heure, setHeure] = useState(maintenant);
  const [laveurId, setLaveurId] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [montantSaisi, setMontantSaisi] = useState<string | null>(null);
  const [mode, setMode] = useState("especes");
  const [differe, setDiffere] = useState(false); // entreprise : payé en fin de mois
  const [vehicule, setVehicule] = useState("");
  const [codePays, setCodePays] = useState(PAYS_DEFAUT);
  const [telephone, setTelephone] = useState("");
  const [nomClient, setNomClient] = useState("");
  const [note, setNote] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const total = prestations.filter((p) => selection.includes(p.id)).reduce((s, p) => s + p.prix, 0);
  const montant = montantSaisi === null ? total : Number(montantSaisi) || 0;
  const numero = numeroWhatsApp(telephone, codePays);

  const basculer = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const fermer = () => {
    setOuvert(false);
    setSelection([]);
    setMontantSaisi(null);
    setVehicule("");
    setTelephone("");
    setNomClient("");
    setNote("");
    setErreur("");
  };

  const enregistrer = async () => {
    const quand = new Date(`${date}T${heure || "12:00"}`);
    if (Number.isNaN(quand.getTime())) return setErreur("Date ou heure invalide.");
    if (quand.getTime() > Date.now() + 60 * 60 * 1000)
      return setErreur("La date doit être aujourd'hui ou dans le passé.");
    if (selection.length === 0) return setErreur("Sélectionnez au moins une prestation.");
    if (montant < 0 || montant > total)
      return setErreur(`Le montant doit être compris entre 0 et ${fcfa(total)}.`);
    if (telephone && !numero) return setErreur("Numéro de téléphone incomplet (ou laissez-le vide).");

    setChargement(true);
    setErreur("");
    const supabase = creerClientNavigateur();
    const { data: encaissementId, error } = await supabase.rpc("enregistrer_lavage_externe", {
      p_date: quand.toISOString(),
      p_laveur_id: laveurId || null,
      p_prestation_ids: selection,
      p_montant: montant,
      p_mode: differe ? null : mode,
      p_differe: differe,
      p_vehicule: vehicule,
      p_client_nom: nomClient,
      p_telephone: numero ?? "",
      p_note: note,
    });
    setChargement(false);
    if (error) return setErreur(error.message);

    // Ouvre le reçu (envoi WhatsApp possible)
    router.push(`/dashboard/recu/${encaissementId}`);
  };

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="px-5 py-2 text-sm font-medium text-[#1F8A3B] bg-white border border-[#1F8A3B] rounded-full hover:bg-green-50"
      >
        + Lavage déjà réalisé
      </button>
    );
  }

  return (
    <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
      <h3 className="font-bold">Lavage déjà réalisé</h3>
      <p className="mb-4 text-sm text-gray-500">
        Pour un lavage fait en dehors du site (à domicile, en entreprise…). Il est compté à la date choisie
        dans la compta, la part des laveurs et les statistiques. S&apos;il sera payé plus tard (entreprise),
        cochez « Paiement en fin de mois ».
      </p>

      {/* Quand et qui */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Date
          <input type="date" value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value)} className={`${champ} mt-1`} />
        </label>
        <label className="text-sm">
          Heure
          <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className={`${champ} mt-1`} />
        </label>
        <label className="text-sm">
          Laveur
          <select value={laveurId} onChange={(e) => setLaveurId(e.target.value)} className={`${champ} mt-1`}>
            <option value="">Non renseigné</option>
            {laveurs.map((l) => (
              <option key={l.id} value={l.id}>
                {libelleLaveur(l)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Prestations */}
      <p className="mt-5 mb-2 text-sm font-medium">Prestations réalisées</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {prestations.map((p) => {
          const active = selection.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => basculer(p.id)}
              aria-pressed={active}
              className={`flex justify-between px-4 py-3 text-sm text-left border rounded-lg transition ${
                active ? "border-[#1F8A3B] bg-green-50 ring-1 ring-[#1F8A3B]" : "border-gray-200 bg-white hover:border-[#23B5D3]"
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

      {/* Paiement */}
      <div className="grid gap-3 mt-5 sm:grid-cols-2">
        <label className="text-sm">
          {differe ? "Montant facturé (FCFA)" : "Montant encaissé (FCFA)"}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={total}
            step={500}
            value={montantSaisi ?? String(total)}
            onChange={(e) => setMontantSaisi(e.target.value)}
            className={`${champ} mt-1`}
          />
          {total > 0 && montant < total && (
            <span className="block mt-1 text-xs text-orange-600">Remise : {fcfa(total - montant)}</span>
          )}
        </label>
        <div className="text-sm">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={differe}
              onChange={(e) => setDiffere(e.target.checked)}
              className="w-4 h-4 accent-[#1F8A3B]"
            />
            <span className="font-medium">Paiement en fin de mois (facture à régler)</span>
          </label>
          {!differe && (<>
          Mode de paiement
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(MODES_PAIEMENT).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                aria-pressed={mode === v}
                className={`px-3 py-2 rounded-full transition ${
                  mode === v ? "bg-[#23B5D3] text-white" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          </>)}
        </div>
      </div>

      {/* Facultatif */}
      <p className="mt-5 mb-2 text-sm font-medium">
        Client et véhicule <span className="font-normal text-gray-400">(facultatif)</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <ChampTelephone
          telephone={telephone}
          setTelephone={setTelephone}
          codePays={codePays}
          setCodePays={setCodePays}
          placeholder="Téléphone du client"
        />
        <input type="text" placeholder="Nom du client" value={nomClient} onChange={(e) => setNomClient(e.target.value)} className={`${champ} h-fit`} />
        <input type="text" placeholder="Véhicule (ex : Toyota Hilux blanc)" value={vehicule} onChange={(e) => setVehicule(e.target.value)} className={champ} />
        <input type="text" placeholder="Note (ex : à domicile, quartier…)" value={note} onChange={(e) => setNote(e.target.value)} className={champ} />
      </div>

      {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          onClick={enregistrer}
          disabled={chargement || selection.length === 0}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "..." : `Enregistrer ${fcfa(montant)}`}
        </button>
        <button
          onClick={fermer}
          className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
