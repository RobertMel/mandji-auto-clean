// src/app/(dashboard)/dashboard/recu/[id]/actions-recu.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { MODES_PAIEMENT, decomposerNumero, numeroWhatsApp } from "@/lib/config";
import ChampTelephone from "../../../champ-telephone";

export default function ActionsRecu({
  reservationId,
  telephoneInitial,
  texte,
  resume,
  encaissementId,
  aRegler,
}: {
  reservationId: string | null;
  telephoneInitial: string;
  texte: string;
  resume: string;
  encaissementId: string;
  aRegler: boolean;
}) {
  const router = useRouter();
  const [suppression, setSuppression] = useState(false);

  // Facture à régler : confirmer le paiement (mode + date)
  const [modePaiement, setModePaiement] = useState("virement");
  const [datePaiement, setDatePaiement] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [confirmation, setConfirmation] = useState(false);
  const confirmerPaiement = async () => {
    const aujourdhui = new Date();
    const quand = new Date(`${datePaiement}T12:00:00`);
    // Paiement du jour : heure actuelle ; date passée : midi ce jour-là
    const payeLe = quand.toDateString() === aujourdhui.toDateString() ? aujourdhui : quand;
    if (Number.isNaN(quand.getTime()) || payeLe.getTime() > Date.now() + 60_000)
      return alert("Date de paiement invalide.");
    setConfirmation(true);
    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("confirmer_paiements", {
      p_encaissement_ids: [encaissementId],
      p_mode: modePaiement,
      p_paye_le: payeLe.toISOString(),
    });
    setConfirmation(false);
    if (error) return alert("Impossible de confirmer : " + error.message);
    router.refresh();
  };

  // Supprime le lavage et son encaissement (retiré de la compta)
  const supprimerLavage = async () => {
    if (!reservationId) return;
    if (
      !window.confirm(
        `Supprimer ce lavage (${resume}) ?\n\nIl sera retiré de la compta. Action définitive.`
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

      {aRegler && (
        <div className="p-5 border border-orange-200 rounded-xl bg-orange-50">
          <p className="mb-1 text-sm font-medium">Facture à régler</p>
          <p className="mb-3 text-xs text-gray-500">
            Quand le client a payé, confirmez ici : le montant entre alors dans la compta.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(MODES_PAIEMENT).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setModePaiement(v)}
                aria-pressed={modePaiement === v}
                className={`px-3 py-1.5 text-sm rounded-full transition ${
                  modePaiement === v
                    ? "bg-[#23B5D3] text-white"
                    : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="block mb-3 text-sm">
            Payé le
            <input
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-lg"
            />
          </label>
          <button
            onClick={confirmerPaiement}
            disabled={confirmation}
            className="w-full py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
          >
            {confirmation ? "..." : "Confirmer le paiement"}
          </button>
        </div>
      )}

      <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
        <p className="mb-2 text-sm font-medium">Envoyer la facture au client</p>

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
