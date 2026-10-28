// src/app/(dashboard)/dashboard/recu/[id]/actions-recu.tsx
"use client";

import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import {
  PAYS,
  decomposerNumero,
  drapeau,
  formaterInternational,
  numeroWhatsApp,
} from "@/lib/config";

export default function ActionsRecu({
  reservationId,
  telephoneInitial,
  texte,
}: {
  reservationId: string | null;
  telephoneInitial: string;
  texte: string;
}) {
  // Si un numéro est déjà enregistré, on retrouve son pays
  const initial = decomposerNumero(telephoneInitial);
  const [codePays, setCodePays] = useState(initial.codePays);
  const [telephone, setTelephone] = useState(initial.local);

  const numero = numeroWhatsApp(telephone, codePays);
  const saisieInternationale = /^\s*(\+|00)/.test(telephone);
  const pays = PAYS.find((p) => p.code === codePays) ?? PAYS[0];

  const envoyer = async () => {
    if (!numero) return;

    // Ouvre WhatsApp tout de suite (avant tout await : sinon le
    // navigateur bloque l'ouverture du nouvel onglet).
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`,
      "_blank",
      "noopener,noreferrer"
    );

    // Mémorise le numéro du client (format international) sur la réservation
    if (reservationId && numero !== telephoneInitial) {
      const supabase = creerClientNavigateur();
      await supabase
        .from("reservations")
        .update({ telephone_client: numero })
        .eq("id", reservationId);
    }
  };

  return (
    <div className="mb-8 space-y-4 print:hidden">
      <a href="/dashboard" className="text-sm text-gray-500 hover:text-[#1F8A3B]">
        ← Retour aux lavages
      </a>

      <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
        <p className="mb-2 text-sm font-medium">Envoyer le reçu au client</p>

        <div className="flex gap-2">
          {/* Pays / indicatif */}
          <select
            value={codePays}
            onChange={(e) => setCodePays(e.target.value)}
            disabled={saisieInternationale}
            aria-label="Pays du numéro"
            className="w-28 px-2 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3] disabled:opacity-40"
          >
            {PAYS.map((p) => (
              <option key={p.code} value={p.code}>
                {drapeau(p.code)} +{p.indicatif} {p.nom}
              </option>
            ))}
          </select>

          <input
            type="tel"
            inputMode="tel"
            placeholder={
              pays.garderZero ? "Ex : 06 14 08 07" : "Numéro (ou +XX… pour un autre pays)"
            }
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && envoyer()}
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
          />
        </div>

        <button
          onClick={envoyer}
          disabled={!numero}
          className="w-full py-2 mt-3 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          Envoyer sur WhatsApp
        </button>

        {telephone && !numero && (
          <p className="mt-2 text-xs text-red-600">Numéro incomplet.</p>
        )}
        {numero && (
          <p className="mt-2 text-xs text-gray-500">
            Envoi au {formaterInternational(numero)}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Pays absent de la liste ? Tapez le numéro complet avec + (ex : +44 7…).
        </p>
      </div>

      <button
        onClick={() => window.print()}
        className="w-full py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
      >
        Imprimer / enregistrer en PDF
      </button>
    </div>
  );
}
