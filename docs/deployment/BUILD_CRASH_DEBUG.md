# 🚨 Debug Crash au Démarrage - Thomas V2

**Build ID** : 67bd5d0e-8c03-4f3c-a3be-5e8a9a901b50
**Status** : L'app se ferme systématiquement au lancement

## 🔍 Causes Probables

### 1. Variables d'Environnement Manquantes ⚠️
Les variables Supabase sont configurées dans `eas.json` mais peuvent ne pas être chargées correctement au runtime.

**Test** : Vérifier les logs Expo

### 2. Erreur de Configuration Supabase 🔧
Le client Supabase peut échouer à l'initialisation si :
- URL Supabase incorrecte
- Anon Key incorrecte
- Problème de connexion réseau

### 3. Erreur Native Module 📱
Un module natif peut ne pas être correctement configuré :
- expo-av (audio/video)
- expo-image-picker (photos)
- expo-location (localisation)

### 4. Crash JavaScript ⚡
Erreur dans le code au démarrage :
- App.tsx
- Navigation
- Contextes (AuthContext, FarmContext)

## 🛠️ Actions de Debug

### Étape 1 : Voir les Logs Build
```bash
# Ouvrir les logs du build
https://expo.dev/accounts/jeanjeanlem/projects/thomas-v2-mobile/builds/67bd5d0e-8c03-4f3c-a3be-5e8a9a901b50
```

### Étape 2 : Logs Device Android
Connecter le téléphone en USB et voir les logs :
```bash
adb logcat | grep -i "thomas\|expo\|react"
```

### Étape 3 : Build avec Logs de Debug
Ajouter des logs de debug dans App.tsx :

```typescript
console.log('🚀 App starting...');
console.log('📊 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
```

## 🔧 Corrections Possibles

### Fix 1 : Vérifier Variables Env
Dans `src/utils/env.ts`, ajouter des logs :

```typescript
console.log('ENV CHECK:', {
  url: ENV_CLIENT.SUPABASE_URL,
  hasKey: !!ENV_CLIENT.SUPABASE_ANON_KEY
});
```

### Fix 2 : Catch Errors Supabase
Dans `src/utils/supabase.ts`, wrapper la création :

```typescript
try {
  export const supabase = createSupabaseClient();
  console.log('✅ Supabase initialized');
} catch (error) {
  console.error('❌ Supabase init failed:', error);
  throw error;
}
```

### Fix 3 : Error Boundary
Ajouter un Error Boundary dans App.tsx :

```typescript
import React from 'react';
import { Text, View } from 'react-native';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Text>❌ Erreur au démarrage</Text>
          <Text>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
```

## 📋 Checklist Debug

- [ ] Vérifier logs build Expo
- [ ] Vérifier logs device (adb logcat)
- [ ] Tester connexion Supabase
- [ ] Vérifier variables env chargées
- [ ] Ajouter Error Boundary
- [ ] Ajouter console.logs debug
- [ ] Re-build avec corrections

## 🚀 Prochaine Étape

**URGENT** : Identifier la cause exacte du crash avant de continuer.

**Logs Build** : https://expo.dev/accounts/jeanjeanlem/projects/thomas-v2-mobile/builds/67bd5d0e-8c03-4f3c-a3be-5e8a9a901b50

