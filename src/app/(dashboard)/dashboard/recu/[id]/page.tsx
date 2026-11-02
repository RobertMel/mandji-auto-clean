// src/app/(dashboard)/dashboard/recu/[id]/page.tsx
import { notFound } from "next/navigation";
import { exigerGestionnaire } from "@/lib/session";
import {
  ENTREPRISE,
  MODES_PAIEMENT,
  dateCourteFr,
  fcfa,
  formatNumeroRecu,
  libelleLaveur,
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
  mode_paiement: string | null;
  paye_le: string | null;
  statut: string;
  echeance: string | null;
  encaisse_par: string | null;
  reservation: {
    id: string;
    notes: string | null;
    vehicule_marque: string | null;
    vehicule_couleur: string | null;
    vehicule_immatriculation: string | null;
    telephone_client: string | null;
    fin_lavage: string | null;
    laveur_id: string | null;
    client: { nom: string; prenom: string | null; entreprise: boolean; telephone: string | null } | null;
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
      `id, numero_recu, montant, mode_paiement, paye_le, statut, echeance, encaisse_par,
       reservation:reservations (
         id, notes, vehicule_marque, vehicule_couleur, vehicule_immatriculation, telephone_client,
         fin_lavage, laveur_id, client:clients ( nom, prenom, entreprise, telephone ),
         reservation_prestations ( prix_applique, quantite, prestation:prestations ( nom ) )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const enc = data as unknown as EncaissementDetaille;

  const resa = enc.reservation;
  const ids = [enc.encaisse_par, resa?.laveur_id].filter((x): x is string => !!x);
  const { data: personnes } = ids.length
    ? await supabase.from("profils").select("id, nom_complet, surnom").in("id", ids)
    : { data: [] as { id: string; nom_complet: string; surnom: string | null }[] };
  const caissier = (personnes ?? []).find((p) => p.id === enc.encaisse_par) ?? null;
  const laveur = (personnes ?? []).find((p) => p.id === resa?.laveur_id) ?? null;

  const payee = enc.statut === "paye";
  const client = resa?.client && resa.client.nom !== "Sans nom" ? resa.client : null;
  const nomClient = client ? [client.prenom, client.nom].filter(Boolean).join(" ") : null;
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

  // Payée : date du paiement. À régler : date du lavage.
  const date = new Date(enc.paye_le ?? resa?.fin_lavage ?? `${enc.echeance}T12:00:00`);
  const dateTexte = date.toLocaleDateString("fr-FR");
  const heureTexte = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const numero = formatNumeroRecu(enc.numero_recu);
  const mode = enc.mode_paiement ? (MODES_PAIEMENT[enc.mode_paiement] ?? enc.mode_paiement) : null;
  const echeance = enc.echeance ? dateCourteFr(enc.echeance) : null;

  // Message « facture » pour WhatsApp
  const texteWhatsApp = [
    `*${ENTREPRISE.nom}* — Facture n° ${numero}`,
    `${dateTexte} à ${heureTexte}`,
    "",
    ...(nomClient ? [`Client : ${nomClient}`] : []),
    `Véhicule : ${vehicule}`,
    "",
    ...lignes.map((l) => `• ${l.nom} : ${fcfa(l.montant)}`),
    ...(remise > 0 ? [`Remise : -${fcfa(remise)}`] : []),
    "",
    payee
      ? `*Total payé : ${fcfa(enc.montant)}* (${mode}) ✅`
      : `*Montant à régler : ${fcfa(enc.montant)}*${echeance ? ` avant le ${echeance}` : ""}`,
    "",
    payee ? "Merci pour votre confiance et à bientôt !" : "Merci pour votre confiance.",
    `${ENTREPRISE.nom} · ${ENTREPRISE.ville} · ${ENTREPRISE.telephone}`,
  ].join("\n");

  return (
    <main className="max-w-md px-6 py-10 mx-auto print:py-0">
      <ActionsRecu
        reservationId={resa?.id ?? null}
        telephoneInitial={resa?.telephone_client ?? client?.telephone ?? ""}
        texte={texteWhatsApp}
        resume={`facture n° ${numero}, ${fcfa(enc.montant)}`}
        encaissementId={enc.id}
        aRegler={!payee}
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
          <span className="font-bold">Facture n° {numero}</span>
          <span className="text-gray-500">
            {dateTexte} · {heureTexte}
          </span>
        </div>
        <p className="mb-3">
          {payee ? (
            <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">
              Payée
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
              À régler{echeance && ` avant le ${echeance}`}
            </span>
          )}
        </p>
        {nomClient && (
          <p className="text-sm text-gray-600">
            Client : {nomClient}
            {client?.entreprise && " (entreprise)"}
          </p>
        )}
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
          <span>{payee ? "Total payé" : "Montant à régler"}</span>
          <span className={payee ? "text-[#1F8A3B]" : "text-orange-600"}>{fcfa(enc.montant)}</span>
        </div>
        {payee && <p className="mt-1 text-sm text-right text-gray-500">{mode}</p>}

        <footer className="pt-6 mt-6 text-center border-t border-dashed border-gray-300">
          <p className="text-sm">Merci pour votre confiance et à bientôt !</p>
          {laveur && (
            <p className="mt-1 text-xs text-gray-400">Lavé par {libelleLaveur(laveur)}</p>
          )}
          {caissier?.nom_complet && (
            <p className="mt-1 text-xs text-gray-400">
              {payee ? "Encaissé" : "Facturé"} par {caissier.nom_complet}
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}
