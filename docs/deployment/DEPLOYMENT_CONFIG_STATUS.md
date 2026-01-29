# 🚀 Configuration Déploiement Thomas V2

## ✅ Étapes Complétées

### 1. Package Name et Versions
- **Package Name** : `marketgardener.thomas.v2` ✅
- **Version** : `2.0.0` (refonte majeure) ✅
- **Version Code** : `29` (incrémenté depuis 28) ✅
- **Fichier** : `app.json` mis à jour

### 2. Configuration Google Play Console
- **App existante** : Thomas (marketgardener.thomas.v2)
- **Dernière version publiée** : 1.0.28 (version code 28)
- **État actuel** : Tests fermés - Alpha (10 testeurs)
- **Stratégie** : Mise à jour de l'app existante (pas de nouvelle app)

## ✅ Complété

### 3. Variables d'Environnement Supabase
**COMPLÉTÉ** ✅

Variables configurées dans `eas.json` :
- [x] `EXPO_PUBLIC_SUPABASE_URL` : https://kvwzbofifqqytyfertkhh.supabase.co
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY` : [Configuré]
- [x] `EXPO_PUBLIC_OPENAI_MODEL` : gpt-4o-mini

Configuré pour tous les profils (development, preview, production).

## 📋 Prochaines Étapes

### 4. Configuration EAS Build
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 5. Build Preview (APK pour tests)
```bash
eas build --platform android --profile preview
```

### 6. Build Production (AAB pour Play Store)
```bash
eas build --platform android --profile production
```

### 7. Upload sur Google Play Console
- Upload du fichier AAB
- Notes de version en français
- Rollout 100% (pas d'utilisateurs actifs)

## 🔧 Fichiers Modifiés

### app.json
```json
{
  "expo": {
    "version": "2.0.0",
    "android": {
      "package": "marketgardener.thomas.v2",
      "versionCode": 29
    }
  }
}
```

### eas.json (à compléter)
```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "aab"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "À AJOUTER",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "À AJOUTER"
      }
    }
  }
}
```

## 📱 Assets Disponibles

- ✅ Icon app : `assets/ThomasSmall.png`
- ✅ Icon flat : `assets/Logocolorfull.png`
- ✅ Logo full : `assets/LogoFull.png`
- ✅ Favicon : `assets/Logocolorfull.png`

## 🎯 Checklist Finale

- [x] Package name configuré
- [x] Versions incrémentées
- [ ] Variables Supabase configurées
- [ ] EAS CLI installé et configuré
- [ ] Build preview testé
- [ ] Build production créé
- [ ] Screenshots préparés (4-8 images)
- [ ] Feature graphic créé (1024x500)
- [ ] Description store rédigée
- [ ] Notes de version rédigées
- [ ] Upload sur Play Console
- [ ] Soumission pour révision

## 📞 Support

- Documentation EAS : https://docs.expo.dev/build/introduction/
- Play Console : https://play.google.com/console
- Agent référence : `agents/07_PUBLISHER_DEPLOYMENT.md`

---

**Status** : ⏸️ En attente initialisation EAS (voir SETUP_EAS_MANUAL.md)
**Dernière mise à jour** : 2026-01-05

## 🔴 Action Requise

Exécutez dans un terminal :
```bash
cd C:\Users\cramp\Documents\Thomas\MobileV2Thomas
eas init
```

Puis prévenez-moi pour continuer avec les builds ! 🚀

