# Fix URI Recovery - Stratégie Multi-Fallback pour Android

**Date:** 2026-01-14  
**Problème:** L'URI de l'enregistrement audio n'était jamais disponible via `getStatusAsync()` sur Android  
**Solution:** Implémentation d'une stratégie multi-fallback avec 4 méthodes de récupération

---

## 🔍 Analyse du Problème

### Logs Observés

```javascript
📊 [AUDIO] Status tentative 1 (avant stop): { 
  canRecord: true,
  isRecording: true,
  isDoneRecording: undefined,
  uri: 'NULL'  // ❌ Toujours NULL pendant l'enregistrement
}
```

### Cause Racine

Sur Android avec Expo AV, l'URI n'est **jamais disponible** dans `getStatusAsync()` pendant l'enregistrement. L'URI n'est créée qu'après l'arrêt complet de l'enregistrement.

L'ancienne approche essayait de récupérer l'URI **avant** `stopAndUnloadAsync()`, ce qui ne fonctionne pas car le fichier n'est pas encore finalisé.

---

## ✅ Solution Implémentée

### Stratégie Multi-Fallback (4 Méthodes)

La nouvelle implémentation dans [`src/components/ChatConversation.tsx`](src/components/ChatConversation.tsx) (fonction `stopRecording()`, lignes 616-750) essaie 4 méthodes successivement jusqu'à ce qu'une fonctionne :

#### **Méthode 1 : `recording.getURI()` (Synchrone)**

```typescript
await recordingInstance.stopAndUnloadAsync();
if (typeof recordingInstance.getURI === 'function') {
  uri = recordingInstance.getURI();
  // ✅ Méthode synchrone, retour immédiat
}
```

**Avantages:**
- Méthode synchrone, pas d'attente
- Disponible sur iOS et certaines versions d'Expo
- La plus rapide si disponible

**Inconvénients:**
- Peut ne pas être disponible sur toutes les versions d'Expo AV
- Non documentée officiellement

---

#### **Méthode 2 : Valeur de retour `stopAndUnloadAsync()`**

```typescript
const result = await recordingInstance.stopAndUnloadAsync();
if (result?.uri) {
  uri = result.uri;
}
```

**Avantages:**
- Utilise la valeur de retour officielle
- Propre et documenté

**Inconvénients:**
- Certaines versions d'Expo ne retournent rien
- Actuellement ignorée car déjà appelé en Méthode 1

**Note:** Cette méthode est préparée pour une future refactorisation où on pourrait capturer la valeur de retour dès le premier appel.

---

#### **Méthode 3 : `getStatusAsync().uri` après stop**

```typescript
const statusAfterStop = await recordingInstance.getStatusAsync();
if (statusAfterStop.uri) {
  uri = statusAfterStop.uri;
}
```

**Avantages:**
- Méthode documentée et officielle
- Devrait fonctionner après `stopAndUnloadAsync()`

**Inconvénients:**
- Peut retourner `null` sur certains appareils Android
- L'objet recording peut être invalidé après `unload`

---

#### **Méthode 4 : Accès aux propriétés internes**

```typescript
const internalUri = (recordingInstance as any)._uri || 
                   (recordingInstance as any)._finalUri ||
                   (recordingInstance as any).uri ||
                   null;
```

**Avantages:**
- Dernier recours si toutes les méthodes officielles échouent
- Peut accéder à des propriétés non exposées

**Inconvénients:**
- Hack, peut casser avec les mises à jour d'Expo
- Non portable
- Seulement en dernier recours

---

## 📊 Logs Améliorés

### Logs Détaillés pour Chaque Méthode

```javascript
// Méthode 1
✅ [AUDIO] ✨ URI récupérée via getURI() - Méthode 1 réussie!
📁 [AUDIO] URI: file:///data/user/0/...

// Méthode 3
✅ [AUDIO] ✨ URI récupérée via getStatusAsync() - Méthode 3 réussie!

// Méthode 4
✅ [AUDIO] ✨ URI récupérée via propriété interne - Méthode 4 réussie!

// Échec total
❌ [AUDIO] ⛔ TOUTES LES MÉTHODES ONT ÉCHOUÉ
```

### Debug Additionnel

En cas d'échec, le code affiche maintenant :
- Type de l'instance recording
- Propriétés disponibles sur l'objet
- État de l'instance (exists/null)

---

## 🧪 Guide de Test

### Prérequis

1. **Connecter le téléphone en USB** avec débogage USB activé
2. **Ouvrir PowerShell** dans le dossier du projet

### Commandes de Test

```powershell
# 1. Vérifier connexion ADB
adb devices

# 2. Nettoyer les logs précédents
adb logcat -c

# 3. Filtrer les logs audio en temps réel
adb logcat | Select-String -Pattern "AUDIO|Méthode|URI|Recording" -CaseSensitive:$false
```

### Procédure de Test

1. **Lancer les logs** avec la commande ci-dessus
2. **Sur le téléphone**, ouvrir l'application Thomas
3. **Commencer un enregistrement audio** (appuyer sur le bouton micro)
4. **Parler pendant 3-5 secondes**
5. **Arrêter l'enregistrement** (appuyer sur le bouton d'envoi)
6. **Observer les logs** dans PowerShell

### Résultats Attendus

Vous devriez voir une de ces lignes dans les logs :

```
✅ [AUDIO] ✨ URI récupérée via getURI() - Méthode 1 réussie!
```

OU

```
✅ [AUDIO] ✨ URI récupérée via getStatusAsync() - Méthode 3 réussie!
```

OU

```
✅ [AUDIO] ✨ URI récupérée via propriété interne - Méthode 4 réussie!
```

Suivi de :

```
🎉 [AUDIO] URI récupérée avec succès!
📍 [AUDIO] URI complète: file:///data/user/0/...
✅ [AUDIO] Enregistrement arrêté avec succès
📊 [AUDIO] Info fichier: {exists: true, size: XXXXX}
☁️ [AUDIO] Upload audio vers Supabase...
✅ [AUDIO] Upload réussi: https://...
🎙️ [AUDIO] Transcription en cours...
```

### En Cas d'Échec

Si vous voyez :

```
❌ [AUDIO] ⛔ TOUTES LES MÉTHODES ONT ÉCHOUÉ
```

Copiez **tous les logs** depuis "📱 [AUDIO] Arrêt enregistrement mobile..." jusqu'à l'erreur finale et partagez-les pour diagnostic.

---

## 📝 Changements de Code

### Fichier Modifié

- **[`src/components/ChatConversation.tsx`](src/components/ChatConversation.tsx)** - fonction `stopRecording()` (lignes 616-750)

### Avant vs Après

#### ❌ Avant (Ne Fonctionnait Pas)

```typescript
// Essayer de récupérer l'URI AVANT stopAndUnloadAsync()
for (let attempt = 1; attempt <= 3; attempt++) {
  const status = await recording.current.getStatusAsync();
  if (status.uri) {  // ❌ Toujours null sur Android
    uri = status.uri;
    break;
  }
}
await recording.current.stopAndUnloadAsync();
```

#### ✅ Après (Multi-Fallback)

```typescript
// Arrêter d'abord
await recordingInstance.stopAndUnloadAsync();

// Méthode 1: getURI() synchrone
if (typeof recordingInstance.getURI === 'function') {
  uri = recordingInstance.getURI();
}

// Méthode 3: getStatusAsync() après stop
if (!uri) {
  const status = await recordingInstance.getStatusAsync();
  uri = status.uri;
}

// Méthode 4: Propriétés internes
if (!uri) {
  uri = (recordingInstance as any)._uri;
}
```

---

## 🎯 Résultat Attendu

Après cette correction :

1. ✅ L'enregistrement audio devrait fonctionner sur **Android**
2. ✅ L'URI devrait être récupérée via **au moins une des 4 méthodes**
3. ✅ L'upload vers Supabase devrait fonctionner
4. ✅ La transcription automatique devrait être déclenchée
5. ✅ Les tâches/observations devraient être créées automatiquement

---

## 🔄 Prochaines Étapes

1. **Tester sur Android** avec les commandes ci-dessus
2. **Noter quelle méthode fonctionne** (1, 3, ou 4)
3. **Vérifier que l'upload et la transcription fonctionnent**
4. **Tester sur iOS** si possible pour confirmer la compatibilité cross-platform
5. **Partager les logs** si des problèmes persistent

---

## 📚 Références

- [Expo AV Recording Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [React Native Platform-Specific Code](https://reactnative.dev/docs/platform-specific-code)
- [Android Audio Recording Best Practices](https://developer.android.com/guide/topics/media/mediarecorder)

---

## ✅ Checklist de Validation

- [x] Code refactorisé avec stratégie multi-fallback
- [x] Logs détaillés ajoutés pour chaque méthode
- [x] Validation de l'URI après récupération
- [x] Vérification d'existence du fichier (FileSystem)
- [x] Validation de la taille du fichier (min 1KB)
- [x] Messages d'erreur clairs pour l'utilisateur
- [ ] **TEST UTILISATEUR:** Tester sur Android avec adb logcat
- [ ] **TEST UTILISATEUR:** Vérifier quelle méthode fonctionne
- [ ] **TEST UTILISATEUR:** Confirmer upload + transcription
