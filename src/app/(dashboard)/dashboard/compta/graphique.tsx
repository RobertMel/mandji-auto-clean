// src/app/(dashboard)/dashboard/compta/graphique.tsx
"use client";

import { useState } from "react";
import { fcfa } from "@/lib/config";
import type { Tranche } from "@/lib/compta";

// Couleurs des séries (palette validée : vert = entrées, bleu = dépenses)
export const COULEUR_ENTREES = "#1F8A3B";
export const COULEUR_DEPENSES = "#23B5D3";

// Graduation « ronde » au-dessus du maximum : 7 300 -> 10 000, 23 000 -> 25 000
function maxRond(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

const abrege = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`
    : n >= 1000
      ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`
      : String(n);

export default function Graphique({ tranches }: { tranches: Tranche[] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = maxRond(Math.max(0, ...tranches.flatMap((t) => [t.entrees, t.depenses])));
  const hauteur = 180;
  const graduations = [max, max / 2, 0];
  // N'affiche qu'une partie des libellés quand il y a beaucoup de tranches
  const pas = tranches.length > 16 ? Math.ceil(tranches.length / 8) : 1;
  const t = survol != null ? tranches[survol] : null;

  return (
    <div>
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: COULEUR_ENTREES }} /> Entrées
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: COULEUR_DEPENSES }} /> Dépenses
        </span>
        {/* Détail de la barre survolée / touchée */}
        <span className="ml-auto text-xs text-right text-gray-500 min-h-[1rem]">
          {t ? (
            <>
              <strong className="text-gray-900">{t.libelle}</strong> · entrées{" "}
              <strong className="text-gray-900">{fcfa(t.entrees)}</strong> · dépenses{" "}
              <strong className="text-gray-900">{fcfa(t.depenses)}</strong> · bénéfice{" "}
              <strong className="text-gray-900">{fcfa(t.entrees - t.depenses)}</strong>
            </>
          ) : (
            "Survolez ou touchez une barre pour le détail"
          )}
        </span>
      </div>

      <div className="relative">
        <div className="flex">
          {/* Axe des montants */}
          <div className="relative w-10 text-xs text-right text-gray-400 shrink-0" style={{ height: hauteur }}>
            {graduations.map((g, i) => (
              <span key={i} className="absolute right-1 -translate-y-1/2" style={{ top: `${(i / 2) * 100}%` }}>
                {abrege(g)}
              </span>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            <div style={{ minWidth: tranches.length * 9 }}>
              {/* Zone de tracé */}
              <div className="relative" style={{ height: hauteur }}>
                {graduations.map((_, i) => (
                  <div
                    key={i}
                    className={`absolute inset-x-0 border-t ${i === 2 ? "border-gray-300" : "border-gray-100"}`}
                    style={{ top: `${(i / 2) * 100}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex">
                  {tranches.map((tr, i) => (
                    <div
                      key={tr.cle}
                      onMouseEnter={() => setSurvol(i)}
                      onMouseLeave={() => setSurvol(null)}
                      onClick={() => setSurvol(survol === i ? null : i)}
                      className={`flex items-end justify-center flex-1 gap-[2px] px-[2px] cursor-default ${
                        survol === i ? "bg-gray-50" : ""
                      }`}
                    >
                      {[
                        { v: tr.entrees, c: COULEUR_ENTREES },
                        { v: tr.depenses, c: COULEUR_DEPENSES },
                      ].map((b, j) => (
                        <div
                          key={j}
                          className="w-full max-w-[14px] rounded-t"
                          style={{
                            height: b.v > 0 ? `max(${(b.v / max) * 100}%, 2px)` : 0,
                            background: b.c,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Libellés des tranches */}
              <div className="flex mt-1">
                {tranches.map((tr, i) => (
                  <span key={tr.cle} className="flex-1 text-[10px] text-center text-gray-400 whitespace-nowrap overflow-visible">
                    {i % pas === 0 ? tr.libelle : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
