// src/app/panier.tsx
// Parcours de réservation : 1. prestations -> 2. infos -> envoi WhatsApp
"use client";

import { useEffect, useRef, useState } from "react";
import { WHATSAPP_NUMBER, fcfa } from "@/lib/config";

export type Prestation = {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  duree_minutes: number | null;
};

const CRENEAUX = ["Dès que possible", "Aujourd'hui", "Demain matin", "Demain après-midi"];

const champ =
  "w-full px-4 py-3 text-base bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-lagon";

export default function Panier({ prestations }: { prestations: Prestation[] }) {
  const [selection, setSelection] = useState<string[]>([]);
  const [nom, setNom] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [creneau, setCreneau] = useState("");
  const [autreCreneau, setAutreCreneau] = useState(false);
  const [infosVisibles, setInfosVisibles] = useState(false);
  const refInfos = useRef<HTMLElement>(null);

  // Cache la barre du bas quand l'étape 2 est à l'écran
  useEffect(() => {
    const el = refInfos.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInfosVisibles(e.isIntersecting), {
      rootMargin: "0px 0px -30% 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const basculer = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const choisies = prestations.filter((p) => selection.includes(p.id));
  const total = choisies.reduce((s, p) => s + p.prix, 0);
  const duree = choisies.reduce((s, p) => s + (p.duree_minutes ?? 0), 0);
  const resume = `${choisies.length} prestation${choisies.length > 1 ? "s" : ""}`;

  const lienWhatsApp = () => {
    const lignes = [
      "Bonjour Mandji Auto Clean, je souhaite réserver.",
      "",
      `Nom : ${nom.trim() || "(non renseigné)"}`,
      `Véhicule : ${vehicule.trim() || "(non renseigné)"}`,
      `Créneau souhaité : ${creneau.trim() || "(à convenir)"}`,
      "",
      "Prestations :",
      ...choisies.map((p) => `- ${p.nom} (${fcfa(p.prix)})`),
      "",
      `Total : ${fcfa(total)}`,
      "",
      "Je joins une photo de mon véhicule ci-dessous.",
    ];
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lignes.join("\n"))}`;
  };

  const lienQuestion = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Bonjour Mandji Auto Clean, j'ai une question :"
  )}`;

  return (
    <>
      {/* ÉTAPE 1 */}
      <section id="prestations" className="px-5 pt-12 pb-10 scroll-mt-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold sm:text-3xl">1. Choisissez vos prestations</h2>
          <p className="mt-2 text-gray-600">Touchez une ou plusieurs prestations, le total se calcule tout seul.</p>

          {prestations.length === 0 ? (
            <p className="p-5 mt-6 rounded-xl bg-ecume">
              Le catalogue est en cours de mise à jour.{" "}
              <a href={lienQuestion} target="_blank" rel="noopener noreferrer" className="font-semibold underline text-mandji">
                Écrivez-nous sur WhatsApp
              </a>{" "}
              pour connaître nos tarifs.
            </p>
          ) : (
            <ul className="mt-6 border-t border-gray-200">
              {prestations.map((p) => {
                const active = selection.includes(p.id);
                return (
                  <li key={p.id} className="border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => basculer(p.id)}
                      aria-pressed={active}
                      className={`flex items-start w-full gap-4 px-2 py-4 text-left transition-colors -mx-2 rounded-lg ${
                        active ? "bg-ecume" : "active:bg-gray-50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex items-center justify-center w-7 h-7 shrink-0 rounded-full border-2 text-sm font-bold transition-colors ${
                          active ? "bg-mandji border-mandji text-white" : "border-gray-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-lg font-semibold leading-snug">{p.nom}</span>
                        {p.description && (
                          <span className="block mt-0.5 text-sm text-gray-600">{p.description}</span>
                        )}
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-lg font-bold whitespace-nowrap">{fcfa(p.prix)}</span>
                        {p.duree_minutes && (
                          <span className="block text-sm text-gray-500">~{p.duree_minutes} min</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ÉTAPE 2 */}
      <section
        id="infos"
        ref={refInfos}
        className="px-5 pt-10 pb-16 scroll-mt-4 bg-ecume sm:px-8"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold sm:text-3xl">2. Envoyez votre demande</h2>

          {/* Récapitulatif */}
          {choisies.length === 0 ? (
            <p className="mt-3 text-gray-600">
              Aucune prestation choisie pour l&apos;instant.{" "}
              <a href="#prestations" className="font-semibold underline text-mandji">
                Revenir à l&apos;étape 1
              </a>
            </p>
          ) : (
            <div className="p-5 mt-5 bg-white rounded-2xl">
              <ul className="space-y-1">
                {choisies.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4">
                    <span>{p.nom}</span>
                    <span className="whitespace-nowrap">{fcfa(p.prix)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between pt-3 mt-3 border-t border-gray-200">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-extrabold text-mandji">{fcfa(total)}</span>
              </div>
              {duree > 0 && <p className="mt-1 text-sm text-right text-gray-500">environ {duree} minutes</p>}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="block mb-1 font-medium">Votre nom</span>
              <input type="text" autoComplete="name" value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
            </label>
            <label className="block">
              <span className="block mb-1 font-medium">Votre véhicule</span>
              <input
                type="text"
                placeholder="Ex : Toyota RAV4 blanc"
                value={vehicule}
                onChange={(e) => setVehicule(e.target.value)}
                className={champ}
              />
            </label>

            <fieldset>
              <legend className="mb-2 font-medium">Quand souhaitez-vous venir ?</legend>
              <div className="flex flex-wrap gap-2">
                {CRENEAUX.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={!autreCreneau && creneau === c}
                    onClick={() => {
                      setAutreCreneau(false);
                      setCreneau(c);
                    }}
                    className={`px-4 py-2 rounded-full border transition-colors ${
                      !autreCreneau && creneau === c
                        ? "bg-encre border-encre text-white"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={autreCreneau}
                  onClick={() => {
                    setAutreCreneau(true);
                    setCreneau("");
                  }}
                  className={`px-4 py-2 rounded-full border transition-colors ${
                    autreCreneau ? "bg-encre border-encre text-white" : "bg-white border-gray-300"
                  }`}
                >
                  Autre…
                </button>
              </div>
              {autreCreneau && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex : samedi vers 10 h"
                  value={creneau}
                  onChange={(e) => setCreneau(e.target.value)}
                  className={`${champ} mt-3`}
                />
              )}
            </fieldset>
          </div>

          {choisies.length > 0 ? (
            <a
              href={lienWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 mt-8 text-lg font-semibold text-center text-white transition-colors rounded-full bg-mandji hover:bg-mandji-fonce"
            >
              Envoyer ma demande sur WhatsApp
            </a>
          ) : (
            <p className="p-4 mt-8 text-center text-gray-600 bg-white rounded-full">
              Choisissez au moins une prestation pour envoyer votre demande.
            </p>
          )}
          <p className="mt-4 text-sm text-center text-gray-600">
            WhatsApp s&apos;ouvre avec votre demande déjà écrite. Ajoutez une photo de votre véhicule, puis
            nous vous confirmons l&apos;heure.
          </p>
        </div>
      </section>

      {/* Barre du bas : apparaît dès qu'une prestation est choisie */}
      <div
        aria-hidden={choisies.length === 0 || infosVisibles}
        className={`fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-white/95 backdrop-blur border-t border-gray-200 transition-transform duration-300 ${
          choisies.length > 0 && !infosVisibles ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between max-w-2xl gap-4 mx-auto">
          <div>
            <p className="text-sm text-gray-600">{resume}</p>
            <p className="text-xl font-extrabold leading-tight">{fcfa(total)}</p>
          </div>
          <a
            href="#infos"
            tabIndex={choisies.length > 0 && !infosVisibles ? 0 : -1}
            className="px-6 py-3 font-semibold text-white rounded-full bg-mandji hover:bg-mandji-fonce"
          >
            Continuer
          </a>
        </div>
      </div>
    </>
  );
}
