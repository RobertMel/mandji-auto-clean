// src/app/prestations-section.tsx
import { supabase } from "@/lib/supabase";
import Panier, { type Prestation } from "./panier";

export default async function PrestationsSection() {
  const { data, error } = await supabase
    .from("prestations")
    .select("id, nom, description, prix, duree_minutes")
    .eq("active", true)
    .order("prix", { ascending: true });

  if (error) {
    console.error("Erreur Supabase :", error);
    return (
      <p className="py-10 text-center text-red-600">
        Impossible de charger les prestations.
      </p>
    );
  }

  return <Panier prestations={(data ?? []) as Prestation[]} />;
}