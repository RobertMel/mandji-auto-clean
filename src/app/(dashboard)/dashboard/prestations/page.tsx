// src/app/(dashboard)/dashboard/prestations/page.tsx
import { exigerGestionnaire } from "@/lib/session";
import Catalogue from "./catalogue";

export default async function PrestationsPage() {
  const { supabase } = await exigerGestionnaire();

  // Toutes les prestations, y compris masquées
  const { data: prestations } = await supabase
    .from("prestations")
    .select("id, nom, description, prix, duree_minutes, active")
    .order("active", { ascending: false })
    .order("prix", { ascending: true });

  return <Catalogue prestations={prestations ?? []} />;
}
