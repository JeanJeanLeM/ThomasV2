# 🚀 Configuration EAS - Étapes Manuelles Requises

## ⚠️ Action Requise

Les commandes EAS nécessitent une interaction que je ne peux pas effectuer automatiquement.

## 📋 Instructions à Suivre

### 1. Ouvrir un Terminal
Ouvrez un nouveau terminal PowerShell ou CMD dans le dossier du projet :
```
cd C:\Users\cramp\Documents\Thomas\MobileV2Thomas
```

### 2. Initialiser le Projet EAS
```bash
eas init
```

Quand il demande : **"Would you like to create a project for @jeanjeanlem/thomas-v2-mobile?"**
→ Répondez : **Y** (Yes)

Cela va :
- Créer un projet EAS sur votre compte
- Ajouter un `projectId` (UUID) dans `app.json`
- Lier le projet à votre compte Expo

### 3. Vérifier la Configuration
Une fois fait, vérifiez que tout est OK :
```bash
eas project:info
```

Vous devriez voir :
```
Project name: thomas-v2-mobile
Project ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Account: jeanjeanlem
```

### 4. Vérifier les Credentials Android
```bash
eas credentials
```

Sélectionnez :
1. **Android**
2. **Production**
3. Vérifiez si vous avez :
   - Upload Keystore
   - Ou choisissez "Generate new keystore" si besoin

**Important** : Si vous voulez réutiliser votre app existante `marketgardener.thomas.v2`, vous devez :
- Option A : Utiliser la même keystore que votre app actuelle sur Play Store
- Option B : Si Play App Signing est activé sur Google Play Console, EAS peut générer une nouvelle keystore (Google la convertira automatiquement)

## ✅ Une Fois Terminé

Une fois ces étapes manuelles complétées, **prévenez-moi** et je pourrai :
1. ✅ Lancer le build preview (APK pour tests)
2. ✅ Lancer le build production (AAB pour Play Store)
3. ✅ Préparer les assets pour le store
4. ✅ Vous guider pour l'upload sur Play Console

## 📝 Vérification Rapide

Après avoir exécuté `eas init`, votre `app.json` devrait contenir :
```json
{
  "expo": {
    ...
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

## 🆘 Si Problème

### Erreur "Project already exists"
Si EAS dit que le projet existe déjà, essayez :
```bash
eas build --platform android --profile preview
```
Cela devrait configurer automatiquement le reste.

### Erreur Keystore
Si vous avez l'ancienne keystore de `marketgardener.thomas.v2` :
```bash
eas credentials
# Android → Production → Upload Keystore
# Fournir le fichier .keystore, alias, et mot de passe
```

Si vous n'avez pas l'ancienne keystore ET que Play App Signing est activé :
```bash
eas credentials
# Android → Production → Generate new keystore
# Google Play gérera la signature automatiquement
```

---

**En attente de votre confirmation** ✋
Dites-moi quand vous avez terminé ces étapes et je continuerai !

