# 🔧 Guide - Résolution Erreurs Metro/Expo Bundling

## 🚨 **Erreurs de Bundling Communes**

### **1. `Unable to resolve "expo-modules-core/build/EventEmitter"`**
**Cause :** Versions Expo incompatibles entre dépendances  
**Solution :** Réinstallation propre

### **2. `MIME type 'application/json' is not executable`**
**Cause :** Metro retourne une erreur JSON au lieu du bundle JS  
**Solution :** Cache Metro corrompu

### **3. `EXPO_OS is not defined`**  
**Cause :** Configuration Babel/Expo non synchronisée
**Solution :** Cache Expo + Metro clean

---

## ✅ **Procédure de Correction COMPLÈTE**

### **Étape 1 : Arrêter tous les processus**
```bash
# Arrêter Expo/Metro
Ctrl+C dans le terminal
# Ou forcer l'arrêt du port
npx kill-port 8081
npx kill-port 8082
```

### **Étape 2 : Nettoyage complet (Windows)**
```powershell
# PowerShell Windows
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache clean --force

# Si node_modules résiste (fichiers verrouillés) :
# Fermer VS Code/Cursor
# Redémarrer l'ordinateur si nécessaire
```

### **Étape 3 : Réinstallation propre**
```bash
# 1. Réinstaller dépendances
npm install

# 2. Corriger versions Expo
npx expo install --fix

# 3. Vérifier compatibilité
npx expo doctor
```

### **Étape 4 : Redémarrage avec cache clean**
```bash
# Metro + Expo cache clean
npx expo start --clear --port 8082

# Si port 8081 occupé, utiliser 8082
# Attendre "Waiting on http://localhost:8082"
```

---

## 🔍 **Diagnostics Avancés**

### **Vérifier versions Expo :**
```bash
npx expo --version
# Doit être 54.x.x pour SDK 50
```

### **Vérifier dépendances critiques :**
```bash
npm list expo expo-modules-core react-native
# Toutes doivent être compatibles SDK 50
```

### **Test de bundling simple :**
```bash
npx expo export --platform web --dev
# Doit créer dist/ sans erreurs
```

---

## 🚀 **Optimisations Metro**

### **metro.config.js optimisé :**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Optimisations bundling
  config.resolver.platforms = ['web', 'ios', 'android'];
  config.resolver.alias = {
    '@': './src',
  };
  
  return config;
})();
```

### **Cache Metro management :**
```bash
# Nettoyer cache Metro uniquement
npx expo r --clear

# Nettoyer cache complet
npx expo start --clear
```

---

## 🐛 **Erreurs Spécifiques & Solutions**

### **"Cannot resolve module" dans design-system**
```bash
# Problème : Cycles d'imports
# Solution : Types séparés (déjà fait)
# Vérification :
npm run type-check
```

### **"__dirname is not defined" (Web)**
```javascript
// Dans metro.config.js
config.resolver.alias = {
  crypto: 'expo-crypto',
  stream: 'readable-stream',
  path: 'path-browserify',
};
```

### **"Process is not defined" (Web)**
```javascript
// Dans webpack config ou polyfills
config.resolver.fallback = {
  process: require.resolve('process/browser'),
};
```

---

## 🎯 **Prévention des Erreurs**

### **Bonnes pratiques :**
- ✅ **Toujours** utiliser `npx expo install` pour les dépendances Expo
- ✅ **Éviter** les cycles d'imports entre fichiers
- ✅ **Séparer** types/interfaces des implémentations  
- ✅ **Nettoyer cache** après modifications importantes
- ✅ **Vérifier compatibilité** avant mise à jour

### **Monitoring :**
```bash
# Vérification régulière
npx expo doctor        # Santé projet
npm audit              # Vulnérabilités
npm outdated          # Dépendances obsolètes
```

---

## 📊 **Métriques de Performance**

### **Temps de bundling normaux :**
- **Premier build** : 30-60s (normal)
- **Builds suivants** : 5-15s (avec cache)
- **Hot reload** : < 2s

### **Signes de problèmes :**
- ❌ Build > 2 minutes constamment
- ❌ Erreurs 500 répétées
- ❌ Hot reload non fonctionnel
- ❌ MIME type JSON au lieu JS

---

## 🆘 **En cas d'échec persistant**

### **Reset complet projet :**
```bash
# 1. Backup src/ et docs/
# 2. Clone fresh du repo
# 3. Copy src/ et docs/ 
# 4. npm install
# 5. npx expo start --clear
```

### **Alternative : Nouveau projet Expo**
```bash
npx create-expo-app --template blank-typescript
# Puis migration manuelle des fichiers
```

---

## 🎉 **Validation du Fix**

### **Tests à effectuer :**
- ✅ `npx expo start --clear` → Pas d'erreur
- ✅ Web bundle charge correctement  
- ✅ Hot reload fonctionne
- ✅ Build production : `npx expo export`
- ✅ TypeScript compile : `npm run type-check`

### **Logs de succès :**
```
Starting Metro Bundler
warning: Bundler cache is empty, rebuilding (this may take a minute)
Waiting on http://localhost:8082
Web Bundling complete 1234ms (C:\...\node_modules\expo\AppEntry.js)
```

**Si ces logs apparaissent → Problème RÉSOLU !** ✅

---

*Guide créé : Nov 2025 - Résolution erreurs Metro/Expo bundling*
