# 🔧 Troubleshooting & Debug

Documentation de résolution de problèmes, debug, et corrections de bugs.

## 📋 Contenu

### **Guides de Debug**
- **DEBUG_CRASH_GUIDE.md** ⭐ - Guide debug crash complet
- **DEVELOPMENT_TROUBLESHOOTING.md** - Troubleshooting développement
- **FINAL_TROUBLESHOOTING_GUIDE.md** - Guide troubleshooting final

### **Corrections Appliquées**
- **CRASH_FIX_APPLIED.md** - Correction crash appliquée
- **CRASH_FIXES_APPLIED.md** - Corrections multiples crashs
- **FIX_NETWORK_ERROR_ANDROID.md** - Fix erreur réseau Android
- **ANDROID_NETWORK_FIX.md** - Correction réseau Android
- **FIX_TASKS_NOT_DISPLAYING.md** - Fix tâches non affichées
- **NOTIFICATIONS_MIGRATION_FIX.md** - Fix migration notifications

### **Troubleshooting Spécifique**
- **DOCUMENTS_TROUBLESHOOTING.md** - Debug système documents

## 🎯 Par Où Commencer ?

1. **Crash app ?** → `DEBUG_CRASH_GUIDE.md`
2. **Problème général ?** → `DEVELOPMENT_TROUBLESHOOTING.md`
3. **Erreur spécifique ?** → Consulter les `FIX_*.md` correspondants

## 🐛 Problèmes Courants & Solutions

### **1. Crash au Démarrage**
**Symptômes** :
- App crash immédiatement
- Écran blanc
- Erreur "Cannot read property..."

**Solutions** :
1. Vérifier logs : `npx react-native log-android` ou `log-ios`
2. Clear cache : `npm run clean`
3. Réinstaller deps : `rm -rf node_modules && npm install`
4. Consulter : `DEBUG_CRASH_GUIDE.md`

### **2. Erreur Réseau Android**
**Symptômes** :
- Requêtes API échouent sur Android
- "Network request failed"
- Timeout connexions

**Solutions** :
1. Vérifier permissions réseau dans `AndroidManifest.xml`
2. Tester avec emulator/device différent
3. Consulter : `FIX_NETWORK_ERROR_ANDROID.md`

### **3. Tâches Non Affichées**
**Symptômes** :
- Liste tâches vide
- Données non chargées
- Spinner infini

**Solutions** :
1. Vérifier connexion Supabase
2. Checker RLS policies
3. Consulter : `FIX_TASKS_NOT_DISPLAYING.md`

### **4. Erreur Build**
**Symptômes** :
- Build EAS échoue
- Erreurs Gradle/CocoaPods
- Dependencies conflicts

**Solutions** :
1. Vérifier `eas.json` configuration
2. Update dependencies
3. Consulter : `../deployment/BUILD_CRASH_DEBUG.md`

### **5. Problème Notifications**
**Symptômes** :
- Notifications non reçues
- Migration échouée
- Erreur permissions

**Solutions** :
1. Vérifier permissions device
2. Tester avec token Expo
3. Consulter : `NOTIFICATIONS_MIGRATION_FIX.md`

## 🔍 Outils de Debug

### **React Native**
```bash
# Logs Android
npx react-native log-android

# Logs iOS
npx react-native log-ios

# Clear cache
npm run clean
watchman watch-del-all

# Rebuild
npm run android
npm run ios
```

### **Expo**
```bash
# Dev mode avec logs
npx expo start

# Clear cache
npx expo start -c

# Debug remote
npx expo start --dev-client
```

### **Supabase**
```bash
# Logs edge functions
supabase functions logs thomas-agent-v2

# Test local
supabase functions serve thomas-agent-v2
```

## 📊 Logs & Monitoring

### **Analyser les Logs**
1. Identifier le type d'erreur
2. Noter le stack trace
3. Chercher dans docs troubleshooting
4. Appliquer le fix correspondant

### **Erreurs Communes**
- `undefined is not an object` → Variable non initialisée
- `Network request failed` → Problème API/réseau
- `Cannot read property of null` → Donnée manquante
- `Maximum call stack exceeded` → Boucle infinie

## ✅ Checklist Debug

### **Avant de Debugger**
- [ ] Lire les logs complets
- [ ] Reproduire le bug
- [ ] Noter les étapes de reproduction
- [ ] Identifier l'environnement (dev/prod, Android/iOS)

### **Pendant le Debug**
- [ ] Tester une correction à la fois
- [ ] Vérifier les logs après chaque fix
- [ ] Documenter ce qui fonctionne
- [ ] Créer un test pour éviter régression

### **Après le Fix**
- [ ] Tester sur tous les devices
- [ ] Vérifier pas de régression
- [ ] Documenter le fix
- [ ] Commit avec message clair

## 📝 Documenter un Fix

Quand vous fixez un bug :
1. Créer un fichier `FIX_[NOM_BUG].md`
2. Décrire le problème
3. Expliquer la cause
4. Détailler la solution
5. Ajouter tests de validation
6. Placer dans `docs/troubleshooting/`

## 🔗 Liens Utiles

- **Architecture** : `../ARCHITECTURE_COMPLETE.md`
- **Tests** : `../testing/`
- **Deployment** : `../deployment/`
- **Supabase** : `../SUPABASE_MANUAL_DIAGNOSTICS.md`

---

**10 documents** | Debug complet, fixes appliqués, troubleshooting développement




