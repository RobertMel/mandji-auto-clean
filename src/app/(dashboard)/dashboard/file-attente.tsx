// src/app/(dashboard)/dashboard/file-attente.tsx
"use client";

import Link from "next/link";
import NouveauVehicule from "./nouveau-vehicule";
import Encaisser, { type PrestationCatalogue } from "./encaisser";
import { useState } from "react";
import { fcfa, formatNumeroRecu } from "@/lib/config";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";


type Reservation = {
  id: string;
  statut: string;
  notes: string | null;
  laveur_id: string | null;
  debut_lavage: string | null;
  fin_lavage: string | null;
  canal: string | null;
  encaissement: {
    id: string;
    numero_recu: number | null;
    montant: number;
    paye_le: string;
  } | null;
};

type Laveur = { id: string; nom_complet: string };

const heure = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

export default function FileAttente({
  reservationsInitiales,
  monId,
  monRole,
  prestations,
  laveurs,
}: {
  reservationsInitiales: Reservation[];
  monId: string;
  monRole: string;
  prestations: PrestationCatalogue[];
  laveurs: Laveur[];
}) {
  // On lit directement les props : après router.refresh(), elles sont à jour.
  const reservations = reservationsInitiales;
  const [chargement, setChargement] = useState<string | null>(null);
  const [encaissement, setEncaissement] = useState<string | null>(null);
  const peutEncaisser = monRole === "gerante" || monRole === "admin";
  const nomLaveur = (id: string | null) =>
    laveurs.find((l) => l.id === id)?.nom_complet ?? "—";
  const router = useRouter();
  const supabase = creerClientNavigateur();

  // Le laveur prend un véhicule libre
  const prendre = async (id: string) => {
    setChargement(id);
    const { error } = await supabase
      .from("reservations")
      .update({
        laveur_id: monId,
        statut: "en_cours",
        debut_lavage: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Impossible de prendre ce lavage : " + error.message);
    } else {
      router.refresh();
    }
    setChargement(null);
  };

  // Le laveur termine son lavage
  const terminer = async (id: string) => {
    setChargement(id);
    const { error } = await supabase
      .from("reservations")
      .update({
        statut: "terminee",
        fin_lavage: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Impossible de terminer : " + error.message);
    } else {
      router.refresh();
    }
    setChargement(null);
  };

  const enAttente = reservations.filter((r) => r.statut === "en_attente");
  const enCours = reservations.filter((r) => r.statut === "en_cours");
  const aEncaisser = reservations.filter(
    (r) => r.statut === "terminee" && !r.encaissement
  );
  const encaissesAujourdhui = reservations
    .filter(
      (r) =>
        r.encaissement &&
        new Date(r.encaissement.paye_le).toDateString() === new Date().toDateString()
    )
    .sort((a, b) => b.encaissement!.paye_le.localeCompare(a.encaissement!.paye_le));
  const termineesAujourdhui = reservations.filter(
    (r) =>
      r.statut === "terminee" &&
      r.fin_lavage &&
      new Date(r.fin_lavage).toDateString() === new Date().toDateString()
  );

  return (
    <main className="max-w-4xl px-6 py-10 mx-auto">
      {/* Enregistrement rapide — gérante et admin uniquement */}
      {(monRole === "gerante" || monRole === "admin") && (
        <div className="mb-8">
          <NouveauVehicule />
        </div>
      )}

      {/* EN ATTENTE */}

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">
          En attente{" "}
          <span className="text-gray-400">({enAttente.length})</span>
        </h2>

        {enAttente.length === 0 ? (
          <p className="text-gray-500">Aucun véhicule en attente.</p>
        ) : (
          <div className="space-y-3">
            {enAttente.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
              >
                <div>
                  <p className="font-medium">{r.notes ?? "Véhicule"}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {r.canal}
                  </p>
                </div>
                <button
                  onClick={() => prendre(r.id)}
                  disabled={chargement === r.id}
                  className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
                >
                  {chargement === r.id ? "..." : "Je prends"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EN COURS */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">
          En cours <span className="text-gray-400">({enCours.length})</span>
        </h2>

        {enCours.length === 0 ? (
          <p className="text-gray-500">Aucun lavage en cours.</p>
        ) : (
          <div className="space-y-3">
            {enCours.map((r) => {
              const estAMoi = r.laveur_id === monId;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 border rounded-xl border-[#23B5D3] bg-cyan-50"
                >
                  <div>
                    <p className="font-medium">{r.notes ?? "Véhicule"}</p>
                    <p className="text-xs text-gray-500">
                      {estAMoi ? "Vous lavez ce véhicule" : "Pris par un collègue"}
                    </p>
                  </div>
                  {estAMoi && (
                    <button
                      onClick={() => terminer(r.id)}
                      disabled={chargement === r.id}
                      className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#23B5D3] hover:bg-[#1a91ab] disabled:opacity-50"
                    >
                      {chargement === r.id ? "..." : "Terminé"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* À ENCAISSER — gérante et admin uniquement */}
      {peutEncaisser && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold">
            À encaisser{" "}
            <span className="text-gray-400">({aEncaisser.length})</span>
          </h2>

          {aEncaisser.length === 0 ? (
            <p className="text-gray-500">Tout est encaissé.</p>
          ) : (
            <div className="space-y-3">
              {aEncaisser.map((r) => (
                <div key={r.id} className="p-4 border border-orange-200 rounded-xl bg-orange-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{r.notes ?? "Véhicule"}</p>
                      <p className="text-xs text-gray-500">
                        Lavé par {nomLaveur(r.laveur_id)}
                        {r.fin_lavage && ` · terminé à ${heure(r.fin_lavage)}`}
                      </p>
                    </div>
                    {encaissement !== r.id && (
                      <button
                        onClick={() => setEncaissement(r.id)}
                        className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
                      >
                        Encaisser
                      </button>
                    )}
                  </div>
                  {encaissement === r.id && (
                    <Encaisser
                      reservationId={r.id}
                      vehicule={r.notes ?? "Véhicule"}
                      prestations={prestations}
                      onFermer={() => setEncaissement(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ENCAISSÉS AUJOURD'HUI — accès aux reçus */}
      {peutEncaisser && encaissesAujourdhui.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold">
            Encaissés aujourd&apos;hui{" "}
            <span className="text-gray-400">({encaissesAujourdhui.length})</span>
          </h2>
          <div className="space-y-2">
            {encaissesAujourdhui.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/recu/${r.encaissement!.id}`}
                className="flex items-center justify-between p-3 text-sm border border-gray-200 rounded-xl hover:border-[#23B5D3]"
              >
                <span>
                  <span className="text-gray-400">
                    n° {formatNumeroRecu(r.encaissement!.numero_recu)}
                  </span>{" "}
                  · {r.notes ?? "Véhicule"}
                </span>
                <span className="font-medium">
                  {fcfa(r.encaissement!.montant)} <span className="text-[#23B5D3]">→ Reçu</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* COMPTEUR DU JOUR */}
      <section className="p-6 text-center border border-gray-200 rounded-xl bg-gray-50">
        <p className="text-sm text-gray-500">Lavages terminés aujourd&apos;hui</p>
        <p className="text-3xl font-bold text-[#1F8A3B]">
          {termineesAujourdhui.length}
        </p>
      </section>
    </main>
  );
}