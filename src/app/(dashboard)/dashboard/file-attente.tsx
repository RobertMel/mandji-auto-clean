// src/app/(dashboard)/dashboard/file-attente.tsx
"use client";

import Link from "next/link";
import NouveauVehicule from "./nouveau-vehicule";
import Encaisser, { type PrestationCatalogue } from "./encaisser";
import LavageHorsSite from "./lavage-hors-site";
import PrevenirClient from "./prevenir-client";
import { useState } from "react";
import { fcfa, formatNumeroRecu, libelleLaveur } from "@/lib/config";
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
  telephone_client: string | null;
  client_prevenu_le: string | null;
  client: { nom: string; prenom: string | null; entreprise: boolean; telephone: string | null } | null;
  encaissement: {
    id: string;
    numero_recu: number | null;
    montant: number;
    paye_le: string | null;
    statut: string;
  } | null;
};

type Laveur = { id: string; nom_complet: string; role?: string; surnom?: string | null };

const nomDuClient = (r: Reservation) =>
  r.client && r.client.nom !== "Sans nom"
    ? [r.client.prenom, r.client.nom].filter(Boolean).join(" ")
    : null;

const badgeEntreprise = (r: Reservation) =>
  r.client?.entreprise && (
    <span className="ml-2 px-2 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-100 rounded-full align-middle">
      Entreprise
    </span>
  );

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
  const nomLaveur = (id: string | null) => libelleLaveur(laveurs.find((l) => l.id === id));
  const listeLaveurs = laveurs
    .filter((l) => l.role === "laveur")
    .sort((a, b) => a.nom_complet.localeCompare(b.nom_complet, "fr", { numeric: true }));
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

  // Gérante / admin : assigner (ou réassigner) un lavage à un laveur,
  // ou le remettre en attente
  const assigner = async (r: Reservation, laveurId: string) => {
    if (!laveurId) return;
    setChargement(r.id);
    const maj =
      laveurId === "attente"
        ? { laveur_id: null, statut: "en_attente", debut_lavage: null }
        : r.statut === "en_attente"
          ? { laveur_id: laveurId, statut: "en_cours", debut_lavage: new Date().toISOString() }
          : { laveur_id: laveurId };
    const { error } = await supabase.from("reservations").update(maj).eq("id", r.id);
    setChargement(null);
    if (error) alert("Impossible d'assigner : " + error.message);
    else router.refresh();
  };

  const choixLaveur = (r: Reservation) =>
    peutEncaisser && (
      <select
        value={r.statut === "en_cours" ? (r.laveur_id ?? "") : ""}
        onChange={(e) => assigner(r, e.target.value)}
        disabled={chargement === r.id}
        aria-label="Assigner à un laveur"
        className="max-w-[11rem] px-2 py-2 text-sm bg-white border border-gray-300 rounded-full focus:outline-none focus:border-[#23B5D3] disabled:opacity-50"
      >
        {r.statut === "en_attente" && <option value="">Assigner à…</option>}
        {r.statut === "en_cours" && !listeLaveurs.some((l) => l.id === r.laveur_id) && (
          <option value={r.laveur_id ?? ""}>{nomLaveur(r.laveur_id)}</option>
        )}
        {listeLaveurs.map((l) => (
          <option key={l.id} value={l.id}>
            {libelleLaveur(l)}
          </option>
        ))}
        {r.statut === "en_cours" && <option value="attente">↩ Remettre en attente</option>}
      </select>
    );

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

  // Gérante / admin : supprimer un lavage (erreur de saisie, client parti...).
  // S'il était encaissé, l'encaissement est retiré de la compta.
  const supprimer = async (r: Reservation) => {
    const message = r.encaissement
      ? `Supprimer « ${r.notes ?? "ce lavage"} » ?\n\nIl a été encaissé (${fcfa(r.encaissement.montant)}, reçu n° ${formatNumeroRecu(r.encaissement.numero_recu)}) : ce montant sera retiré de la compta. Action définitive.`
      : `Supprimer « ${r.notes ?? "ce lavage"} » ? Action définitive.`;
    if (!window.confirm(message)) return;
    setChargement(r.id);
    const { error } = await supabase.rpc("supprimer_lavage", { p_reservation_id: r.id });
    setChargement(null);
    if (error) alert("Impossible de supprimer : " + error.message);
    else router.refresh();
  };

  const boutonSupprimer = (r: Reservation) =>
    peutEncaisser && (
      <button
        onClick={() => supprimer(r)}
        disabled={chargement === r.id}
        title="Supprimer ce lavage"
        className="px-3 py-2 text-sm text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
      >
        Supprimer
      </button>
    );

  const enAttente = reservations.filter((r) => r.statut === "en_attente");
  const enCours = reservations.filter((r) => r.statut === "en_cours");
  const aEncaisser = reservations.filter(
    (r) => r.statut === "terminee" && !r.encaissement
  );
  // Date retenue : paiement, ou fin du lavage pour une facture à régler
  const dateEncaissement = (r: Reservation) => r.encaissement?.paye_le ?? r.fin_lavage ?? "";
  const encaissesAujourdhui = reservations
    .filter(
      (r) =>
        r.encaissement &&
        dateEncaissement(r) &&
        new Date(dateEncaissement(r)).toDateString() === new Date().toDateString()
    )
    .sort((a, b) => dateEncaissement(b).localeCompare(dateEncaissement(a)));
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
        <div className="mb-8 space-y-3">
          <NouveauVehicule />
          <LavageHorsSite prestations={prestations} laveurs={listeLaveurs} />
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
                className="flex flex-wrap items-center justify-between gap-3 p-4 border border-gray-200 rounded-xl"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {r.notes ?? "Véhicule"}
                    {badgeEntreprise(r)}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {r.canal}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {boutonSupprimer(r)}
                  {choixLaveur(r)}
                  {monRole === "laveur" && (
                  <button
                    onClick={() => prendre(r.id)}
                    disabled={chargement === r.id}
                    className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
                  >
                    {chargement === r.id ? "..." : "Je prends"}
                  </button>
                  )}
                </div>
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
                  className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-xl border-[#23B5D3] bg-cyan-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.notes ?? "Véhicule"}
                      {badgeEntreprise(r)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {estAMoi
                        ? "Vous lavez ce véhicule"
                        : peutEncaisser
                          ? `${nomLaveur(r.laveur_id)}${r.debut_lavage ? ` · depuis ${heure(r.debut_lavage)}` : ""}`
                          : "Pris par un collègue"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {boutonSupprimer(r)}
                    {choixLaveur(r)}
                    {(estAMoi || peutEncaisser) && (
                      <button
                        onClick={() => terminer(r.id)}
                        disabled={chargement === r.id}
                        className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#23B5D3] hover:bg-[#1a91ab] disabled:opacity-50"
                      >
                        {chargement === r.id ? "..." : "Terminé"}
                      </button>
                    )}
                  </div>
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {r.notes ?? "Véhicule"}
                        {badgeEntreprise(r)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {nomDuClient(r) && `${nomDuClient(r)} · `}
                        Lavé par {nomLaveur(r.laveur_id)}
                        {r.fin_lavage && ` · terminé à ${heure(r.fin_lavage)}`}
                      </p>
                    </div>
                    {encaissement !== r.id && (
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {boutonSupprimer(r)}
                        <PrevenirClient
                          reservationId={r.id}
                          telephone={r.telephone_client ?? r.client?.telephone ?? null}
                          nomClient={nomDuClient(r)}
                          vehicule={r.notes}
                          prevenuLe={r.client_prevenu_le}
                        />
                        <button
                          onClick={() => setEncaissement(r.id)}
                          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
                        >
                          Encaisser
                        </button>
                      </div>
                    )}
                  </div>
                  {encaissement === r.id && (
                    <Encaisser
                      reservationId={r.id}
                      vehicule={r.notes ?? "Véhicule"}
                      prestations={prestations}
                      entreprise={!!r.client?.entreprise}
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
            Encaissés / facturés aujourd&apos;hui{" "}
            <span className="text-gray-400">({encaissesAujourdhui.length})</span>
          </h2>
          <div className="space-y-2">
            {encaissesAujourdhui.map((r) => (
              <div key={r.id} className="flex items-center gap-1">
              <Link
                href={`/dashboard/recu/${r.encaissement!.id}`}
                className="flex flex-wrap items-center justify-between flex-1 min-w-0 p-3 text-sm border border-gray-200 gap-x-3 gap-y-1 rounded-xl hover:border-[#23B5D3]"
              >
                <span>
                  <span className="text-gray-400">
                    n° {formatNumeroRecu(r.encaissement!.numero_recu)}
                  </span>{" "}
                  · {r.notes ?? "Véhicule"}
                  {r.encaissement!.statut === "a_venir" && (
                    <span className="ml-2 px-2 py-0.5 text-[11px] font-medium text-orange-700 bg-orange-100 rounded-full">
                      à régler
                    </span>
                  )}
                </span>
                <span className="font-medium shrink-0">
                  {fcfa(r.encaissement!.montant)}{" "}
                  <span className="text-[#23B5D3]">
                    → {r.encaissement!.statut === "a_venir" ? "Facture" : "Reçu"}
                  </span>
                </span>
              </Link>
              {boutonSupprimer(r)}
              </div>
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