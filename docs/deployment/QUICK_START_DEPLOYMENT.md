# 🚀 Quick Start - Déploiement Thomas V2

Guide rapide pour déployer Thomas V2 sur Google Play Store.

---

## ✅ Étape 1 : Initialiser EAS (MAINTENANT)

```bash
cd C:\Users\cramp\Documents\Thomas\MobileV2Thomas
eas init
```

**Répondre Y (Yes)** quand demandé.

**Vérifier** :
```bash
eas project:info
```

Vous devriez voir :
```
Project name: thomas-v2-mobile
Project ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Account: jeanjeanlem
```

---

## ✅ Étape 2 : Build Preview APK (Pour Tests)

```bash
eas build --platform android --profile preview
```

**Durée** : 15-20 minutes

**Résultat** : Lien pour télécharger l'APK

**Télécharger** :
```bash
eas build:download --id [BUILD_ID]
```

---

## ✅ Étape 3 : Tester l'APK

1. Transférer l'APK sur votre téléphone Android
2. Installer l'APK
3. Tester selon `APK_TEST_CHECKLIST.md`

**Tests critiques** :
- ✅ App démarre
- ✅ Authentification fonctionne
- ✅ Chat Thomas répond
- ✅ Création tâche OK
- ✅ Upload photo OK

---

## ✅ Étape 4 : Build Production AAB

Si tests OK :

```bash
eas build --platform android --profile production
```

**Durée** : 15-20 minutes

**Résultat** : Fichier AAB pour Google Play Store

**Télécharger** :
```bash
eas build:download --id [BUILD_ID] --output ./thomas-v2-production.aab
```

---

## ✅ Étape 5 : Upload sur Play Console

1. **Aller sur** : https://play.google.com/console
2. **Sélectionner** : Thomas (marketgardener.thomas.v2)
3. **Navigation** : Production → Releases → "Créer une nouvelle version"
4. **Upload AAB** : Parcourir et sélectionner le fichier `.aab`
5. **Notes de version** : Copier depuis `RELEASE_NOTES_V2.md`
6. **Rollout** : 100% (pas d'utilisateurs actifs)
7. **Enregistrer** et **Examiner la version**
8. **Déployer vers Production**

---

## ✅ Étape 6 : Attendre Révision

**Délai** : 1-3 jours (généralement 24-48h)

**Statut** : Vérifier dans Play Console → Dashboard

**Email** : Vous recevrez un email quand l'app est approuvée

---

## ✅ Étape 7 : Vérifier Publication

Une fois approuvé :

1. **Play Store** : Rechercher "Thomas" ou aller sur :
   ```
   https://play.google.com/store/apps/details?id=marketgardener.thomas.v2
   ```

2. **Vérifier** :
   - Version affichée : 2.0.0
   - Screenshots corrects
   - Description correcte
   - Bouton "Installer" ou "Mettre à jour" visible

---

## 🎉 Félicitations !

Thomas V2 est publié sur Google Play Store ! 🚀📱

---

## 📋 Commandes Utiles

### Vérifier Connexion
```bash
eas whoami
```

### Lister Builds
```bash
eas build:list --platform android
```

### Télécharger Build Spécifique
```bash
eas build:download --id [BUILD_ID]
```

### Vérifier Credentials
```bash
eas credentials
```

### Voir Logs Build
```bash
eas build:view [BUILD_ID]
```

---

## 🆘 Problèmes Courants

### Build Échoue
```bash
# Clear cache et retry
eas build --platform android --profile preview --clear-cache
```

### Erreur Credentials
```bash
# Re-configurer credentials
eas credentials
# Android → Production → Generate new keystore (si Play App Signing activé)
```

### Erreur Version Code
Incrémenter dans `app.json` :
```json
"android": {
  "versionCode": 30  // +1
}
```

Puis re-build.

---

## 📚 Documentation Complète

- **Setup EAS** : `SETUP_EAS_MANUAL.md`
- **Test APK** : `APK_TEST_CHECKLIST.md`
- **Assets Store** : `STORE_ASSETS_GUIDE.md`
- **Notes Version** : `RELEASE_NOTES_V2.md`
- **Upload Play Console** : `PLAY_CONSOLE_UPLOAD_GUIDE.md`
- **Status Complet** : `DEPLOYMENT_STATUS_FINAL.md`

---

## 🎯 Résumé 1 Minute

```bash
# 1. Init EAS
eas init

# 2. Build preview
eas build --platform android --profile preview

# 3. Tester APK sur téléphone

# 4. Build production
eas build --platform android --profile production

# 5. Upload AAB sur Play Console

# 6. Attendre révision (1-3 jours)

# 7. App publiée ! 🎉
```

---

**Commencez maintenant avec `eas init` !** 🚀

