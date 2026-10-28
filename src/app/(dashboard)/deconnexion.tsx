// src/app/(dashboard)/deconnexion.tsx
"use client";

import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

export default function Deconnexion() {
  const router = useRouter();

  const seDeconnecter = async () => {
    const supabase = creerClientNavigateur();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={seDeconnecter}
      className="px-3 py-2 text-sm text-gray-600 transition border border-gray-300 rounded-full shrink-0 hover:bg-gray-50"
    >
      Déconnexion
    </button>
  );
}