# 🚀 Guide de Déploiement - Thomas V2

**Bienvenue !** Ce guide vous accompagne pour publier Thomas V2 sur Google Play Store et Apple App Store.

---

## 📍 Par Où Commencer ?

### ✅ Étape 1 : Tester l'APK Android Preview

**L'APK est déjà disponible !** Commencez par le tester.

1. **Télécharger l'APK** :
   - Lien : https://expo.dev/artifacts/eas/cQr9dwihj3pb3TdC4TC2K.apk
   - Version : 2.0.0 (version code 30)

2. **Suivre le guide de test** :
   - 📖 **`TEST_ANDROID_APK_GUIDE.md`** : Guide complet étape par étape
   - Tester toutes les fonctionnalités critiques
   - Noter les bugs éventuels

3. **Rapporter les résultats** :
   - Utiliser **`TEST_RESULTS_TEMPLATE.md`**
   - Communiquer les résultats

**Si tous les tests passent** → Passez à l'étape 2  
**Si bugs critiques** → Corriger et re-build preview

---

### ✅ Étape 2 : Build Production Android

Une fois les tests validés :

```bash
eas build --platform android --profile production
```

**Voir** : `QUICK_COMMANDS.md` pour toutes les commandes

---

### ✅ Étape 3 : Préparer les Assets

**En parallèle du build**, préparez les assets :

1. **Google Play Store** :
   - 📖 **`PLAY_STORE_ASSETS_GUIDE.md`**
   - Feature Graphic 1024x500
   - Screenshots (4-8 images)
   - Description et notes de version

2. **Apple App Store** :
   - 📖 **`APP_STORE_ASSETS_GUIDE.md`**
   - Screenshots toutes tailles
   - Privacy Nutrition Label
   - Description et notes de version

**Vérifier les assets** :
```bash
npm run check-assets
```

---

### ✅ Étape 4 : Publication Google Play Store

1. **Upload AAB** sur Play Console
2. **Configurer release** (notes de version, rollout)
3. **Soumettre pour révision**

**Guide détaillé** : 📖 **`PUBLICATION_PLAY_STORE_GUIDE.md`**

---

### ✅ Étape 5 : Build et Publication iOS

1. **Configurer credentials iOS** dans EAS
2. **Build preview** pour TestFlight
3. **Tester sur device iOS**
4. **Build production**
5. **Publication App Store**

**Guide détaillé** : 📖 **`PUBLICATION_APP_STORE_GUIDE.md`**

---

## 📚 Tous les Guides

### Tests
- **`TEST_ANDROID_APK_GUIDE.md`** : Guide de test APK complet
- **`TEST_RESULTS_TEMPLATE.md`** : Template pour rapporter les résultats

### Assets
- **`PLAY_STORE_ASSETS_GUIDE.md`** : Assets Google Play Store
- **`APP_STORE_ASSETS_GUIDE.md`** : Assets Apple App Store

### Publication
- **`PUBLICATION_PLAY_STORE_GUIDE.md`** : Publication Google Play
- **`PUBLICATION_APP_STORE_GUIDE.md`** : Publication Apple App Store

### Utilitaires
- **`QUICK_COMMANDS.md`** : Commandes rapides EAS
- **`BUILD_CHECKLIST.md`** : Checklist avant builds
- **`DEPLOYMENT_SUMMARY.md`** : Résumé complet du déploiement

---

## ⚡ Commandes Rapides

### Vérifier Assets
```bash
npm run check-assets
```

### Build Android Production
```bash
eas build --platform android --profile production
```

### Build iOS Production
```bash
eas build --platform ios --profile production
```

### Lister Builds
```bash
eas build:list --platform android --limit 5
```

**Voir** : `QUICK_COMMANDS.md` pour toutes les commandes

---

## ✅ Checklist Rapide

### Avant Build Production
- [ ] APK preview testé et validé
- [ ] Pas de crash au démarrage
- [ ] Fonctionnalités critiques testées
- [ ] Assets préparés (ou en cours)

### Avant Publication
- [ ] Build production créé
- [ ] Assets store préparés
- [ ] Notes de version rédigées
- [ ] AAB/IPA uploadé
- [ ] Release configurée
- [ ] Soumis pour révision

---

## 🎯 État Actuel

- ✅ **Build Android Preview** : Terminé (version 2.0.0, version code 30)
- ✅ **APK disponible** : https://expo.dev/artifacts/eas/cQr9dwihj3pb3TdC4TC2K.apk
- ✅ **Configuration** : Package Android et Bundle ID iOS configurés
- ✅ **Corrections** : Bugs critiques corrigés (window.location, borderStyle, JSX)
- ⏳ **Tests** : En attente de validation
- ⏳ **Build Production** : À créer après validation tests

---

## 🆘 Besoin d'Aide ?

### Problèmes de Build
- Vérifier `BUILD_CHECKLIST.md`
- Voir logs EAS : `eas build:list`

### Problèmes de Publication
- Voir guides détaillés (`PUBLICATION_*.md`)
- Vérifier configuration dans `app.json` et `eas.json`

### Problèmes de Tests
- Voir `TEST_ANDROID_APK_GUIDE.md`
- Utiliser `adb logcat` pour logs détaillés

---

## 📊 Plan Complet

Voir le plan détaillé : **`tests_et_publication_stores_e4b23301.plan.md`**

---

**Bon déploiement ! 🚀**

*Tous les guides sont prêts. Commencez par tester l'APK preview !*
