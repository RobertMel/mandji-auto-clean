// src/app/(dashboard)/dashboard/compta/compta.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { MODES_PAIEMENT, fcfa, formatNumeroRecu } from "@/lib/config";
import { enCl, libelleFormat } from "@/lib/stock";
import {
  CATEGORIES_DEPENSES,
  type Mouvement,
  type Periode,
  type TypePeriode,
  dansPeriode,
  dateLocale,
  evolution,
  parCle,
  periodeCourante,
  periodePrecedente,
  totaux,
  versCsv,
  versIso,
} from "@/lib/compta";
import Graphique, { COULEUR_DEPENSES } from "./graphique";
import FormulaireDepense from "./formulaire-depense";

export type DonneesBrutes = {
  encaissements: {
    id: string;
    numero_recu: number | null;
    montant: number;
    mode_paiement: string;
    paye_le: string;
    reservation: { notes: string | null } | null;
  }[];
  achats: {
    id: string;
    achete_le: string;
    quantite: number;
    contenance: number;
    unite: string;
    prix_unitaire: number;
    lieu: string | null;
    produit: { nom: string } | null;
  }[];
  depenses: {
    id: string;
    depense_le: string;
    categorie: string;
    libelle: string;
    montant: number;
    mode_paiement: string;
  }[];
};

const LIBELLES_PERIODES: Record<TypePeriode, string> = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois",
  annee: "Cette année",
  perso: "Période…",
};

const libelleCategorie = (c: string) =>
  c === "lavages" ? "Lavages" : CATEGORIES_DEPENSES[c] ?? c;
const libelleMode = (m: string | null) => (m ? MODES_PAIEMENT[m] ?? m : "");
const dateFr = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

// Regroupe les trois sources en une seule liste de mouvements
function construireMouvements(d: DonneesBrutes): Mouvement[] {
  return [
    ...d.encaissements.map<Mouvement>((e) => ({
      id: e.id,
      date: dateLocale(e.paye_le),
      type: "entree",
      categorie: "lavages",
      libelle: `Reçu n° ${formatNumeroRecu(e.numero_recu)}${e.reservation?.notes ? ` — ${e.reservation.notes}` : ""}`,
      montant: e.montant,
      mode: e.mode_paiement,
      source: "encaissement",
      lien: `/dashboard/recu/${e.id}`,
    })),
    ...d.achats.map<Mouvement>((a) => ({
      id: a.id,
      date: a.achete_le,
      type: "depense",
      categorie: "produits",
      libelle: `${a.produit?.nom ?? "Produit"} — ${a.quantite} × ${libelleFormat(enCl(a.contenance, a.unite))}${a.lieu ? ` (${a.lieu})` : ""}`,
      montant: a.quantite * a.prix_unitaire,
      mode: null,
      source: "achat",
      lien: "/dashboard/stock",
    })),
    ...d.depenses.map<Mouvement>((x) => ({
      id: x.id,
      date: x.depense_le,
      type: "depense",
      categorie: x.categorie,
      libelle: x.libelle,
      montant: x.montant,
      mode: x.mode_paiement,
      source: "depense",
      lien: null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

function Variation({ actuel, precedent, inverse = false }: { actuel: number; precedent: number; inverse?: boolean }) {
  if (precedent === 0 && actuel === 0) return null;
  const diff = actuel - precedent;
  if (precedent === 0) return <p className="text-xs text-gray-400">période précédente : 0</p>;
  const pct = Math.round((diff / Math.abs(precedent)) * 100);
  const bon = inverse ? diff <= 0 : diff >= 0;
  return (
    <p className={`text-xs ${bon ? "text-[#1F8A3B]" : "text-orange-600"}`}>
      {diff >= 0 ? "▲" : "▼"} {Math.abs(pct)} % vs période précédente
    </p>
  );
}

export default function Compta({ donnees }: { donnees: DonneesBrutes }) {
  const router = useRouter();
  const [type, setType] = useState<TypePeriode>("mois");
  const [perso, setPerso] = useState<Periode>(() => periodeCourante("mois"));
  const [filtre, setFiltre] = useState<"tout" | "entree" | "depense">("tout");
  const [ajout, setAjout] = useState(false);
  const [erreur, setErreur] = useState("");

  const mouvements = construireMouvements(donnees);
  const periode = type === "perso" ? perso : periodeCourante(type);
  const precedente = periodePrecedente(type, periode);

  const duPeriode = mouvements.filter((m) => dansPeriode(m, periode));
  const t = totaux(duPeriode);
  const tPrec = totaux(mouvements.filter((m) => dansPeriode(m, precedente)));
  const marge = t.entrees > 0 ? Math.round((t.benefice / t.entrees) * 100) : null;

  const depParCategorie = parCle(duPeriode.filter((m) => m.type === "depense"), (m) => m.categorie);
  const maxCat = Math.max(1, ...depParCategorie.map((c) => c.montant));
  const entParMode = parCle(duPeriode.filter((m) => m.type === "entree"), (m) => m.mode ?? "");

  const journal = duPeriode.filter((m) => filtre === "tout" || m.type === filtre);

  const exporter = () => {
    const blob = new Blob([versCsv(journal, libelleCategorie, libelleMode)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compta-mandji_${periode.debut}_${periode.fin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const supprimerDepense = async (m: Mouvement) => {
    if (!window.confirm(`Supprimer la dépense « ${m.libelle} » (${fcfa(m.montant)}) ?`)) return;
    const supabase = creerClientNavigateur();
    const { error } = await supabase.from("depenses").delete().eq("id", m.id);
    if (error) return setErreur("Erreur : " + error.message);
    router.refresh();
  };

  return (
    <main className="max-w-5xl px-6 py-10 mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Compta</h1>
        <button
          onClick={() => setAjout(true)}
          className="px-5 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
        >
          + Dépense
        </button>
      </div>

      {/* Période */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {(Object.keys(LIBELLES_PERIODES) as TypePeriode[]).map((p) => (
          <button
            key={p}
            onClick={() => setType(p)}
            className={`px-4 py-2 text-sm rounded-full transition ${
              type === p ? "bg-[#1F8A3B] text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {LIBELLES_PERIODES[p]}
          </button>
        ))}
      </div>
      {type === "perso" ? (
        <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
          du
          <input
            type="date"
            value={perso.debut}
            max={perso.fin}
            onChange={(e) => e.target.value && setPerso({ ...perso, debut: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          au
          <input
            type="date"
            value={perso.fin}
            min={perso.debut}
            onChange={(e) => e.target.value && setPerso({ ...perso, fin: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      ) : (
        <p className="mb-8 text-sm text-gray-500">
          {periode.debut === periode.fin
            ? dateFr(periode.debut)
            : `Du ${dateFr(periode.debut)} au ${dateFr(periode.fin)}`}
        </p>
      )}

      {ajout && (
        <FormulaireDepense
          onAnnuler={() => setAjout(false)}
          onTermine={() => {
            setAjout(false);
            router.refresh();
          }}
        />
      )}

      {erreur && (
        <p className="p-3 mb-6 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">{erreur}</p>
      )}

      {/* Chiffres clés */}
      <div className="grid gap-4 mb-10 sm:grid-cols-3">
        <div className="p-5 border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Entrées</p>
          <p className="text-2xl font-bold">{fcfa(t.entrees)}</p>
          <Variation actuel={t.entrees} precedent={tPrec.entrees} />
        </div>
        <div className="p-5 border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Dépenses</p>
          <p className="text-2xl font-bold">{fcfa(t.depenses)}</p>
          <Variation actuel={t.depenses} precedent={tPrec.depenses} inverse />
        </div>
        <div className={`p-5 border rounded-xl ${t.benefice >= 0 ? "border-[#1F8A3B] bg-green-50" : "border-orange-300 bg-orange-50"}`}>
          <p className="text-sm text-gray-500">{t.benefice >= 0 ? "Bénéfice" : "Perte"}</p>
          <p className={`text-3xl font-bold ${t.benefice >= 0 ? "text-[#1F8A3B]" : "text-orange-600"}`}>
            {fcfa(t.benefice)}
          </p>
          {marge !== null && <p className="text-xs text-gray-500">Marge : {marge} % des entrées</p>}
          <Variation actuel={t.benefice} precedent={tPrec.benefice} />
        </div>
      </div>

      {/* Évolution */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold">Évolution</h2>
        <Graphique tranches={evolution(mouvements, periode)} />
      </section>

      {/* Répartitions */}
      <div className="grid gap-8 mb-10 md:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-bold">Dépenses par catégorie</h2>
          {depParCategorie.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune dépense sur la période.</p>
          ) : (
            <div className="space-y-3">
              {depParCategorie.map((c) => (
                <div key={c.cle} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>{libelleCategorie(c.cle)}</span>
                    <span className="font-medium">
                      {fcfa(c.montant)}{" "}
                      <span className="text-gray-400">({Math.round((c.montant / t.depenses) * 100)} %)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden bg-gray-100 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.montant / maxCat) * 100}%`, background: COULEUR_DEPENSES }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Entrées par mode de paiement</h2>
          {entParMode.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune entrée sur la période.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {entParMode.map((m) => (
                <div key={m.cle} className="flex justify-between pb-2 border-b border-gray-100">
                  <span>{libelleMode(m.cle) || "—"}</span>
                  <span className="font-medium">{fcfa(m.montant)}</span>
                </div>
              ))}
              <p className="pt-1 text-xs text-gray-500">
                {duPeriode.filter((m) => m.type === "entree").length} lavage(s) encaissé(s)
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Journal */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold">Détail des mouvements</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["tout", "Tout"],
                ["entree", "Entrées"],
                ["depense", "Dépenses"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFiltre(v)}
                className={`px-3 py-1 text-sm rounded-full ${
                  filtre === v ? "bg-gray-800 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {l}
              </button>
            ))}
            <button
              onClick={exporter}
              disabled={journal.length === 0}
              className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
            >
              Exporter (Excel)
            </button>
          </div>
        </div>

        {journal.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun mouvement sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-3 font-normal">Date</th>
                  <th className="py-2 pr-3 font-normal">Catégorie</th>
                  <th className="py-2 pr-3 font-normal">Libellé</th>
                  <th className="py-2 pr-3 font-normal text-right">Montant</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {journal.map((m) => (
                  <tr key={`${m.source}-${m.id}`} className="border-t border-gray-100">
                    <td className="py-2 pr-3 whitespace-nowrap">{dateFr(m.date)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-600">{libelleCategorie(m.categorie)}</td>
                    <td className="py-2 pr-3">
                      {m.lien ? (
                        <Link href={m.lien} className="hover:text-[#1F8A3B]">{m.libelle}</Link>
                      ) : (
                        m.libelle
                      )}
                      {m.mode && <span className="ml-2 text-xs text-gray-400">{libelleMode(m.mode)}</span>}
                    </td>
                    <td
                      className={`py-2 pr-3 font-medium text-right whitespace-nowrap ${
                        m.type === "entree" ? "text-[#1F8A3B]" : "text-gray-900"
                      }`}
                    >
                      {m.type === "entree" ? "+" : "−"} {fcfa(m.montant)}
                    </td>
                    <td className="py-2 text-right">
                      {m.source === "depense" && (
                        <button
                          onClick={() => supprimerDepense(m)}
                          className="text-xs text-gray-400 hover:text-red-600"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-gray-400">
        Entrées = encaissements des lavages. Dépenses = achats de produits (onglet Stock) + dépenses saisies ici.
        Calcul au {dateFr(versIso(new Date()))}.
      </p>
    </main>
  );
}
