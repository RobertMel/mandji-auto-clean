// src/app/(dashboard)/dashboard/recu/[id]/page.tsx
import { notFound } from "next/navigation";
import { exigerGestionnaire } from "@/lib/session";
import {
  ENTREPRISE,
  MODES_PAIEMENT,
  fcfa,
  formatNumeroRecu,
} from "@/lib/config";
import ActionsRecu from "./actions-recu";

type Ligne = {
  prix_applique: number;
  quantite: number;
  prestation: { nom: string } | null;
};

type EncaissementDetaille = {
  id: string;
  numero_recu: number | null;
  montant: number;
  mode_paiement: string;
  paye_le: string;
  encaisse_par: string | null;
  reservation: {
    id: string;
    notes: string | null;
    vehicule_marque: string | null;
    vehicule_couleur: string | null;
    vehicule_immatriculation: string | null;
    telephone_client: string | null;
    reservation_prestations: Ligne[];
  } | null;
};

export default async function RecuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await exigerGestionnaire();

  const { data } = await supabase
    .from("encaissements")
    .select(
      `id, numero_recu, montant, mode_paiement, paye_le, encaisse_par,
       reservation:reservations (
         id, notes, vehicule_marque, vehicule_couleur, vehicule_immatriculation, telephone_client,
         reservation_prestations ( prix_applique, quantite, prestation:prestations ( nom ) )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const enc = data as unknown as EncaissementDetaille;

  const { data: caissier } = enc.encaisse_par
    ? await supabase
        .from("profils")
        .select("nom_complet")
        .eq("id", enc.encaisse_par)
        .maybeSingle()
    : { data: null };

  const resa = enc.reservation;
  const lignes = (resa?.reservation_prestations ?? []).map((l) => ({
    nom: l.prestation?.nom ?? "Prestation",
    montant: l.prix_applique * l.quantite,
  }));
  const sousTotal = lignes.reduce((s, l) => s + l.montant, 0);
  const remise = Math.max(0, sousTotal - enc.montant);

  const vehicule =
    [resa?.vehicule_marque, resa?.vehicule_couleur, resa?.vehicule_immatriculation]
      .filter(Boolean)
      .join(" ") ||
    resa?.notes ||
    "—";

  const date = new Date(enc.paye_le);
  const dateTexte = date.toLocaleDateString("fr-FR");
  const heureTexte = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const numero = formatNumeroRecu(enc.numero_recu);
  const mode = MODES_PAIEMENT[enc.mode_paiement] ?? enc.mode_paiement;

  // Version texte pour WhatsApp
  const texteWhatsApp = [
    `*${ENTREPRISE.nom}* — Reçu n° ${numero}`,
    `${dateTexte} à ${heureTexte}`,
    "",
    `Véhicule : ${vehicule}`,
    "",
    ...lignes.map((l) => `• ${l.nom} : ${fcfa(l.montant)}`),
    ...(remise > 0 ? [`Remise : -${fcfa(remise)}`] : []),
    "",
    `*Total payé : ${fcfa(enc.montant)}* (${mode})`,
    "",
    "Merci de votre visite et à bientôt !",
  ].join("\n");

  return (
    <main className="max-w-md px-6 py-10 mx-auto print:py-0">
      <ActionsRecu
        reservationId={resa?.id ?? null}
        telephoneInitial={resa?.telephone_client ?? ""}
        texte={texteWhatsApp}
      />

      {/* Le reçu */}
      <article className="p-8 border border-gray-200 rounded-2xl print:border-0 print:p-0">
        <header className="pb-6 mb-6 text-center border-b border-dashed border-gray-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={ENTREPRISE.nom} className="h-16 mx-auto mb-3" />
          <p className="font-bold">{ENTREPRISE.nom}</p>
          <p className="text-sm text-gray-500">{ENTREPRISE.ville}</p>
          <p className="text-sm text-gray-500">{ENTREPRISE.telephone}</p>
        </header>

        <div className="flex justify-between mb-1 text-sm">
          <span className="font-bold">Reçu n° {numero}</span>
          <span className="text-gray-500">
            {dateTexte} · {heureTexte}
          </span>
        </div>
        <p className="mb-6 text-sm text-gray-600">Véhicule : {vehicule}</p>

        <ul className="pb-4 mb-4 space-y-2 border-b border-dashed border-gray-300">
          {lignes.map((l, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>{l.nom}</span>
              <span>{fcfa(l.montant)}</span>
            </li>
          ))}
        </ul>

        {remise > 0 && (
          <>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span>{fcfa(sousTotal)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm text-gray-500">
              <span>Remise</span>
              <span>-{fcfa(remise)}</span>
            </div>
          </>
        )}

        <div className="flex justify-between text-lg font-bold">
          <span>Total payé</span>
          <span className="text-[#1F8A3B]">{fcfa(enc.montant)}</span>
        </div>
        <p className="mt-1 text-sm text-right text-gray-500">{mode}</p>

        <footer className="pt-6 mt-6 text-center border-t border-dashed border-gray-300">
          <p className="text-sm">Merci de votre visite et à bientôt !</p>
          {caissier?.nom_complet && (
            <p className="mt-1 text-xs text-gray-400">
              Encaissé par {caissier.nom_complet}
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}
