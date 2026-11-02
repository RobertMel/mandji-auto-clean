// src/app/(dashboard)/dashboard/prevenir-client.tsx
// Lavage terminé : message WhatsApp « votre véhicule est prêt » au client.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { PAYS_DEFAUT, numeroWhatsApp } from "@/lib/config";
import ChampTelephone from "../champ-telephone";

export function messageVehiculePret(nomClient: string | null, vehicule: string | null) {
  return [
    `Bonjour${nomClient ? ` ${nomClient}` : ""} 👋`,
    `Votre véhicule${vehicule ? ` (${vehicule})` : ""} est prêt chez Mandji Auto Clean ✅`,
    "Vous pouvez venir le récupérer.",
    "À très bientôt !",
  ].join("\n");
}

export default function PrevenirClient({
  reservationId,
  telephone,
  nomClient,
  vehicule,
  prevenuLe,
}: {
  reservationId: string;
  telephone: string | null; // format international (ex. 24106140807)
  nomClient: string | null;
  vehicule: string | null;
  prevenuLe: string | null;
}) {
  const router = useRouter();
  const [saisie, setSaisie] = useState(false);
  const [codePays, setCodePays] = useState(PAYS_DEFAUT);
  const [tel, setTel] = useState("");
  const numeroSaisi = numeroWhatsApp(tel, codePays);

  const envoyer = async (numero: string, nouveau: boolean) => {
    // Ouvre WhatsApp tout de suite (avant tout await, sinon le navigateur bloque)
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(messageVehiculePret(nomClient, vehicule))}`,
      "_blank",
      "noopener,noreferrer"
    );
    const supabase = creerClientNavigateur();
    if (nouveau) {
      await supabase.rpc("associer_client_reservation", {
        p_reservation_id: reservationId,
        p_telephone: numero,
      });
    }
    await supabase
      .from("reservations")
      .update({ client_prevenu_le: new Date().toISOString() })
      .eq("id", reservationId);
    setSaisie(false);
    router.refresh();
  };

  const heure = prevenuLe
    ? new Date(prevenuLe).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  if (saisie || !telephone) {
    if (!saisie) {
      return (
        <button
          onClick={() => setSaisie(true)}
          className="px-3 py-2 text-sm text-[#0a8fb0] rounded-full hover:bg-cyan-50"
        >
          Prévenir le client
        </button>
      );
    }
    return (
      <div className="flex flex-wrap items-start w-full gap-2 mt-3">
        <div className="flex-1 min-w-[220px]">
          <ChampTelephone
            telephone={tel}
            setTelephone={setTel}
            codePays={codePays}
            setCodePays={setCodePays}
            placeholder="Téléphone du client"
            onEntree={() => numeroSaisi && envoyer(numeroSaisi, true)}
          />
        </div>
        <button
          onClick={() => numeroSaisi && envoyer(numeroSaisi, true)}
          disabled={!numeroSaisi}
          className="px-4 py-2 text-sm font-medium text-white rounded-full bg-[#23B5D3] hover:bg-[#1a91ab] disabled:opacity-50"
        >
          Envoyer
        </button>
        <button onClick={() => setSaisie(false)} className="px-3 py-2 text-sm text-gray-500">
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => envoyer(telephone, false)}
      title={prevenuLe ? "Renvoyer le message" : "Envoyer « votre véhicule est prêt » sur WhatsApp"}
      className={`px-3 py-2 text-sm rounded-full ${
        prevenuLe ? "text-gray-500 hover:bg-gray-100" : "text-white bg-[#23B5D3] hover:bg-[#1a91ab]"
      }`}
    >
      {prevenuLe ? `✓ Prévenu à ${heure}` : "Prévenir le client"}
    </button>
  );
}
