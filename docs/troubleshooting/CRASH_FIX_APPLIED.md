# ✅ Correction Crash au Démarrage

## 🐛 Problème Identifié

**Cause** : Les variables d'environnement n'étaient pas accessibles dans le build production.

`process.env` ne fonctionne pas dans les builds Expo production. Il faut utiliser `Constants.expoConfig.extra`.

## 🔧 Corrections Appliquées

### 1. Fichier `src/utils/env.ts` ✅

Ajout d'un helper `getEnvVar()` qui :
1. Essaie `process.env` (développement)
2. Puis `Constants.expoConfig.extra` (production)
3. Fallback sur valeur par défaut

```typescript
import Constants from 'expo-constants';

const getEnvVar = (key: string, fallback: string = ''): string => {
  if (process.env[key]) return process.env[key] as string;
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  return fallback;
};
```

### 2. Fichier `app.json` ✅

Ajout des variables dans la section `extra` :

```json
"extra": {
  "eas": {
    "projectId": "adbc05c2-38c2-484e-8f5d-90eda98c1ed1"
  },
  "EXPO_PUBLIC_SUPABASE_URL": "https://kvwzbofifqqytyfertkhh.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "[KEY]",
  "EXPO_PUBLIC_OPENAI_MODEL": "gpt-4o-mini"
}
```

## 🚀 Nouveau Build Lancé

Build preview avec `--clear-cache` pour forcer la recompilation.

**Durée estimée** : 15-20 minutes

## ✅ Résultat Attendu

L'app devrait maintenant :
- ✅ Démarrer sans crash
- ✅ Se connecter à Supabase
- ✅ Charger les données correctement

## 📋 Tests à Refaire

Une fois le nouveau build prêt :
1. Désinstaller l'ancienne app
2. Installer le nouveau APK
3. Lancer l'app
4. Vérifier qu'elle démarre
5. Tester authentification
6. Tester chat IA

---

**Status** : Build en cours...

