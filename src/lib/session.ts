// src/lib/session.ts
// Session de l'utilisateur connecté, lue UNE seule fois par requête :
// le layout et la page du tableau de bord partagent le même résultat
// (cache de React), au lieu de refaire chacun 2 ou 3 appels à Supabase.
import { cache } from "react";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";

export type Profil = { nom_complet: string; role: string; actif: boolean };

export const sessionCourante = cache(async () => {
  const supabase = await creerClientServeur();

  // Vérifie le jeton de connexion (localement quand le projet utilise des
  // clés de signature asymétriques, sinon via le serveur d'authentification).
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  if (!userId) return { supabase, userId: null, profil: null as Profil | null };

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role, actif")
    .eq("id", userId)
    .single();

  return { supabase, userId, profil: (profil as Profil | null) ?? null };
});

export const estGestionnaire = (role: string | undefined) =>
  role === "gerante" || role === "admin";

// Compte connecté, avec un profil actif — sinon retour à la connexion.
export async function exigerConnexion() {
  const s = await sessionCourante();
  if (!s.userId || !s.profil || !s.profil.actif) redirect("/login");
  return { supabase: s.supabase, userId: s.userId, profil: s.profil };
}

// Gérante ou admin uniquement — sinon retour aux lavages.
export async function exigerGestionnaire() {
  const s = await exigerConnexion();
  if (!estGestionnaire(s.profil.role)) redirect("/dashboard");
  return s;
}
