# Sauvegardes de la base Mandji Auto Clean

Chaque nuit (02 h 17, heure du Gabon), la tâche GitHub **Sauvegarde Supabase** exporte la base,
la chiffre et la conserve **90 jours** (onglet *Actions* du dépôt > *Sauvegarde Supabase* >
cliquer sur une exécution > section *Artifacts*).

Le fichier téléchargé est chiffré : sans le mot de passe `SAUVEGARDE_MOT_DE_PASSE`,
personne ne peut le lire (pas même GitHub). **Garde ce mot de passe en lieu sûr.**

## Contenu
- `application.sql` : tables, fonctions, règles d'accès et données (clients, lavages,
  encaissements, stock, compta…)
- `comptes.sql` : les comptes de connexion (admin, gérante, laveurs)

## Lire une sauvegarde
```bash
unzip sauvegarde-mandji-AAAA-MM-JJ-*.zip          # le fichier téléchargé depuis GitHub
gpg -d mandji-AAAA-MM-JJ.tar.gz.gpg | tar xz      # demande le mot de passe
# -> dossier sauvegarde/ avec application.sql et comptes.sql
```

## Restaurer (en cas de perte de la base)
À faire de préférence avec de l'aide : la restauration écrase les données.
1. Créer un projet Supabase vide (ou vider le schéma `public` du projet existant).
2. Récupérer l'adresse de connexion « Session pooler » (Supabase > Connect).
3. Restaurer :
   ```bash
   psql "ADRESSE_DE_CONNEXION" -f sauvegarde/comptes.sql
   psql "ADRESSE_DE_CONNEXION" -f sauvegarde/application.sql
   ```
4. Mettre à jour les clés Supabase dans Vercel si le projet a changé.

## Lancer une sauvegarde à la main
Onglet *Actions* > *Sauvegarde Supabase* > *Run workflow*.
