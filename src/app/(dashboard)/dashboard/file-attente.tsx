// src/app/(dashboard)/dashboard/file-attente.tsx
"use client";

import { useState } from "react";
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
};

export default function FileAttente({
  reservationsInitiales,
  monId,
}: {
  reservationsInitiales: Reservation[];
  monId: string;
}) {
  const [reservations, setReservations] = useState(reservationsInitiales);
  const [chargement, setChargement] = useState<string | null>(null);
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
  const termineesAujourdhui = reservations.filter(
    (r) =>
      r.statut === "terminee" &&
      r.fin_lavage &&
      new Date(r.fin_lavage).toDateString() === new Date().toDateString()
  );

  return (
    <main className="max-w-4xl px-6 py-10 mx-auto">
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

      {/* COMPTEUR DU JOUR */}
      <section className="p-6 text-center border border-gray-200 rounded-xl bg-gray-50">
        <p className="text-sm text-gray-500">Lavages terminés aujourd'hui</p>
        <p className="text-3xl font-bold text-[#1F8A3B]">
          {termineesAujourdhui.length}
        </p>
      </section>
    </main>
  );
}