// src/app/(dashboard)/dashboard/stock/stock.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { fcfa } from "@/lib/config";
import {
  type Achat,
  type EtatProduit,
  type Produit,
  type Sortie,
  depenses,
  enCl,
  etatProduit,
  libelleFormat,
  libelleVolume,
  prixAuLitre,
} from "@/lib/stock";
import FormulaireAchat from "./formulaire-achat";

const bouton =
  "px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50";
const boutonVert =
  "px-4 py-2 text-sm font-medium text-white rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50";

const dateCourte = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function Stock({
  produits,
  achats,
  sorties,
}: {
  produits: Produit[];
  achats: Achat[];
  sorties: Sortie[];
}) {
  const router = useRouter();
  const supabase = creerClientNavigateur();

  const [achatPour, setAchatPour] = useState<string | null | undefined>(undefined); // undefined = fermé
  const [ajoutProduit, setAjoutProduit] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [derniereSortie, setDerniereSortie] = useState<{ id: string; texte: string } | null>(null);
  const [voirMasques, setVoirMasques] = useState(false);

  const etats = produits.map((p) => etatProduit(p, achats, sorties));
  const actifs = etats.filter((e) => e.produit.active);
  const masques = etats.filter((e) => !e.produit.active);
  const alertes = actifs.filter((e) => e.enAlerte);

  const maintenant = new Date();
  const debutMois = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-01`;
  const depensesMois = depenses(achats, debutMois);
  const lieuxConnus = [...new Set(achats.map((a) => a.lieu).filter(Boolean))] as string[];

  const rafraichir = () => router.refresh();

  // --- Actions -------------------------------------------------------

  const flaconTermine = async (e: EtatProduit, cl: number) => {
    const format = e.formats.find((f) => f.cl === cl)!;
    setChargement(`${e.produit.id}-${cl}`);
    setErreur("");
    const { data, error } = await supabase
      .from("sorties_stock")
      .insert({
        produit_id: e.produit.id,
        quantite: 1,
        contenance: format.contenance,
        unite: format.unite,
      })
      .select("id")
      .single();
    setChargement(null);
    if (error) return setErreur(error.message);
    setDerniereSortie({
      id: data.id,
      texte: `1 flacon de ${libelleFormat(cl)} de « ${e.produit.nom} » retiré du stock.`,
    });
    rafraichir();
  };

  const annulerSortie = async () => {
    if (!derniereSortie) return;
    await supabase.from("sorties_stock").delete().eq("id", derniereSortie.id);
    setDerniereSortie(null);
    rafraichir();
  };

  const ajouterProduit = async () => {
    const nom = nouveauNom.trim();
    if (!nom) return;
    setChargement("nouveau");
    const { error } = await supabase.from("produits").insert({ nom });
    setChargement(null);
    if (error) {
      return setErreur(
        error.code === "23505" ? "Ce produit existe déjà." : "Erreur : " + error.message
      );
    }
    setNouveauNom("");
    setAjoutProduit(false);
    rafraichir();
  };

  const modifierProduit = async (id: string, valeurs: Partial<Produit>) => {
    setChargement(id);
    const { error } = await supabase.from("produits").update(valeurs).eq("id", id);
    setChargement(null);
    if (error) {
      return setErreur(
        error.code === "23505" ? "Ce nom est déjà utilisé." : "Erreur : " + error.message
      );
    }
    rafraichir();
  };

  const supprimerAchat = async (a: Achat) => {
    setChargement(a.id);
    const { error } = await supabase.from("achats_stock").delete().eq("id", a.id);
    setChargement(null);
    if (error) return setErreur("Erreur : " + error.message);
    rafraichir();
  };

  // --- Affichage -----------------------------------------------------

  const carte = (e: EtatProduit) => {
    const p = e.produit;
    const mesAchats = achats.filter((a) => a.produit_id === p.id);
    const mesSorties = sorties.filter((s) => s.produit_id === p.id);
    const estOuvert = ouvert === p.id;

    return (
      <div
        key={p.id}
        className={`p-5 border rounded-xl ${
          e.enAlerte ? "border-orange-300 bg-orange-50" : "border-gray-200"
        } ${p.active ? "" : "opacity-60"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {p.nom}
              {e.enAlerte && (
                <span className="px-2 py-0.5 ml-2 text-xs font-medium text-white bg-orange-500 rounded-full align-middle">
                  À racheter
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              <span className="text-2xl font-bold text-[#1F8A3B]">{e.flacons}</span> flacon
              {e.flacons > 1 ? "s" : ""}
              {e.flacons > 0 && <> · {libelleVolume(e.volumeCl)}</>}
            </p>
          </div>
          <button onClick={() => setAchatPour(p.id)} className={boutonVert}>
            + Achat
          </button>
        </div>

        {/* Formats en stock + flacon terminé */}
        {e.formats.some((f) => f.restant > 0) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {e.formats
              .filter((f) => f.restant > 0)
              .map((f) => (
                <div
                  key={f.cl}
                  className="flex items-center gap-2 py-1 pl-3 pr-1 text-sm bg-white border border-gray-200 rounded-full"
                >
                  <span>
                    <strong>{f.restant}</strong> × {libelleFormat(f.cl)}
                  </span>
                  <button
                    onClick={() => flaconTermine(e, f.cl)}
                    disabled={chargement === `${p.id}-${f.cl}`}
                    className="px-3 py-1 text-xs text-white rounded-full bg-[#23B5D3] hover:bg-[#1a91ab] disabled:opacity-50"
                  >
                    {chargement === `${p.id}-${f.cl}` ? "..." : "1 terminé"}
                  </button>
                </div>
              ))}
          </div>
        )}

        {e.meilleurPrixLitre && (
          <p className="mt-3 text-xs text-gray-500">
            Meilleur prix payé : {fcfa(e.meilleurPrixLitre.prix)} le litre
            {e.meilleurPrixLitre.lieu && <> ({e.meilleurPrixLitre.lieu})</>}
          </p>
        )}

        <button
          onClick={() => setOuvert(estOuvert ? null : p.id)}
          className="mt-3 text-sm text-gray-500 hover:text-[#1F8A3B]"
        >
          {estOuvert ? "▾ Masquer les détails" : "▸ Détails, historique et réglages"}
        </button>

        {estOuvert && (
          <div className="pt-4 mt-3 space-y-5 border-t border-gray-200">
            <Reglages
              produit={p}
              enCours={chargement === p.id}
              onEnregistrer={(v) => modifierProduit(p.id, v)}
            />

            <div>
              <p className="mb-2 text-sm font-medium">Achats ({mesAchats.length})</p>
              {mesAchats.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun achat enregistré.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 pr-3 font-normal">Date</th>
                        <th className="py-1 pr-3 font-normal">Quantité</th>
                        <th className="py-1 pr-3 font-normal text-right">Prix flacon</th>
                        <th className="py-1 pr-3 font-normal text-right">Total</th>
                        <th className="py-1 pr-3 font-normal text-right">Au litre</th>
                        <th className="py-1 pr-3 font-normal">Lieu</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {mesAchats.map((a) => (
                        <tr key={a.id} className="border-t border-gray-100">
                          <td className="py-2 pr-3 whitespace-nowrap">{dateCourte(a.achete_le)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {a.quantite} × {libelleFormat(enCl(a.contenance, a.unite))}
                          </td>
                          <td className="py-2 pr-3 text-right whitespace-nowrap">{fcfa(a.prix_unitaire)}</td>
                          <td className="py-2 pr-3 font-medium text-right whitespace-nowrap">
                            {fcfa(a.quantite * a.prix_unitaire)}
                          </td>
                          <td className="py-2 pr-3 text-right text-gray-500 whitespace-nowrap">
                            {fcfa(prixAuLitre(a))}
                          </td>
                          <td className="py-2 pr-3 text-gray-500">{a.lieu ?? "—"}</td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => supprimerAchat(a)}
                              disabled={chargement === a.id}
                              title="Supprimer cet achat (erreur de saisie)"
                              className="text-xs text-gray-400 hover:text-red-600"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Flacons terminés ({mesSorties.length})</p>
              {mesSorties.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-1 text-sm text-gray-600">
                  {mesSorties.slice(0, 15).map((s) => (
                    <li key={s.id}>
                      {dateCourte(s.sortie_le)} · {s.quantite} × {libelleFormat(enCl(s.contenance, s.unite))}
                    </li>
                  ))}
                  {mesSorties.length > 15 && (
                    <li className="text-gray-400">… et {mesSorties.length - 15} plus anciens</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="max-w-4xl px-6 py-10 mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Stock produits</h1>
        <div className="flex gap-2">
          <button onClick={() => setAjoutProduit(true)} className={bouton}>
            + Produit
          </button>
          <button onClick={() => setAchatPour(null)} className={boutonVert}>
            + Achat
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid gap-4 mb-8 sm:grid-cols-2">
        <div className="p-5 text-center border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-500">Dépenses produits ce mois</p>
          <p className="text-2xl font-bold text-[#1F8A3B]">{fcfa(depensesMois)}</p>
        </div>
        <div
          className={`p-5 text-center border rounded-xl ${
            alertes.length ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <p className="text-sm text-gray-500">Produits à racheter</p>
          <p className={`text-2xl font-bold ${alertes.length ? "text-orange-600" : "text-gray-400"}`}>
            {alertes.length}
          </p>
          {alertes.length > 0 && (
            <p className="text-xs text-orange-700">{alertes.map((a) => a.produit.nom).join(", ")}</p>
          )}
        </div>
      </div>

      {erreur && (
        <p className="p-3 mb-6 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
          {erreur}
        </p>
      )}

      {derniereSortie && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-6 text-sm border rounded-lg border-[#23B5D3] bg-cyan-50">
          <span>{derniereSortie.texte}</span>
          <div className="flex gap-3">
            <button onClick={annulerSortie} className="font-medium text-[#1a91ab] hover:underline">
              Annuler
            </button>
            <button onClick={() => setDerniereSortie(null)} className="text-gray-400">
              ✕
            </button>
          </div>
        </div>
      )}

      {ajoutProduit && (
        <div className="flex flex-wrap gap-3 p-5 mb-8 border border-gray-200 rounded-xl bg-gray-50">
          <input
            type="text"
            placeholder="Nom du produit (ex : Cire carrosserie)"
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouterProduit()}
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
          />
          <button onClick={ajouterProduit} disabled={chargement === "nouveau"} className={boutonVert}>
            Ajouter
          </button>
          <button
            onClick={() => {
              setAjoutProduit(false);
              setNouveauNom("");
            }}
            className={bouton}
          >
            Annuler
          </button>
        </div>
      )}

      {achatPour !== undefined && (
        <FormulaireAchat
          key={achatPour ?? "general"}
          produits={actifs.map((e) => e.produit)}
          produitInitial={achatPour}
          lieuxConnus={lieuxConnus}
          onAnnuler={() => setAchatPour(undefined)}
          onTermine={() => {
            setAchatPour(undefined);
            rafraichir();
          }}
        />
      )}

      <div className="space-y-4">{actifs.map(carte)}</div>

      {masques.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setVoirMasques(!voirMasques)}
            className="text-sm text-gray-500 hover:text-[#1F8A3B]"
          >
            {voirMasques ? "▾" : "▸"} Produits masqués ({masques.length})
          </button>
          {voirMasques && <div className="mt-4 space-y-4">{masques.map(carte)}</div>}
        </div>
      )}
    </main>
  );
}

// Nom, seuil d'alerte, masquer/afficher
function Reglages({
  produit,
  enCours,
  onEnregistrer,
}: {
  produit: Produit;
  enCours: boolean;
  onEnregistrer: (v: Partial<Produit>) => void;
}) {
  const [nom, setNom] = useState(produit.nom);
  const [seuil, setSeuil] = useState(produit.seuil_alerte?.toString() ?? "");

  const seuilNombre = seuil.trim() === "" ? null : Number(seuil);
  const valide = nom.trim() !== "" && (seuilNombre === null || (Number.isInteger(seuilNombre) && seuilNombre >= 0));
  const modifie = nom.trim() !== produit.nom || seuilNombre !== produit.seuil_alerte;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        Nom
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="block px-3 py-2 mt-1 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
        />
      </label>
      <label className="text-sm">
        Alerte quand il reste ≤
        <span className="flex items-center gap-2 mt-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="—"
            value={seuil}
            onChange={(e) => setSeuil(e.target.value)}
            className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
          />
          flacon(s)
        </span>
      </label>
      <button
        onClick={() => onEnregistrer({ nom: nom.trim(), seuil_alerte: seuilNombre })}
        disabled={!valide || !modifie || enCours}
        className={boutonVert}
      >
        Enregistrer
      </button>
      <button
        onClick={() => onEnregistrer({ active: !produit.active })}
        disabled={enCours}
        className={bouton}
      >
        {produit.active ? "Masquer le produit" : "Réafficher"}
      </button>
    </div>
  );
}
