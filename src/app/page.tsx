import PrestationsSection from "./prestations-section";
// src/app/page.tsx
export default function Home() {
  // 👉 À MODIFIER : ton vrai numéro WhatsApp au format international (241 + numéro)
  const whatsappNumber = "241XXXXXXXX";
  const message = encodeURIComponent(
    "Bonjour Mandji Auto Clean, je souhaite réserver un lavage. Voici les détails :"
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* Barre de navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <img src="/logo.png" alt="Mandji Auto Clean" className="w-auto h-16" />
        <ul className="hidden gap-8 text-sm font-medium sm:flex">
          <li><a href="#accueil" className="hover:text-[#1F8A3B]">Accueil</a></li>
          <li><a href="#prestations" className="hover:text-[#1F8A3B]">Prestations</a></li>
          <li><a href="#contact" className="hover:text-[#1F8A3B]">Contact</a></li>
        </ul>
      </nav>

      {/* Section héro */}
      <section
        id="accueil"
        className="flex flex-col items-center px-6 py-20 text-center"
      >
        <img src="/logo.png" alt="Mandji Auto Clean" className="mb-8 w-56" />
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Votre véhicule, <span className="text-[#1F8A3B]">propre</span> et{" "}
          <span className="text-[#23B5D3]">soigné</span>
        </h1>
        <p className="max-w-xl mt-6 text-lg text-gray-600">
          {/* 👉 À MODIFIER : adapte la ville */}
          Lavage automobile professionnel à Port-Gentil. Réservez en quelques
          secondes, nous nous occupons du reste.
        </p>
        <a

          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 mt-10 text-white transition rounded-full bg-[#1F8A3B] hover:bg-[#176d2e]"
        >
          Réserver sur WhatsApp
        </a>
      </section>
      <PrestationsSection />

    </main>
  );
}