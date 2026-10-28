// src/app/(dashboard)/dashboard/compta/page.tsx
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import Compta, { type DonneesBrutes } from "./compta";

export default async function ComptaPage() {
  const supabase = await creerClientServeur();

  // Garde : gérante et admin uniquement
  const { data: estGestionnaire } = await supabase.rpc("est_gestionnaire");
  if (!estGestionnaire) redirect("/dashboard");

  const [{ data: encaissements }, { data: achats }, { data: depenses }] = await Promise.all([
    supabase
      .from("encaissements")
      .select("id, numero_recu, montant, mode_paiement, paye_le, reservation:reservations ( notes )"),
    supabase
      .from("achats_stock")
      .select("id, achete_le, quantite, contenance, unite, prix_unitaire, lieu, produit:produits ( nom )"),
    supabase
      .from("depenses")
      .select("id, depense_le, categorie, libelle, montant, mode_paiement"),
  ]);

  // Les dates des encaissements (horodatages) sont converties en date
  // locale côté navigateur, pour suivre le fuseau de l'utilisateur.
  return (
    <Compta
      donnees={{
        encaissements: (encaissements ?? []) as unknown as DonneesBrutes["encaissements"],
        achats: (achats ?? []) as unknown as DonneesBrutes["achats"],
        depenses: depenses ?? [],
      }}
    />
  );
}
