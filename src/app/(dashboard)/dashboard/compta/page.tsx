// src/app/(dashboard)/dashboard/compta/page.tsx
import { exigerGestionnaire } from "@/lib/session";
import Compta, { type DonneesBrutes } from "./compta";

export default async function ComptaPage() {
  const { supabase } = await exigerGestionnaire();

  const [{ data: encaissements }, { data: achats }, { data: depenses }, { data: equipe }] = await Promise.all([
    supabase
      .from("encaissements")
      .select(
        `id, numero_recu, montant, mode_paiement, paye_le, statut, echeance,
         reservation:reservations ( notes, canal, laveur_id, fin_lavage, reservation_prestations ( part_laveur ),
           client:clients ( id, nom, prenom, entreprise ) )`
      ),
    supabase
      .from("achats_stock")
      .select("id, achete_le, quantite, contenance, unite, prix_unitaire, lieu, produit:produits ( nom )"),
    supabase
      .from("depenses")
      .select("id, depense_le, categorie, libelle, montant, mode_paiement"),
    supabase.from("profils").select("id, nom_complet, role, surnom"),
  ]);

  // Les dates des encaissements (horodatages) sont converties en date
  // locale côté navigateur, pour suivre le fuseau de l'utilisateur.
  return (
    <Compta
      donnees={{
        encaissements: (encaissements ?? []) as unknown as DonneesBrutes["encaissements"],
        achats: (achats ?? []) as unknown as DonneesBrutes["achats"],
        depenses: depenses ?? [],
        equipe: equipe ?? [],
      }}
    />
  );
}
