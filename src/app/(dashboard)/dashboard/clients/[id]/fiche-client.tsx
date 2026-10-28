// src/app/(dashboard)/dashboard/clients/[id]/fiche-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { decomposerNumero, formaterInternational, numeroWhatsApp } from "@/lib/config";
import ChampTelephone from "../../../champ-telephone";

type Client = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  notes: string;
};

const champ =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]";

export default function FicheClient({ client }: { client: Client }) {
  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(client.nom);
  const [prenom, setPrenom] = useState(client.prenom);
  const [email, setEmail] = useState(client.email);
  const [notes, setNotes] = useState(client.notes);
  const initial = decomposerNumero(client.telephone);
  const [codePays, setCodePays] = useState(initial.codePays);
  const [telephone, setTelephone] = useState(initial.local);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const router = useRouter();

  const numero = numeroWhatsApp(telephone, codePays);

  const enregistrer = async () => {
    if (!nom.trim()) return setErreur("Le nom est obligatoire.");
    if (!numero) return setErreur("Numéro de téléphone incomplet.");
    setErreur("");
    setChargement(true);

    const supabase = creerClientNavigateur();
    const { error } = await supabase
      .from("clients")
      .update({
        nom: nom.trim(),
        prenom: prenom.trim() || null,
        telephone: numero,
        email: email.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", client.id);

    setChargement(false);
    if (error) {
      setErreur(
        error.code === "23505"
          ? "Ce numéro appartient déjà à un autre client."
          : "Erreur : " + error.message
      );
      return;
    }
    setEdition(false);
    router.refresh();
  };

  const annuler = () => {
    setNom(client.nom);
    setPrenom(client.prenom);
    setEmail(client.email);
    setNotes(client.notes);
    setCodePays(initial.codePays);
    setTelephone(initial.local);
    setErreur("");
    setEdition(false);
  };

  if (!edition) {
    return (
      <section className="flex flex-wrap items-start justify-between gap-4 mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {[client.prenom, client.nom].filter(Boolean).join(" ")}
          </h1>
          <p className="text-gray-600">{formaterInternational(client.telephone)}</p>
          {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
          {client.notes && (
            <p className="max-w-xl p-3 mt-3 text-sm border border-yellow-200 rounded-lg bg-yellow-50">
              {client.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={`https://wa.me/${client.telephone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
          >
            WhatsApp
          </a>
          <button
            onClick={() => setEdition(true)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Modifier
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-5 mt-4 mb-8 border rounded-xl border-[#23B5D3] bg-cyan-50">
      <h2 className="mb-4 font-bold">Modifier la fiche</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className={champ}
        />
        <input
          type="text"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className={champ}
        />
        <ChampTelephone
          telephone={telephone}
          setTelephone={setTelephone}
          codePays={codePays}
          setCodePays={setCodePays}
        />
        <input
          type="email"
          placeholder="Email (facultatif)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${champ} h-fit`}
        />
        <textarea
          placeholder="Notes internes (préférences, remarques...)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`${champ} sm:col-span-2`}
        />
      </div>

      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-3 mt-4">
        <button
          onClick={enregistrer}
          disabled={chargement}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "..." : "Enregistrer"}
        </button>
        <button
          onClick={annuler}
          className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </section>
  );
}
