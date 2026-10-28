// src/app/(dashboard)/dashboard/prestations/page.tsx
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import Catalogue from "./catalogue";

export default async function PrestationsPage() {
  const supabase = await creerClientServeur();

  // Garde : seules gérante et admin gèrent le catalogue.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profil || (profil.role !== "gerante" && profil.role !== "admin")) {
    redirect("/dashboard");
  }

  // Toutes les prestations, y compris masquées
  const { data: prestations } = await supabase
    .from("prestations")
    .select("id, nom, description, prix, duree_minutes, active")
    .order("active", { ascending: false })
    .order("prix", { ascending: true });

  return <Catalogue prestations={prestations ?? []} />;
}
