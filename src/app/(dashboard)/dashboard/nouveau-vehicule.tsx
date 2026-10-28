// src/app/(dashboard)/dashboard/nouveau-vehicule.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { PAYS_DEFAUT, numeroWhatsApp } from "@/lib/config";
import ChampTelephone from "../champ-telephone";

type ClientConnu = {
  id: string;
  nom: string;
  prenom: string | null;
  vehicules: {
    id: string;
    marque: string | null;
    couleur: string | null;
    immatriculation: string | null;
  }[];
  reservations: { id: string }[];
};

const champ =
  "px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]";

export default function NouveauVehicule() {
  const [ouvert, setOuvert] = useState(false);
  const [codePays, setCodePays] = useState(PAYS_DEFAUT);
  const [telephone, setTelephone] = useState("");
  const [nomClient, setNomClient] = useState("");
  const [marque, setMarque] = useState("");
  const [couleur, setCouleur] = useState("");
  const [immat, setImmat] = useState("");
  const [note, setNote] = useState("");
  // Résultat de la recherche, mémorisé avec le numéro recherché
  const [recherche, setRecherche] = useState<{
    numero: string;
    client: ClientConnu | null;
  } | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const router = useRouter();

  const numero = numeroWhatsApp(telephone, codePays);
  const clientConnu = recherche && recherche.numero === numero ? recherche.client : null;

  // Dès que le numéro est complet : est-ce un client connu ?
  useEffect(() => {
    if (!numero) return;
    let annule = false;
    const supabase = creerClientNavigateur();
    supabase
      .from("clients")
      .select("id, nom, prenom, vehicules(id, marque, couleur, immatriculation), reservations(id)")
      .eq("telephone", numero)
      .maybeSingle()
      .then(({ data }) => {
        if (annule) return;
        const client = (data as ClientConnu | null) ?? null;
        setRecherche({ numero, client });
        // Pré-remplit le nom s'il est connu
        if (client && client.nom !== "Sans nom") {
          setNomClient((n) => n || [client.prenom, client.nom].filter(Boolean).join(" "));
        }
      });
    return () => {
      annule = true;
    };
  }, [numero]);

  const reinitialiser = () => {
    setTelephone("");
    setNomClient("");
    setMarque("");
    setCouleur("");
    setImmat("");
    setNote("");
    setRecherche(null);
    setErreur("");
  };

  const enregistrer = async () => {
    if (telephone && !numero) {
      setErreur("Numéro de téléphone incomplet (ou laissez-le vide).");
      return;
    }
    setChargement(true);
    setErreur("");

    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("enregistrer_vehicule", {
      p_marque: marque,
      p_couleur: couleur,
      p_immat: immat,
      p_note: note,
      p_client_nom: nomClient,
      p_telephone: numero ?? "",
    });

    setChargement(false);
    if (error) {
      setErreur("Erreur : " + error.message);
      return;
    }

    reinitialiser();
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

      {/* Client */}
      <p className="mb-2 text-sm font-medium">
        Client <span className="font-normal text-gray-400">(facultatif)</span>
      </p>
      <div className="grid gap-3 mb-2 sm:grid-cols-2">
        <ChampTelephone
          telephone={telephone}
          setTelephone={setTelephone}
          codePays={codePays}
          setCodePays={setCodePays}
          placeholder="Téléphone"
        />
        <input
          type="text"
          placeholder="Nom du client"
          value={nomClient}
          onChange={(e) => setNomClient(e.target.value)}
          className={`${champ} h-fit`}
        />
      </div>

      {/* Client reconnu : choix rapide d'un de ses véhicules */}
      {clientConnu && (
        <div className="p-3 mb-2 text-sm border rounded-lg border-[#23B5D3] bg-cyan-50">
          <p>
            <span className="font-medium">Client connu</span> ·{" "}
            {clientConnu.reservations.length} passage
            {clientConnu.reservations.length > 1 ? "s" : ""}
          </p>
          {clientConnu.vehicules.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {clientConnu.vehicules.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setMarque(v.marque ?? "");
                    setCouleur(v.couleur ?? "");
                    setImmat(v.immatriculation ?? "");
                  }}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-full hover:border-[#1F8A3B]"
                >
                  {[v.marque, v.couleur, v.immatriculation].filter(Boolean).join(" ")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Véhicule */}
      <p className="mt-4 mb-2 text-sm font-medium">Véhicule</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Marque (ex : Toyota)"
          value={marque}
          onChange={(e) => setMarque(e.target.value)}
          className={champ}
        />
        <input
          type="text"
          placeholder="Couleur"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className={champ}
        />
        <input
          type="text"
          placeholder="Plaque"
          value={immat}
          onChange={(e) => setImmat(e.target.value)}
          className={champ}
        />
      </div>

      <input
        type="text"
        placeholder="Note (ex : prestation souhaitée)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`${champ} w-full mt-3`}
      />

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
          onClick={() => {
            reinitialiser();
            setOuvert(false);
          }}
          className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
