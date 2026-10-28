// src/lib/stock.ts
// Calculs de stock (purs, sans accès à la base).

export type Unite = "L" | "cl";

export type Produit = {
  id: string;
  nom: string;
  seuil_alerte: number | null;
  active: boolean;
};

export type Achat = {
  id: string;
  produit_id: string;
  achete_le: string; // AAAA-MM-JJ
  quantite: number;
  contenance: number;
  unite: Unite | string;
  prix_unitaire: number;
  lieu: string | null;
  created_at: string;
};

export type Sortie = {
  id: string;
  produit_id: string;
  quantite: number;
  contenance: number;
  unite: Unite | string;
  sortie_le: string;
};

// Contenance d'un flacon en cl (1 L = 100 cl)
export const enCl = (contenance: number, unite: string) =>
  Math.round(Number(contenance) * (unite === "L" ? 100 : 1) * 100) / 100;

// 100 -> "1 L", 150 -> "1,5 L", 50 -> "50 cl", 33 -> "33 cl"
export function libelleFormat(cl: number): string {
  if (cl >= 100) return `${(cl / 100).toLocaleString("fr-FR")} L`;
  return `${cl.toLocaleString("fr-FR")} cl`;
}

// Volume lisible : 250 cl -> "2,5 L"
export const libelleVolume = (cl: number) =>
  `${(Math.round(cl) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} L`;

export type FormatStock = {
  cl: number; // contenance d'un flacon
  restant: number; // flacons restants
  contenance: number; // valeur à réutiliser pour une sortie
  unite: string;
};

export type EtatProduit = {
  produit: Produit;
  formats: FormatStock[]; // formats avec du stock (ou déjà achetés)
  flacons: number; // total flacons restants
  volumeCl: number; // volume total restant
  enAlerte: boolean;
  dernierAchat: Achat | null;
  meilleurPrixLitre: { prix: number; lieu: string | null } | null;
};

// Prix au litre d'un achat (FCFA)
export const prixAuLitre = (a: Achat) =>
  Math.round(a.prix_unitaire / (enCl(a.contenance, a.unite) / 100));

export function etatProduit(produit: Produit, achats: Achat[], sorties: Sortie[]): EtatProduit {
  const mesAchats = achats.filter((a) => a.produit_id === produit.id);
  const mesSorties = sorties.filter((s) => s.produit_id === produit.id);

  const parFormat = new Map<number, FormatStock>();
  for (const a of mesAchats) {
    const cl = enCl(a.contenance, a.unite);
    const f = parFormat.get(cl) ?? { cl, restant: 0, contenance: a.contenance, unite: a.unite };
    f.restant += a.quantite;
    parFormat.set(cl, f);
  }
  for (const s of mesSorties) {
    const cl = enCl(s.contenance, s.unite);
    const f = parFormat.get(cl);
    if (f) f.restant -= s.quantite;
  }

  const formats = [...parFormat.values()].sort((a, b) => b.cl - a.cl);
  const flacons = formats.reduce((s, f) => s + Math.max(0, f.restant), 0);
  const volumeCl = formats.reduce((s, f) => s + Math.max(0, f.restant) * f.cl, 0);

  const dernierAchat =
    [...mesAchats].sort(
      (a, b) => b.achete_le.localeCompare(a.achete_le) || b.created_at.localeCompare(a.created_at)
    )[0] ?? null;

  const meilleur = mesAchats.reduce<Achat | null>(
    (m, a) => (!m || prixAuLitre(a) < prixAuLitre(m) ? a : m),
    null
  );

  return {
    produit,
    formats,
    flacons,
    volumeCl,
    enAlerte: produit.seuil_alerte != null && flacons <= produit.seuil_alerte,
    dernierAchat,
    meilleurPrixLitre: meilleur ? { prix: prixAuLitre(meilleur), lieu: meilleur.lieu } : null,
  };
}

// Dépenses d'achats sur une période (achete_le >= debut, format AAAA-MM-JJ)
export const depenses = (achats: Achat[], debut: string) =>
  achats
    .filter((a) => a.achete_le >= debut)
    .reduce((s, a) => s + a.quantite * a.prix_unitaire, 0);
