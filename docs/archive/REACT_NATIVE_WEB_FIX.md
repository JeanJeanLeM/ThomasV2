# 🔧 Fix - Erreur react-native-web Resolution

## 🚨 **Problème**
```
Unable to resolve "react-native-web/dist/exports/Platform" 
from "node_modules\expo\build\launch\registerRootComponent.js"
```

## 🎯 **Cause racine**
- **Configuration Metro manquante** pour react-native-web
- **Alias de résolution** non configurés
- **Cache Metro** contenant références incorrectes

## ✅ **Solution appliquée**

### **1. Création metro.config.js**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration pour React Native Web
config.resolver.alias = {
  // Fix pour react-native-web
  'react-native$': 'react-native-web',
  'react-native/': 'react-native-web/',
  
  // Alias projet
  '@': './src',
};

// Plateformes supportées
config.resolver.platforms = ['web', 'ios', 'android', 'native'];

module.exports = config;
```

### **2. Redémarrage avec cache clean**
```bash
npx kill-port 8082
npx expo start --clear --port 8082
```

## 🔍 **Vérification**

### **Logs de succès attendus :**
```
Starting Metro Bundler
Using Metro config: metro.config.js
Waiting on http://localhost:8082
```

### **Si l'erreur persiste :**
1. Vérifier versions compatibles :
   ```bash
   npx expo doctor
   npm list react-native-web
   ```

2. Réinstaller react-native-web :
   ```bash
   npx expo install react-native-web
   ```

3. Reset complet :
   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

## 🎉 **Résultat**
- ✅ **Metro** : Configuration optimisée pour web
- ✅ **react-native-web** : Résolution correcte
- ✅ **Alias** : Chemins simplifiés (@/components)
- ✅ **Cache** : Propre et fonctionnel

**L'application web devrait maintenant se charger sans erreur !** 🚀

---

*Fix appliqué : Nov 2025 - Configuration Metro pour react-native-web*
