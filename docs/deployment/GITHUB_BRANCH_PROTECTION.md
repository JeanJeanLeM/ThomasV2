# Protection des branches GitHub — ThomasV2

Ce guide explique pas à pas comment configurer la protection des branches sur GitHub,
sans avoir besoin de la ligne de commande.

---

## Étape 1 : Aller dans les paramètres

1. Ouvrir le repo sur **https://github.com/JeanJeanLeM/ThomasV2**
2. Cliquer sur l'onglet **Settings** (en haut)
3. Dans le menu gauche, cliquer sur **Branches**
4. Cliquer sur **Add branch ruleset** (ou "Add rule" selon la version GitHub)

---

## Étape 2 : Protéger `main` (Android — règles fortes)

**Branch name pattern :** `main`

Cocher les options suivantes :
- [x] **Restrict deletions** — empêche la suppression accidentelle
- [x] **Require a pull request before merging**
  - Minimum 1 approbation
  - Dismiss stale pull request approvals when new commits are pushed
- [x] **Block force pushes** — empêche tout `git push --force`
- [x] **Do not allow bypassing the above settings** (même pour les admins)

> La branche `main` ne doit recevoir que du code Android testé et validé.

---

## Étape 3 : Protéger `webappIOS` (Web App / Safari)

**Branch name pattern :** `webappIOS`

Cocher les options suivantes :
- [x] **Restrict deletions**
- [x] **Require a pull request before merging** (1 approbation ou 0 si vous travaillez seul)
- [x] **Block force pushes**

> La branche `webappIOS` contient le code déployé sur `mobile.thomas-app.com`.

---

## Résultat attendu

Après configuration, tout push direct sur `main` ou `webappIOS` sera refusé.
Il faudra passer par une Pull Request.

```
git checkout -b feat/ma-feature main   # feature Android
git checkout -b web/ma-feature webappIOS  # feature Web
```

---

## En cas de problème urgent (hotfix)

Si un correctif critique doit bypasser les règles temporairement :
1. Désactiver temporairement la règle dans Settings → Branches
2. Pousser le fix
3. **Réactiver immédiatement la règle**

Ne jamais laisser les protections désactivées.
