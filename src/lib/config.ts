// src/lib/config.ts

// Numéro WhatsApp de Mandji Auto Clean (241 + numéro, sans + ni espaces)
export const WHATSAPP_NUMBER = "24174277124";

// Infos affichées sur les reçus
export const ENTREPRISE = {
  nom: "Mandji Auto Clean",
  ville: "Port-Gentil, Gabon",
  telephone: "+241 74 27 71 24",
};

// Libellés des modes de paiement
export const MODES_PAIEMENT: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  carte: "Carte",
  virement: "Virement",
};

export const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

// Numéro de reçu sur 6 chiffres : 12 -> "000012"
export const formatNumeroRecu = (n: number | null) =>
  n == null ? "—" : String(n).padStart(6, "0");

// ---------------------------------------------------------------------
//  Téléphones internationaux (envoi des reçus sur WhatsApp)
// ---------------------------------------------------------------------

export type Pays = {
  code: string; // code ISO (sert aussi au drapeau)
  nom: string;
  indicatif: string; // sans le +
  // true si le 0 initial fait partie du numéro (ex : Gabon 06 14 08 07
  // -> +241 06 14 08 07). Ailleurs, il est retiré (France 06... -> +33 6...).
  garderZero?: boolean;
};

export const PAYS: Pays[] = [
  { code: "GA", nom: "Gabon", indicatif: "241", garderZero: true },
  // Afrique centrale et de l'Ouest
  { code: "CM", nom: "Cameroun", indicatif: "237" },
  { code: "CG", nom: "Congo", indicatif: "242", garderZero: true },
  { code: "CD", nom: "RD Congo", indicatif: "243" },
  { code: "GQ", nom: "Guinée équatoriale", indicatif: "240" },
  { code: "ST", nom: "Sao Tomé-et-Principe", indicatif: "239" },
  { code: "TD", nom: "Tchad", indicatif: "235" },
  { code: "CF", nom: "Centrafrique", indicatif: "236" },
  { code: "CI", nom: "Côte d'Ivoire", indicatif: "225", garderZero: true },
  { code: "SN", nom: "Sénégal", indicatif: "221" },
  { code: "BJ", nom: "Bénin", indicatif: "229" },
  { code: "TG", nom: "Togo", indicatif: "228" },
  { code: "BF", nom: "Burkina Faso", indicatif: "226" },
  { code: "ML", nom: "Mali", indicatif: "223" },
  { code: "GN", nom: "Guinée", indicatif: "224" },
  { code: "NG", nom: "Nigeria", indicatif: "234" },
  { code: "MA", nom: "Maroc", indicatif: "212" },
  { code: "ZA", nom: "Afrique du Sud", indicatif: "27" },
  // Europe
  { code: "FR", nom: "France", indicatif: "33" },
  { code: "BE", nom: "Belgique", indicatif: "32" },
  { code: "CH", nom: "Suisse", indicatif: "41" },
  { code: "GB", nom: "Royaume-Uni", indicatif: "44" },
  { code: "DE", nom: "Allemagne", indicatif: "49" },
  { code: "ES", nom: "Espagne", indicatif: "34" },
  { code: "PT", nom: "Portugal", indicatif: "351" },
  { code: "IT", nom: "Italie", indicatif: "39", garderZero: true },
  { code: "NL", nom: "Pays-Bas", indicatif: "31" },
  // Amériques, Asie, Moyen-Orient
  { code: "US", nom: "États-Unis / Canada", indicatif: "1" },
  { code: "BR", nom: "Brésil", indicatif: "55" },
  { code: "CN", nom: "Chine", indicatif: "86" },
  { code: "LB", nom: "Liban", indicatif: "961" },
  { code: "AE", nom: "Émirats arabes unis", indicatif: "971" },
];

export const PAYS_DEFAUT = "GA";

// "FR" -> 🇫🇷
export const drapeau = (code: string) =>
  String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

// Construit le numéro international (chiffres seuls, pour wa.me).
// - Saisie commençant par + ou 00 : utilisée telle quelle (le pays choisi
//   est ignoré), ce qui couvre aussi les pays absents de la liste.
// - Sinon : indicatif du pays choisi + numéro local.
export function numeroWhatsApp(saisie: string, codePays: string): string | null {
  const brut = saisie.trim();
  let chiffres = brut.replace(/\D/g, "");

  if (brut.startsWith("+") || chiffres.startsWith("00")) {
    if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
    // Cas particulier : +241 sans le 0 (ex : +241 6 14 08 07)
    if (chiffres.startsWith("241") && chiffres[3] !== "0") {
      chiffres = "2410" + chiffres.slice(3);
    }
    return chiffres.length >= 8 && chiffres.length <= 15 ? chiffres : null;
  }

  const pays = PAYS.find((p) => p.code === codePays) ?? PAYS[0];

  // Numéro local tapé avec l'indicatif mais sans le + (ex : 241 06 14 08 07)
  if (chiffres.startsWith(pays.indicatif) && chiffres.length > 9) {
    chiffres = chiffres.slice(pays.indicatif.length);
  }

  if (pays.garderZero) {
    if (!chiffres.startsWith("0")) chiffres = "0" + chiffres;
  } else {
    chiffres = chiffres.replace(/^0+/, "");
  }

  const total = pays.indicatif + chiffres;
  if (chiffres.length < 6 || total.length > 15) return null;
  return total;
}

// Retrouve le pays et le numéro local à partir d'un numéro enregistré
// (ex : "33612345678" -> { codePays: "FR", local: "612345678" }).
export function decomposerNumero(international: string): {
  codePays: string;
  local: string;
} {
  const chiffres = international.replace(/\D/g, "");
  if (!chiffres) return { codePays: PAYS_DEFAUT, local: "" };

  // Indicatif le plus long d'abord (ex : 351 avant 35)
  const pays = [...PAYS]
    .sort((a, b) => b.indicatif.length - a.indicatif.length)
    .find((p) => chiffres.startsWith(p.indicatif));

  if (!pays) return { codePays: PAYS_DEFAUT, local: "+" + chiffres };
  return { codePays: pays.code, local: chiffres.slice(pays.indicatif.length) };
}

// Affichage lisible : "24106140807" -> "+241 06 14 08 07"
export function formaterInternational(international: string): string {
  const { codePays, local } = decomposerNumero(international);
  if (local.startsWith("+")) return local;
  const pays = PAYS.find((p) => p.code === codePays)!;
  // Groupes de 2 en partant de la fin : 612345678 -> 6 12 34 56 78
  const groupes = local.replace(/\B(?=(\d{2})+$)/g, " ");
  return `+${pays.indicatif} ${groupes}`;
}
