// src/app/(dashboard)/dashboard/prestations/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";

// Après une modification du catalogue : la page d'accueil publique
// est régénérée pour afficher les nouveaux prix tout de suite.
export async function rafraichirAccueil() {
  const supabase = await creerClientServeur();
  const { data: estGestionnaire } = await supabase.rpc("est_gestionnaire");
  if (!estGestionnaire) return;

  revalidatePath("/");
}
