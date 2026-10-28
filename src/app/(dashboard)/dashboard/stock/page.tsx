// src/app/(dashboard)/dashboard/stock/page.tsx
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import Stock from "./stock";

export default async function StockPage() {
  const supabase = await creerClientServeur();

  // Garde : gérante et admin uniquement
  const { data: estGestionnaire } = await supabase.rpc("est_gestionnaire");
  if (!estGestionnaire) redirect("/dashboard");

  const [{ data: produits }, { data: achats }, { data: sorties }] = await Promise.all([
    supabase
      .from("produits")
      .select("id, nom, seuil_alerte, active")
      .order("nom"),
    supabase
      .from("achats_stock")
      .select("id, produit_id, achete_le, quantite, contenance, unite, prix_unitaire, lieu, created_at")
      .order("achete_le", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("sorties_stock")
      .select("id, produit_id, quantite, contenance, unite, sortie_le")
      .order("sortie_le", { ascending: false }),
  ]);

  return (
    <Stock produits={produits ?? []} achats={achats ?? []} sorties={sorties ?? []} />
  );
}
