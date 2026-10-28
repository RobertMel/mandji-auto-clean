// src/app/page.tsx
import Link from "next/link";
import PrestationsSection from "./prestations-section";
import { ENTREPRISE, WHATSAPP_NUMBER } from "@/lib/config";

// Le catalogue est relu au plus toutes les 5 minutes (filet de sécurité :
// une modification depuis le tableau de bord rafraîchit la page aussitôt).
export const revalidate = 300;

const lienQuestion = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Bonjour Mandji Auto Clean, j'ai une question :",
)}`;

// Les trois bandes du logo (citron, vert, lagon), en vagues
function Vagues() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="block w-full h-14 sm:h-20"
    >
      <path
        d="M0 40 C 240 0 480 0 720 30 S 1200 70 1440 30 V120 H0Z"
        fill="#a0de1e"
      />
      <path
        d="M0 62 C 260 26 520 30 760 56 S 1220 86 1440 54 V120 H0Z"
        fill="#55ae39"
      />
      <path
        d="M0 84 C 280 52 540 58 780 80 S 1230 104 1440 78 V120 H0Z"
        fill="#00bfe6"
      />
      <path
        d="M0 104 C 300 84 560 88 800 102 S 1240 116 1440 100 V120 H0Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen pb-24 bg-white">
      {/* En-tête */}
      <header className="bg-ecume">
        <div className="px-5 pt-4 sm:px-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-serre.png"
              alt="Mandji Auto Clean"
              className="w-auto h-16"
            />
            <a
              href={lienQuestion}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium bg-white rounded-full text-encre"
            >
              Une question ?
            </a>
          </div>
        </div>

        {/* Accroche */}
        <div className="px-5 pt-10 pb-6 sm:px-8 sm:pt-14">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-[2.6rem] leading-[1.02] font-extrabold tracking-tight sm:text-6xl">
              Une voiture propre, sans faire la&nbsp;queue.
            </h1>
            <p className="max-w-md mt-5 text-lg text-gray-700">
              Lavage auto à Port-Gentil. Choisissez vos prestations, voyez le
              prix tout de suite et réservez sur WhatsApp.
            </p>
            <a
              href="#prestations"
              className="inline-block px-7 py-4 mt-8 text-lg font-semibold text-white transition-colors rounded-full bg-mandji hover:bg-mandji-fonce"
            >
              Choisir mes prestations
            </a>
          </div>
        </div>
        <Vagues />
      </header>

      <PrestationsSection />

      {/* Contact */}
      <footer id="contact" className="px-5 pt-12 pb-8 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-symbole.png" alt="" className="w-12 h-12" />
              <div>
                <p className="font-bold">{ENTREPRISE.nom}</p>
                <p className="text-gray-600">{ENTREPRISE.ville}</p>
              </div>
            </div>
            <a
              href={lienQuestion}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-mandji"
            >
              WhatsApp : {ENTREPRISE.telephone}
            </a>
          </div>
          <p className="mt-10 text-sm text-gray-400">
            <Link href="/login" className="hover:text-encre">
              Espace équipe
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
