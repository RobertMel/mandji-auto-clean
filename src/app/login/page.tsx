// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const router = useRouter();

  const seConnecter = async () => {
    setChargement(true);
    setErreur("");

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      setErreur("Email ou mot de passe incorrect.");
      setChargement(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-serre.png" alt="Mandji Auto Clean" className="w-auto h-24 mx-auto mb-10" />

        <h1 className="mb-8 text-2xl font-bold text-center">Espace personnel</h1>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && seConnecter()}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#23B5D3]"
          />
        </div>

        {erreur && (
          <p className="mt-4 text-sm text-center text-red-600">{erreur}</p>
        )}

        <button
          onClick={seConnecter}
          disabled={chargement || !email || !motDePasse}
          className="w-full py-3 mt-6 font-medium text-white transition rounded-full bg-[#1F8A3B] hover:bg-[#176d2e] disabled:opacity-50"
        >
          {chargement ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </main>
  );
}