// src/lib/compta.ts
// Calculs de compta (purs, sans accès à la base). Dates au format AAAA-MM-JJ.

export const CATEGORIES_DEPENSES: Record<string, string> = {
  produits: "Produits d'entretien", // automatique (achats du stock)
  salaires: "Salaires",
  eau: "Eau",
  electricite: "Électricité",
  loyer: "Loyer",
  carburant: "Carburant",
  materiel: "Matériel",
  entretien: "Entretien / réparations",
  taxes: "Taxes et impôts",
  autre: "Autre",
};

export type Mouvement = {
  id: string;
  date: string; // AAAA-MM-JJ
  type: "entree" | "depense";
  categorie: string; // "lavages" pour les entrées
  libelle: string;
  montant: number; // toujours positif
  mode: string | null;
  source: "encaissement" | "achat" | "depense";
  lien: string | null; // reçu, page stock...
};

// --- Dates -------------------------------------------------------------

export const versIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Timestamp -> date locale (heure du navigateur)
export const dateLocale = (horodatage: string) => versIso(new Date(horodatage));

const depuisIso = (iso: string) => {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
};

const ajouterJours = (iso: string, n: number) => {
  const d = depuisIso(iso);
  d.setDate(d.getDate() + n);
  return versIso(d);
};

export const nbJours = (debut: string, fin: string) =>
  Math.round((depuisIso(fin).getTime() - depuisIso(debut).getTime()) / 86400000) + 1;

export type TypePeriode = "jour" | "semaine" | "mois" | "annee" | "perso";
export type Periode = { debut: string; fin: string };

export function periodeCourante(type: Exclude<TypePeriode, "perso">, aujourdhui = new Date()): Periode {
  const auj = versIso(aujourdhui);
  if (type === "jour") return { debut: auj, fin: auj };
  if (type === "semaine") {
    const jour = aujourdhui.getDay(); // 0 = dimanche
    const debut = ajouterJours(auj, -(jour === 0 ? 6 : jour - 1));
    return { debut, fin: ajouterJours(debut, 6) };
  }
  if (type === "mois") {
    const a = aujourdhui.getFullYear(), m = aujourdhui.getMonth();
    return { debut: versIso(new Date(a, m, 1)), fin: versIso(new Date(a, m + 1, 0)) };
  }
  const a = aujourdhui.getFullYear();
  return { debut: `${a}-01-01`, fin: `${a}-12-31` };
}

// Période précédente de même nature (mois précédent pour un mois, etc.)
export function periodePrecedente(type: TypePeriode, p: Periode): Periode {
  if (type === "mois") {
    const d = depuisIso(p.debut);
    return {
      debut: versIso(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
      fin: versIso(new Date(d.getFullYear(), d.getMonth(), 0)),
    };
  }
  if (type === "annee") {
    const a = Number(p.debut.slice(0, 4)) - 1;
    return { debut: `${a}-01-01`, fin: `${a}-12-31` };
  }
  const n = nbJours(p.debut, p.fin);
  return { debut: ajouterJours(p.debut, -n), fin: ajouterJours(p.debut, -1) };
}

export const dansPeriode = (m: Mouvement, p: Periode) => m.date >= p.debut && m.date <= p.fin;

// --- Totaux ------------------------------------------------------------

export function totaux(mouvements: Mouvement[]) {
  const entrees = mouvements.filter((m) => m.type === "entree").reduce((s, m) => s + m.montant, 0);
  const depenses = mouvements.filter((m) => m.type === "depense").reduce((s, m) => s + m.montant, 0);
  return { entrees, depenses, benefice: entrees - depenses };
}

export function parCle(mouvements: Mouvement[], cle: (m: Mouvement) => string) {
  const map = new Map<string, number>();
  for (const m of mouvements) map.set(cle(m), (map.get(cle(m)) ?? 0) + m.montant);
  return [...map.entries()].map(([k, v]) => ({ cle: k, montant: v })).sort((a, b) => b.montant - a.montant);
}

// --- Évolution (graphique) --------------------------------------------
// Par jour jusqu'à 62 jours, sinon par mois.

export type Tranche = { cle: string; libelle: string; entrees: number; depenses: number };

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function evolution(mouvements: Mouvement[], p: Periode): Tranche[] {
  const parJour = nbJours(p.debut, p.fin) <= 62;
  const tranches: Tranche[] = [];

  if (parJour) {
    for (let d = p.debut; d <= p.fin; d = ajouterJours(d, 1)) {
      const dt = depuisIso(d);
      tranches.push({ cle: d, libelle: `${dt.getDate()} ${MOIS_COURTS[dt.getMonth()]}`, entrees: 0, depenses: 0 });
    }
  } else {
    let d = depuisIso(p.debut);
    d = new Date(d.getFullYear(), d.getMonth(), 1);
    while (versIso(d) <= p.fin) {
      tranches.push({
        cle: versIso(d).slice(0, 7),
        libelle: `${MOIS_COURTS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        entrees: 0,
        depenses: 0,
      });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
  }

  const index = new Map(tranches.map((t) => [t.cle, t]));
  for (const m of mouvements) {
    if (!dansPeriode(m, p)) continue;
    const t = index.get(parJour ? m.date : m.date.slice(0, 7));
    if (!t) continue;
    if (m.type === "entree") t.entrees += m.montant;
    else t.depenses += m.montant;
  }
  return tranches;
}

// --- Export CSV (Excel, séparateur ;) ----------------------------------

export function versCsv(mouvements: Mouvement[], libelleCategorie: (c: string) => string, libelleMode: (m: string | null) => string) {
  const echapper = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lignes = [
    ["Date", "Type", "Catégorie", "Libellé", "Montant (FCFA)", "Mode de paiement"].join(";"),
    ...mouvements.map((m) =>
      [
        m.date.split("-").reverse().join("/"),
        m.type === "entree" ? "Entrée" : "Dépense",
        libelleCategorie(m.categorie),
        m.libelle,
        String(m.type === "entree" ? m.montant : -m.montant),
        libelleMode(m.mode),
      ]
        .map(echapper)
        .join(";")
    ),
  ];
  // BOM pour qu'Excel lise correctement les accents
  return "﻿" + lignes.join("\r\n");
}
