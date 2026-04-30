# Procedure de publication Web App iOS et Android

Cette procedure sert de checklist a chaque mise a jour production.

## Branches officielles

- Web App iOS : `webappIOS` -> `origin/webappIOS`
- Android : `master` local -> `origin/main`
- `origin/master` est historique et ne doit pas etre utilise pour publier.

## Verification avant commit

1. Verifier l'etat Git :
   ```bash
   git status --short --branch
   git diff --stat
   ```
2. Ne jamais committer :
   - `.env`
   - `.cursor/`
   - `supabase/.temp/`
   - fichiers `.jks`, certificats, service account Google Play
   - secrets Supabase service role ou tokens `sb_secret`
3. Lancer les controles :
   ```bash
   npm run type-check
   npm run build:web
   ```

## Web App iOS

1. Se placer sur la branche web :
   ```bash
   git checkout webappIOS
   ```
2. Verifier les claviers numeriques :
   - `Input` et `EnhancedInput` doivent utiliser `decimal-pad` pour les decimaux iOS.
   - Les champs parcelle `Longueur`, `Largeur`, `Longueur unite`, `Largeur unite` doivent accepter `,` et `.`.
3. Mettre a jour le versioning avant chaque push production :
   - `app.json` : `expo.version` et `expo.runtimeVersion`
   - `package.json` : `version`
   - `package-lock.json` : version racine et package racine
   - verifier l'ecran de chargement apres deploiement
4. Committer puis pousser :
   ```bash
   git add <fichiers>
   git commit -m "feat(release): prepare web ios production update"
   git push origin webappIOS
   ```
5. Verifier le deploiement Netlify declenche par `netlify.toml`.
6. Tester sur Safari iOS : login, chat, formulaires dimensions/unites, notifications, installation ecran d'accueil.

## Android

1. Se placer sur la branche Android :
   ```bash
   git checkout master
   ```
2. Porter uniquement les changements compatibles Android depuis `webappIOS`.
3. Verifier `app.json` :
   - `expo.version` superieur ou egal a la version publiee
   - `android.package = marketgardener.thomas.v2`
   - `android.versionCode` strictement superieur au dernier build Google Play
4. Lancer le build production AAB :
   ```bash
   eas build --platform android --profile production --non-interactive
   ```
5. Pousser la branche Android officielle :
   ```bash
   git push origin master:main
   ```
6. Uploader l'AAB genere dans Google Play Console.

## Notifications

- L'app native enregistre le token avec `PushNotificationService.registerAndSave()`.
- Android doit garder la permission `android.permission.POST_NOTIFICATIONS`.
- L'edge function `send-notifications` doit etre deployee avant publication.
- Le cron Supabase doit utiliser le secret Vault `SUPABASE_CRON_AUTH_TOKEN`, pas une cle hardcodee dans une migration.

## Validation post-publication

- Web : ouvrir l'URL production, tester Safari iOS et verifier le build Netlify.
- Android : tester l'AAB/track interne avant rollout.
- Verifier login, onboarding, chat, taches/observations, formulaires, notifications et mode hors ligne.
- Surveiller Expo/EAS, Supabase logs et Google Play Console apres publication.
