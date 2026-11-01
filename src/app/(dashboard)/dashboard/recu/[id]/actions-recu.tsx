// src/app/(dashboard)/dashboard/recu/[id]/actions-recu.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { decomposerNumero, numeroWhatsApp } from "@/lib/config";
import ChampTelephone from "../../../champ-telephone";

export default function ActionsRecu({
  reservationId,
  telephoneInitial,
  texte,
  resume,
}: {
  reservationId: string | null;
  telephoneInitial: string;
  texte: string;
  resume: string;
}) {
  const router = useRouter();
  const [suppression, setSuppression] = useState(false);

  // Supprime le lavage et son encaissement (retiré de la compta)
  const supprimerLavage = async () => {
    if (!reservationId) return;
    if (
      !window.confirm(
        `Supprimer ce lavage (${resume}) ?\n\nL'encaissement sera retiré de la compta. Action définitive.`
      )
    )
      return;
    setSuppression(true);
    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("supprimer_lavage", { p_reservation_id: reservationId });
    setSuppression(false);
    if (error) return alert("Impossible de supprimer : " + error.message);
    router.push("/dashboard");
    router.refresh();
  };
  // Si un numéro est déjà enregistré, on retrouve son pays
  const initial = decomposerNumero(telephoneInitial);
  const [codePays, setCodePays] = useState(initial.codePays);
  const [telephone, setTelephone] = useState(initial.local);

  const numero = numeroWhatsApp(telephone, codePays);

  const envoyer = async () => {
    if (!numero) return;

    // Ouvre WhatsApp tout de suite (avant tout await : sinon le
    // navigateur bloque l'ouverture du nouvel onglet).
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`,
      "_blank",
      "noopener,noreferrer"
    );

    // Rattache la réservation (et le véhicule) à la fiche du client
    if (reservationId && numero !== telephoneInitial) {
      const supabase = creerClientNavigateur();
      await supabase.rpc("associer_client_reservation", {
        p_reservation_id: reservationId,
        p_telephone: numero,
      });
    }
  };

  return (
    <div className="mb-8 space-y-4 print:hidden">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#1F8A3B]">
        ← Retour aux lavages
      </Link>

      <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
        <p className="mb-2 text-sm font-medium">Envoyer le reçu au client</p>

        <ChampTelephone
          telephone={telephone}
          setTelephone={setTelephone}
          codePays={codePays}
          setCodePays={setCodePays}
          onEntree={envoyer}
        />

        <button
          onClick={envoyer}
          disabled={!numero}
          className="w-full py-2 mt-3 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          Envoyer sur WhatsApp
        </button>
        <p className="mt-2 text-xs text-gray-400">
          Pays absent de la liste ? Tapez le numéro complet avec + (ex : +44 7…).
        </p>
      </div>

      <button
        onClick={() => window.print()}
        className="w-full py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
      >
        Imprimer / enregistrer en PDF
      </button>

      {reservationId && (
        <button
          onClick={supprimerLavage}
          disabled={suppression}
          className="w-full py-2 text-sm text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
        >
          {suppression ? "..." : "Supprimer ce lavage"}
        </button>
      )}
    </div>
  );
}
