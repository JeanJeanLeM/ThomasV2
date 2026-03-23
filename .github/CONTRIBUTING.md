# Stratégie de branches — ThomasV2

## Vue d'ensemble

| Branche | Rôle | Destination de déploiement |
|---------|------|---------------------------|
| `main` | Application Android (Google Play) | Google Play via EAS Build |
| `webappIOS` | Web App + iOS (Safari) | `mobile.thomas-app.com` via OVH |

---

## Règles de base

### Branche `main` (Android)
- Contient uniquement le code Android stable prêt pour le Play Store.
- **Aucun push direct.** Tout changement passe par une Pull Request depuis une feature branch.
- Brancher depuis `main` pour toute nouvelle feature Android : `git checkout -b feat/ma-feature main`
- Merge vers `main` uniquement après tests Android validés.

### Branche `webappIOS` (Web App / iOS Safari)
- Contient les ajustements spécifiques à la web app : build statique Expo, config OVH, `.htaccess`, etc.
- Base de départ : synchronisée sur `main` lors de la création.
- **Aucun push direct recommandé.** Passer par une PR depuis une feature branch `web/...`.
- Brancher depuis `webappIOS` pour toute nouvelle feature web : `git checkout -b web/ma-feature webappIOS`
- Merge vers `webappIOS` uniquement après test sur `https://mobile.thomas-app.com`.

---

## Flux de travail

```
main (Android)
│
├── feat/xxx ──────────────────► PR → merge → main
│
└── (créé à partir de main)
     webappIOS (Web/iOS)
     │
     ├── web/xxx ──────────────► PR → merge → webappIOS
     │
     └── export + OVH upload ──► mobile.thomas-app.com
```

---

## Synchronisation des branches

Les correctifs critiques qui doivent aller dans les deux branches se font par **cherry-pick** :

```bash
# Depuis webappIOS, prendre un commit de main
git cherry-pick <commit-hash>

# Depuis main, prendre un commit de webappIOS
git cherry-pick <commit-hash>
```

Ne jamais merger `webappIOS` → `main` directement (éviter de polluer le build Android avec des ajustements web).

---

## Build et déploiement

### Android (depuis `main`)
```bash
eas build --platform android --profile production
```

### Web App (depuis `webappIOS`)
```bash
npm run build:web
# Puis upload du dossier dist/ sur OVH (voir docs/deployment/WEB_OVH_DEPLOYMENT.md)
```

---

## Protection des branches sur GitHub

### À configurer sur GitHub.com → Settings → Branches

**Branch `main` :**
- [x] Require a pull request before merging
- [x] Require approvals (1 minimum)
- [x] Do not allow bypassing the above settings

**Branch `webappIOS` :**
- [x] Require a pull request before merging
- [ ] (Approbation requise : optionnel selon l'équipe)

> Voir le guide complet : `docs/deployment/GITHUB_BRANCH_PROTECTION.md`
