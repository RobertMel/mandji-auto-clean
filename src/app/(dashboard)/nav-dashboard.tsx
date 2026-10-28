// src/app/(dashboard)/nav-dashboard.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/dashboard", libelle: "Lavages", gestion: false },
  { href: "/dashboard/clients", libelle: "Clients", gestion: true },
  { href: "/dashboard/compta", libelle: "Compta", gestion: true },
  { href: "/dashboard/stock", libelle: "Stock", gestion: true },
  { href: "/dashboard/prestations", libelle: "Prestations", gestion: true },
  { href: "/dashboard/stats", libelle: "Statistiques", gestion: true },
];

// Onglets du tableau de bord : une ligne qui défile au doigt sur téléphone.
export default function NavDashboard({ gestionnaire }: { gestionnaire: boolean }) {
  const chemin = usePathname();
  const liens = LIENS.filter((l) => gestionnaire || !l.gestion);
  if (liens.length < 2) return null; // un laveur n'a qu'un écran

  const estActif = (href: string) =>
    href === "/dashboard"
      ? chemin === "/dashboard" || chemin.startsWith("/dashboard/recu")
      : chemin.startsWith(href);

  return (
    <nav aria-label="Sections" className="border-b border-gray-100 print:hidden">
      <ul className="flex gap-1 px-3 py-2 overflow-x-auto max-w-5xl mx-auto [scrollbar-width:none] sm:px-5">
        {liens.map((l) => {
          const actif = estActif(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`block px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  actif ? "bg-encre text-white" : "text-gray-600 hover:bg-ecume"
                }`}
              >
                {l.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
