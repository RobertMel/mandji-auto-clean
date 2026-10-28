// src/app/(dashboard)/champ-telephone.tsx
"use client";

import { PAYS, drapeau, formaterInternational, numeroWhatsApp } from "@/lib/config";

// Champ « pays + numéro » réutilisable (reçu, enregistrement véhicule...).
// Le parent garde l'état ; le numéro international se calcule avec
// numeroWhatsApp(telephone, codePays).
export default function ChampTelephone({
  telephone,
  setTelephone,
  codePays,
  setCodePays,
  onEntree,
  placeholder,
}: {
  telephone: string;
  setTelephone: (v: string) => void;
  codePays: string;
  setCodePays: (v: string) => void;
  onEntree?: () => void;
  placeholder?: string;
}) {
  const numero = numeroWhatsApp(telephone, codePays);
  const saisieInternationale = /^\s*(\+|00)/.test(telephone);
  const pays = PAYS.find((p) => p.code === codePays) ?? PAYS[0];

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={codePays}
          onChange={(e) => setCodePays(e.target.value)}
          disabled={saisieInternationale}
          aria-label="Pays du numéro"
          className="w-28 px-2 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3] disabled:opacity-40"
        >
          {PAYS.map((p) => (
            <option key={p.code} value={p.code}>
              {drapeau(p.code)} +{p.indicatif} {p.nom}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          placeholder={
            placeholder ??
            (pays.garderZero ? "Ex : 06 14 08 07" : "Numéro (ou +XX… pour un autre pays)")
          }
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEntree?.()}
          className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
        />
      </div>
      {telephone && !numero && (
        <p className="mt-1 text-xs text-red-600">Numéro incomplet.</p>
      )}
      {numero && (
        <p className="mt-1 text-xs text-gray-500">{formaterInternational(numero)}</p>
      )}
    </div>
  );
}
