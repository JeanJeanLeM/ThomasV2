# Version Debug - Enregistrement Audio

**Date**: 14 janvier 2026  
**Objectif**: Identifier pourquoi l'URI audio est null sur mobile

---

## 🐛 Problème Détecté

L'erreur "L'enregistrement n'a pas généré de fichier audio" apparaît, ce qui signifie que `status.uri` est `null` après `stopAndUnloadAsync()`.

## 🔧 Corrections Apportées

### 1. **Retry Logic Refactorisé** ✅

**Problème**: Le retry externe appelait `stopRecording()` plusieurs fois, mais on ne peut pas "re-stopper" un enregistrement déjà arrêté.

**Solution**: Le retry est maintenant **DANS** `stopRecording()` :

```typescript
// Arrêter d'abord
await recording.current.stopAndUnloadAsync();

// Retry: essayer de récupérer l'URI 3 fois
for (let attempt = 1; attempt <= 3; attempt++) {
  if (attempt > 1) {
    await delay(attempt === 2 ? 100 : 500);
  }
  
  const status = await recording.current.getStatusAsync();
  if (status.uri) {
    uri = status.uri;
    break;
  }
}
```

### 2. **Logs Détaillés Ajoutés** 📊

**Au démarrage** :
```typescript
console.log('🎤 [AUDIO] Options:', JSON.stringify(recordingOptions));
console.log('✅ [AUDIO] Recording object créé:', !!recording.current);
console.log('📊 [AUDIO] Status initial:', {
  canRecord,
  isRecording,
  durationMillis
});
```

**À l'arrêt (chaque tentative)** :
```typescript
console.log(`🔄 [AUDIO] Tentative ${attempt}/3...`);
console.log(`📊 [AUDIO] Status tentative ${attempt}:`, {
  canRecord,
  isRecording,
  isDoneRecording,
  durationMillis,
  uri: status.uri ? 'PRESENT' : 'NULL'
});
```

### 3. **Alerte Debug en Cas d'Échec** 🚨

Si l'URI est toujours null après 3 tentatives :

```typescript
Alert.alert(
  'Debug: Enregistrement échoué',
  `L'URI audio n'a pas pu être récupérée après 3 tentatives.\n\n` +
  'Cela peut indiquer un problème avec expo-av ou les permissions.',
  [{ text: 'OK' }]
);
```

### 4. **Import FileSystem Corrigé** ✅

**Problème**: `require('expo-file-system')` était appelé localement et pouvait échouer.

**Solution**: Import conditionnel au début du fichier comme les autres modules Expo :

```typescript
let FileSystem: any = null;

if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
  } catch (error) {
    console.warn('Expo modules non disponibles:', error);
  }
}
```

---

## 🧪 Comment Débugger

### Méthode 1: Logs ADB (Recommandée)

1. **Connectez votre téléphone en USB**
2. **Activez le débogage USB** sur Android
3. **Lancez dans un terminal**:
   ```bash
   adb logcat | findstr "AUDIO"
   ```

4. **Faites un test d'enregistrement** sur l'app
5. **Regardez les logs** pour identifier où ça échoue

### Méthode 2: Alertes Debug

La nouvelle version affiche automatiquement une **alerte avec les détails** si l'URI est null.

---

## 📊 Scénarios Possibles

### Scénario A: URI null dès la 1ère tentative

**Logs attendus**:
```
📱 [AUDIO] Arrêt enregistrement mobile...
🛑 [AUDIO] Appel stopAndUnloadAsync()...
✅ [AUDIO] stopAndUnloadAsync() terminé
🔄 [AUDIO] Tentative 1/3...
📊 [AUDIO] Status tentative 1: {..., uri: NULL}
⚠️ [AUDIO] URI manquante à la tentative 1
```

**Causes possibles**:
- Problème avec expo-av
- Permissions microphone insuffisantes
- Enregistrement pas vraiment démarré

### Scénario B: URI trouvée après retry

**Logs attendus**:
```
🔄 [AUDIO] Tentative 1/3...
⚠️ [AUDIO] URI manquante à la tentative 1
⏳ [AUDIO] Attente 100ms...
🔄 [AUDIO] Tentative 2/3...
📊 [AUDIO] Status tentative 2: {..., uri: PRESENT}
✅ [AUDIO] URI trouvée à la tentative 2
```

**Cause**: L'URI n'était pas immédiatement disponible (race condition)

### Scénario C: Recording object non créé

**Logs attendus**:
```
🎤 [AUDIO] Démarrage enregistrement mobile...
✅ [AUDIO] Recording object créé: false
```

**Cause**: `createAsync()` a échoué silencieusement

---

## 🔍 Informations Clés à Chercher

Dans les logs, cherchez ces lignes critiques :

1. **Démarrage réussi ?**
   ```
   ✅ [AUDIO] Recording object créé: true
   📊 [AUDIO] Status initial: {canRecord: true, isRecording: true}
   ```

2. **Arrêt réussi ?**
   ```
   🛑 [AUDIO] Appel stopAndUnloadAsync()...
   ✅ [AUDIO] stopAndUnloadAsync() terminé
   ```

3. **URI présente ?**
   ```
   📊 [AUDIO] Status tentative X: {..., uri: PRESENT}
   ```

4. **Erreurs ?**
   ```
   ❌ [AUDIO] URI manquante après toutes les tentatives
   ```

---

## 🚀 Prochaines Étapes

1. **Compiler le nouvel APK**:
   ```bash
   eas build --platform android --profile preview
   ```

2. **Installer l'APK** sur votre téléphone

3. **Lancer adb logcat** (voir Méthode 1 ci-dessus)

4. **Faire un test** d'enregistrement audio

5. **Copier les logs** et me les envoyer pour analyse

---

## 📋 Checklist Debug

- [ ] APK recompilé avec nouvelle version
- [ ] APK installé sur device Android
- [ ] adb logcat lancé (`adb logcat | findstr "AUDIO"`)
- [ ] Test enregistrement effectué
- [ ] Logs copiés
- [ ] Alerte debug apparue (si erreur)
- [ ] Infos alerte notées

---

## 💡 Hypothèses Actuelles

Basées sur le problème rapporté, voici mes hypothèses par ordre de probabilité :

### 1. **Permission microphone partielle** (60%)
- La permission est accordée, mais `canRecord` est `false`
- Android nécessite parfois une permission supplémentaire
- Solution: Vérifier dans les logs `canRecord: false`

### 2. **expo-av/Recording bug** (25%)
- Bug connu dans certaines versions d'expo-av
- L'URI n'est pas générée immédiatement
- Solution: Retry devrait résoudre (tentative 2 ou 3)

### 3. **Format d'enregistrement incompatible** (10%)
- Les options d'enregistrement (m4a/AAC) ne sont pas supportées
- Le device utilise un codec différent
- Solution: Essayer d'autres formats (voir `getRecordingOptions()`)

### 4. **Espace disque insuffisant** (5%)
- Pas assez d'espace pour créer le fichier temporaire
- Solution: Vérifier l'espace disponible sur le device

---

**Avec ces logs, nous pourrons identifier précisément le problème !** 🎯
