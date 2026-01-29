# Fix - Timeout d'enregistrement orphelin (5 minutes)

## Problème identifié

**Symptôme** : Messages d'erreur apparaissant toutes les 5 minutes indiquant que l'enregistrement ne peut pas durer plus de 5 minutes, alors qu'aucun enregistrement n'a été lancé.

**Cause racine** : Le timeout de 5 minutes créé lors du démarrage d'un enregistrement n'était **jamais nettoyé** quand l'enregistrement était arrêté. Le timeout continuait à tourner en arrière-plan et déclenchait l'alerte après 5 minutes.

### Flux du problème

1. Utilisateur démarre un enregistrement → `startRecording()` crée un timeout de 5 minutes
2. Utilisateur arrête l'enregistrement → `stopRecording()` est appelé
3. **BUG** : `stopRecording()` ne nettoyait PAS le timeout
4. Le timeout continue à tourner en arrière-plan
5. Après 5 minutes → Le timeout déclenche l'alerte même si aucun enregistrement n'est actif

---

## Corrections appliquées

### 1. Nettoyage du timeout dans `stopRecording()`

**Fichier** : `src/components/ChatConversation.tsx`

**Avant** :
```typescript
const stopRecording = async (): Promise<string | null> => {
  // Arrêter le timer
  if (recordingDurationInterval.current) {
    clearInterval(recordingDurationInterval.current);
    recordingDurationInterval.current = null;
  }
  // ❌ Le timeout n'était PAS nettoyé ici
```

**Après** :
```typescript
const stopRecording = async (): Promise<string | null> => {
  // CRITIQUE: Arrêter le timeout de 5 minutes AVANT tout
  if (recordingTimeoutRef.current) {
    console.log('🧹 [AUDIO] Nettoyage timeout 5 minutes');
    clearTimeout(recordingTimeoutRef.current);
    recordingTimeoutRef.current = null;
  }

  // Arrêter le timer de durée
  if (recordingDurationInterval.current) {
    clearInterval(recordingDurationInterval.current);
    recordingDurationInterval.current = null;
  }
```

### 2. Protection contre les doubles appels à `startRecording()`

**Ajout** : Vérification qu'aucun enregistrement n'est déjà en cours + nettoyage préventif des timeouts restants

```typescript
const startRecording = async () => {
  // PROTECTION: Vérifier qu'aucun enregistrement n'est déjà en cours
  if (isRecording) {
    console.warn('⚠️ [AUDIO] Enregistrement déjà en cours, ignore le double appel');
    return;
  }

  // PROTECTION: Nettoyer tout timeout/interval restant (sécurité)
  if (recordingTimeoutRef.current) {
    console.warn('⚠️ [AUDIO] Timeout restant détecté, nettoyage préventif');
    clearTimeout(recordingTimeoutRef.current);
    recordingTimeoutRef.current = null;
  }
  // ...
}
```

### 3. Nettoyage du timeout dans le callback du timeout

**Avant** : Le timeout appelait `sendAudioMessage()` sans se nettoyer lui-même

**Après** : Le timeout se nettoie AVANT d'appeler `sendAudioMessage()`

```typescript
recordingTimeoutRef.current = setTimeout(async () => {
  console.warn('⚠️ [AUDIO] Timeout atteint, arrêt automatique');
  
  // CRITIQUE: Nettoyer le timeout AVANT d'appeler sendAudioMessage
  if (recordingTimeoutRef.current) {
    clearTimeout(recordingTimeoutRef.current);
    recordingTimeoutRef.current = null;
  }
  
  Alert.alert(/* ... */);
  await sendAudioMessage();
}, MAX_RECORDING_DURATION * 1000);
```

### 4. Nettoyage dans le cleanup `useEffect`

**Ajout** : Nettoyage explicite des timeouts/intervals même si pas d'enregistrement actif (protection contre les timeouts orphelins)

```typescript
useEffect(() => {
  return () => {
    // CRITIQUE: Nettoyer TOUS les timeouts/intervals même si pas d'enregistrement actif
    if (recordingTimeoutRef.current) {
      console.log('🧹 [AUDIO] Cleanup: nettoyage timeout 5 minutes orphelin');
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingDurationInterval.current) {
      console.log('🧹 [AUDIO] Cleanup: nettoyage interval durée orphelin');
      clearInterval(recordingDurationInterval.current);
      recordingDurationInterval.current = null;
    }
    // ...
  };
}, [isRecording, chat?.id]);
```

---

## Points de nettoyage du timeout

Le timeout est maintenant nettoyé dans **4 endroits** pour garantir qu'il ne reste jamais orphelin :

1. ✅ **`stopRecording()`** - Au début de la fonction (nettoyage principal)
2. ✅ **`startRecording()`** - Nettoyage préventif avant de créer un nouveau timeout
3. ✅ **Callback du timeout** - Le timeout se nettoie lui-même avant d'appeler `sendAudioMessage()`
4. ✅ **`useEffect` cleanup** - Nettoyage au démontage du composant ou changement de chat

---

## Tests à effectuer

### Test 1 : Enregistrement normal
1. Démarrer un enregistrement
2. Arrêter l'enregistrement après quelques secondes
3. **Vérifier** : Aucun message d'erreur après 5 minutes

### Test 2 : Enregistrement jusqu'au timeout
1. Démarrer un enregistrement
2. Attendre 5 minutes (ou modifier `MAX_RECORDING_DURATION` pour tester plus vite)
3. **Vérifier** : Le message d'alerte apparaît une seule fois, puis plus rien

### Test 3 : Double appel à `startRecording()`
1. Démarrer un enregistrement
2. Essayer de démarrer un autre enregistrement (double-clic rapide)
3. **Vérifier** : Le deuxième appel est ignoré, un seul timeout est actif

### Test 4 : Changement de chat pendant enregistrement
1. Démarrer un enregistrement
2. Changer de chat (ou quitter l'écran)
3. **Vérifier** : Le timeout est nettoyé, aucun message d'erreur après 5 minutes

### Test 5 : Navigation rapide
1. Démarrer un enregistrement
2. Arrêter rapidement
3. Démarrer un autre enregistrement
4. Répéter plusieurs fois
5. **Vérifier** : Aucun timeout orphelin, aucun message d'erreur

---

## Logs de debug

Les logs suivants ont été ajoutés pour faciliter le debug :

- `🧹 [AUDIO] Nettoyage timeout 5 minutes` - Quand le timeout est nettoyé dans `stopRecording()`
- `⚠️ [AUDIO] Timeout restant détecté, nettoyage préventif` - Quand un timeout orphelin est détecté dans `startRecording()`
- `🧹 [AUDIO] Cleanup: nettoyage timeout 5 minutes orphelin` - Quand un timeout est nettoyé au démontage

---

## Statut

- [x] Identification du problème (timeout non nettoyé)
- [x] Correction dans `stopRecording()`
- [x] Protection contre doubles appels
- [x] Nettoyage dans callback timeout
- [x] Nettoyage dans `useEffect` cleanup
- [x] Logs de debug
- [ ] Tests utilisateur

---

**Date** : 2026-01-14
**Auteur** : Assistant AI
**Priorité** : 🔥 CRITIQUE (UX dégradée, messages d'erreur intempestifs)
