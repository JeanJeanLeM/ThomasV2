# Guide de Test - Enregistrement Audio Mobile

**Date**: 14 janvier 2026  
**Objectif**: Tester exhaustivement l'enregistrement audio sur APK Android

---

## 🚀 Préparation

### Avant de commencer

1. **Compiler l'APK avec les dernières modifications**:
   ```bash
   npx expo prebuild --clean
   eas build --platform android --profile preview
   ```

2. **Installer l'APK sur un appareil Android réel**:
   - Télécharger l'APK depuis EAS
   - Installer sur device Android (API 23+ recommandé)
   - Ouvrir l'application

3. **Activer les logs**:
   - Connecter le device via USB
   - Lancer: `adb logcat | grep -i "AUDIO"`
   - Ou utiliser React Native Debugger

4. **Préparer l'environnement**:
   - Connexion Internet stable (WiFi recommandé)
   - Microphone fonctionnel
   - Notifications actives (pour voir les alertes)
   - Espace disque suffisant (> 100MB)

---

## ✅ Tests Normaux (Scénarios Réussis)

### Test 1: Enregistrement Court (2-3 secondes)

**Objectif**: Vérifier que l'enregistrement court fonctionne.

**Étapes**:
1. Ouvrir le chat
2. Cliquer sur le bouton microphone 🎤
3. Autoriser les permissions si demandé
4. Parler pendant 2-3 secondes: *"Ceci est un test"*
5. Cliquer sur le bouton d'envoi

**Résultat attendu**:
- ✅ Enregistrement démarre immédiatement
- ✅ Timer affiche 1, 2, 3...
- ✅ Arrêt sans erreur
- ✅ Upload réussi
- ✅ Transcription visible (si activée)
- ✅ Message audio apparaît dans le chat

**Logs à vérifier**:
```
✅ [AUDIO] Permission déjà accordée
✅ [AUDIO] Enregistrement démarré (mobile)
🛑 [AUDIO] Arrêt enregistrement...
📊 [AUDIO] Status complet: {...}
✅ [AUDIO] Enregistrement arrêté avec succès
✅ [AUDIO] Upload réussi
```

---

### Test 2: Enregistrement Moyen (30-60 secondes)

**Objectif**: Vérifier la stabilité sur une durée moyenne.

**Étapes**:
1. Ouvrir le chat
2. Cliquer sur microphone
3. Parler/attendre pendant 30-60 secondes
4. Envoyer

**Résultat attendu**:
- ✅ Enregistrement stable sans crash
- ✅ Timer continue jusqu'à 30-60
- ✅ Taille fichier raisonnable (< 5MB)
- ✅ Upload réussi
- ✅ Transcription correcte

---

### Test 3: Enregistrement Long (4 minutes)

**Objectif**: Vérifier l'avertissement avant timeout.

**Étapes**:
1. Démarrer l'enregistrement
2. Attendre exactement 4 minutes 30 secondes (4:30)
3. Observer l'alerte
4. Continuer jusqu'à 5:00 (timeout automatique)

**Résultat attendu**:
- ✅ À 4:30 → Alerte: *"Votre enregistrement atteindra bientôt la durée maximale..."*
- ✅ À 5:00 → Alerte: *"Enregistrement arrêté"*
- ✅ Enregistrement envoyé automatiquement
- ✅ Pas de crash

**Logs à vérifier**:
```
⚠️ [AUDIO] Timeout atteint, arrêt automatique
📤 [AUDIO] Envoi message audio...
```

---

### Test 4: Annulation d'Enregistrement

**Objectif**: Vérifier que l'annulation nettoie correctement.

**Étapes**:
1. Démarrer l'enregistrement
2. Parler pendant 5-10 secondes
3. Cliquer sur le bouton "Annuler" (X ou icône poubelle)

**Résultat attendu**:
- ✅ Enregistrement s'arrête immédiatement
- ✅ Timer reset à 0
- ✅ Bouton microphone redevient normal
- ✅ Aucun message envoyé
- ✅ Fichier temporaire supprimé

**Logs à vérifier**:
```
❌ [AUDIO] Annulation enregistrement...
🗑️ [AUDIO] Fichier supprimé: file:///...
🧹 [AUDIO] État audio réinitialisé
```

---

## ❌ Tests d'Erreur (Scénarios d'Échec)

### Test 5: Permission Refusée (Première Utilisation)

**Objectif**: Vérifier le message quand permission est refusée.

**Étapes**:
1. Désinstaller l'app (pour reset permissions)
2. Réinstaller l'app
3. Cliquer sur microphone
4. **Refuser** la permission

**Résultat attendu**:
- ✅ Alerte affichée: *"L'accès au microphone est nécessaire..."*
- ✅ Boutons: "Annuler" + "Paramètres"
- ✅ Clic sur "Paramètres" → ouvre les paramètres Android
- ✅ Pas de crash

---

### Test 6: Permission Révoquée Pendant Utilisation

**Objectif**: Vérifier la détection si permission est révoquée.

**Étapes**:
1. Autoriser la permission initialement
2. Aller dans Paramètres Android → Apps → MobileV2Thomas → Permissions
3. **Révoquer** la permission microphone
4. Retourner dans l'app
5. Cliquer sur microphone

**Résultat attendu**:
- ✅ Re-demande la permission
- ✅ Si refusée → message d'erreur clair
- ✅ Pas de crash

**Logs à vérifier**:
```
🔍 [AUDIO] Vérification permissions actuelles...
🎤 [AUDIO] Permission non accordée, demande permission...
```

---

### Test 7: Microphone Déconnecté (Casque Bluetooth)

**Objectif**: Tester comportement si le microphone devient indisponible.

**Étapes**:
1. Connecter un casque Bluetooth avec micro
2. Démarrer l'enregistrement
3. Éteindre le casque **pendant** l'enregistrement
4. Observer le comportement

**Résultat attendu**:
- ✅ Soit: Bascule sur micro interne automatiquement
- ✅ Soit: Message d'erreur clair
- ✅ Pas de crash
- ✅ État audio réinitialisé

---

### Test 8: Connexion Perdue Pendant Upload

**Objectif**: Vérifier gestion erreur réseau.

**Étapes**:
1. Enregistrer un message audio (10-15s)
2. **Activer le mode avion** immédiatement après avoir cliqué "Envoyer"
3. Observer le comportement

**Résultat attendu**:
- ✅ Message d'erreur: *"Impossible d'envoyer l'audio... Vérifiez votre connexion Internet"*
- ✅ Fichier audio conservé localement (optionnel)
- ✅ Possibilité de réessayer
- ✅ Pas de crash

---

### Test 9: Espace Disque Insuffisant

**Objectif**: Vérifier comportement si plus d'espace.

**Étapes**:
1. Remplir le stockage du device (< 50MB libre)
2. Essayer d'enregistrer un message audio long (3-4 minutes)

**Résultat attendu**:
- ✅ Soit: Enregistrement s'arrête avec erreur claire
- ✅ Soit: Détection précoce et refus de démarrer
- ✅ Message: *"Espace disque insuffisant"*
- ✅ Pas de crash

---

## 🔄 Tests Edge Cases (Cas Limites)

### Test 10: Double-Clic sur Bouton Stop

**Objectif**: Vérifier protection race condition.

**Étapes**:
1. Démarrer l'enregistrement
2. Parler 5 secondes
3. **Cliquer très rapidement 2 fois** sur le bouton d'envoi

**Résultat attendu**:
- ✅ Un seul message envoyé (pas de doublon)
- ✅ Log: *"⚠️ [AUDIO] Opération audio déjà en cours, ignoré"*
- ✅ Pas de crash
- ✅ Pas d'état corrompu

---

### Test 11: Clic Rapide Start-Stop-Start

**Objectif**: Tester enchaînement rapide.

**Étapes**:
1. Cliquer sur microphone (démarrer)
2. Attendre 0.5 seconde
3. Cliquer sur annuler
4. **Immédiatement** recliquer sur microphone

**Résultat attendu**:
- ✅ Premier enregistrement annulé proprement
- ✅ Deuxième enregistrement démarre sans erreur
- ✅ Pas de message "Recording déjà en cours"
- ✅ Pas de crash

---

### Test 12: App en Background Pendant Enregistrement

**Objectif**: Vérifier comportement si app passe en arrière-plan.

**Étapes**:
1. Démarrer l'enregistrement
2. Parler pendant 3-5 secondes
3. Appuyer sur le bouton Home (mettre l'app en background)
4. Attendre 10 secondes
5. Revenir dans l'app

**Résultat attendu**:
- ✅ Soit: Enregistrement continue (timer avance)
- ✅ Soit: Enregistrement arrêté automatiquement
- ✅ Message clair si arrêté
- ✅ Pas de crash au retour

---

### Test 13: Appel Entrant Pendant Enregistrement

**Objectif**: Vérifier interruption par appel téléphonique.

**Étapes**:
1. Démarrer l'enregistrement
2. Recevoir un appel téléphonique (demander à quelqu'un d'appeler)
3. Accepter l'appel
4. Terminer l'appel
5. Revenir dans l'app

**Résultat attendu**:
- ✅ Enregistrement arrêté automatiquement pendant l'appel
- ✅ Message clair: *"Enregistrement interrompu"*
- ✅ État audio réinitialisé
- ✅ Possibilité de recommencer
- ✅ Pas de crash

---

### Test 14: Rotation Écran Pendant Enregistrement

**Objectif**: Vérifier stabilité lors de rotation.

**Étapes**:
1. Activer la rotation automatique
2. Démarrer l'enregistrement
3. Tourner le téléphone (portrait → paysage)
4. Tourner à nouveau (paysage → portrait)
5. Arrêter l'enregistrement

**Résultat attendu**:
- ✅ Enregistrement continue sans interruption
- ✅ Timer conservé
- ✅ UI s'adapte correctement
- ✅ Aucune perte de données
- ✅ Upload réussi

---

### Test 15: Enregistrement Ultra-Court (< 0.5s)

**Objectif**: Vérifier validation durée minimum.

**Étapes**:
1. Démarrer l'enregistrement
2. **Immédiatement** cliquer sur envoyer (< 0.5 seconde)

**Résultat attendu**:
- ✅ Log: *"⚠️ [AUDIO] Durée très courte: XXX ms"*
- ✅ Soit: Rejeté avec message explicite
- ✅ Soit: Envoyé quand même (mais averti)
- ✅ Pas de crash

---

## 📊 Checklist Finale

### Fonctionnalités de Base
- [ ] Enregistrement court (2-3s) → **OK**
- [ ] Enregistrement moyen (30-60s) → **OK**
- [ ] Enregistrement long (4min) → **OK**
- [ ] Avertissement à 4:30 → **OK**
- [ ] Timeout automatique à 5:00 → **OK**
- [ ] Annulation → **OK**
- [ ] Transcription affichée → **OK**

### Gestion Erreurs
- [ ] Permission refusée → **Message clair + bouton Paramètres**
- [ ] Permission révoquée → **Re-demande permission**
- [ ] Connexion perdue → **Message erreur réseau**
- [ ] Espace disque insuffisant → **Erreur explicite**
- [ ] Microphone déconnecté → **Fallback ou erreur**

### Robustesse
- [ ] Double-clic stop → **Un seul message**
- [ ] Start-Stop-Start rapide → **Fonctionne**
- [ ] App en background → **Gestion correcte**
- [ ] Appel entrant → **Arrêt propre**
- [ ] Rotation écran → **Stable**
- [ ] Enregistrement ultra-court → **Validation OK**

### Logs et Debugging
- [ ] Logs détaillés visibles dans `adb logcat`
- [ ] Status complet affiché (`canRecord`, `uri`, etc.)
- [ ] Pas d'erreur non catchée
- [ ] Cleanup complet en cas d'erreur

---

## 🐛 Rapport de Bugs

Si vous rencontrez un problème, notez:

1. **Scénario**: Quel test échoue?
2. **Logs**: Copier les logs `adb logcat | grep AUDIO`
3. **Message d'erreur**: Capture d'écran de l'alerte
4. **Device**: Modèle Android + version (ex: Pixel 5 / Android 13)
5. **Reproductibilité**: L'erreur se produit-elle toujours?

**Template**:
```
### Bug: [Titre court]

**Test**: Test #X - [Nom du test]
**Device**: [Modèle] / Android [Version]
**Reproductible**: Oui/Non (X/10 fois)

**Logs**:
```
[Coller les logs]
```

**Capture d'écran**:
[Joindre screenshot]

**Étapes pour reproduire**:
1. ...
2. ...
3. ...

**Résultat attendu**:
...

**Résultat obtenu**:
...
```

---

## ✅ Validation Finale

Tous les tests passent? Félicitations! 🎉

L'enregistrement audio est maintenant:
- ✅ **Robuste** (gère les erreurs gracieusement)
- ✅ **Fiable** (retry automatique, validation)
- ✅ **Mobile-First** (optimisé pour React Native)
- ✅ **User-Friendly** (messages clairs, suggestions)

**Prochaines étapes**:
1. Tester sur iOS (si applicable)
2. Déployer en production
3. Monitorer les erreurs avec Sentry/Firebase

---

**Note**: Ce guide couvre tous les scénarios critiques. Si un test échoue, référez-vous au document `AUDIO_RECORDING_IMPROVEMENTS.md` pour comprendre l'implémentation.

**Durée estimée du test complet**: 30-45 minutes

Bon test! 🚀
