# Validation iOS Safari — Thomas Web App
# URL cible : https://mobile.thomas-app.com

Ce guide liste les parcours critiques à tester sur iPhone/iPad Safari avant de
considérer un déploiement OVH comme stable.

---

## Prérequis

- iPhone ou iPad avec iOS 14.1+
- Safari (navigateur par défaut Apple)
- Connexion à https://mobile.thomas-app.com
- Un compte utilisateur Thomas valide

---

## Checklist de validation

### 1. Chargement et authentification

- [ ] La page se charge sans écran blanc
- [ ] Le certificat HTTPS est valide (cadenas dans Safari)
- [ ] L'écran de connexion s'affiche correctement
- [ ] Connexion par email/mot de passe fonctionne
- [ ] La session persiste après fermeture et réouverture de Safari
- [ ] Reconnexion automatique au retour (localStorage/session)

### 2. Navigation principale

- [ ] Onglet Chat accessible
- [ ] Onglet Tâches accessible
- [ ] Onglet Paramètres accessible
- [ ] Les boutons sont suffisamment grands pour le tactile (min 44px)
- [ ] Pas de défilement horizontal non désiré
- [ ] Le clavier virtuel iOS ne cache pas les champs de saisie

### 3. Chat texte

- [ ] Envoi d'un message texte fonctionne
- [ ] La réponse de Thomas s'affiche
- [ ] Le scroll de la conversation fonctionne
- [ ] Les action cards s'affichent correctement
- [ ] Les modals (formulaires) s'ouvrent et se ferment

### 4. Enregistrement audio et transcription (CRITIQUE sur Safari iOS)

Safari iOS 14.1+ supporte MediaRecorder avec `audio/mp4`.
Le mode "Dictée en temps réel" (Web Speech API) n'est PAS disponible sur Safari iOS.
Seul le mode "Audio" (enregistrement puis transcription Whisper) fonctionne.

- [ ] Le bouton micro est visible et accessible
- [ ] Safari demande la permission d'accès au microphone (première fois)
- [ ] L'enregistrement démarre après accord de permission
- [ ] L'indicateur d'enregistrement s'affiche
- [ ] L'enregistrement s'arrête au tap sur le bouton
- [ ] La transcription Whisper est retournée dans le chat
- [ ] Le mode "Dictée" est grisé ou affiche un message approprié ("Dictée non disponible sur Safari")

> Note technique : iOS Safari encode en `audio/mp4`. Notre backend Whisper accepte `.mp4`/`.m4a` ✅

### 5. Photos et pièces jointes

- [ ] Le bouton d'ajout de photo est accessible
- [ ] Safari demande la permission d'accès à la galerie
- [ ] Sélection d'une photo depuis la galerie fonctionne
- [ ] La photo s'affiche en aperçu dans le chat
- [ ] L'envoi avec la photo fonctionne

### 6. Formulaires et modals

- [ ] Création d'une tâche fonctionne
- [ ] Modification d'une tâche fonctionne
- [ ] Les sélecteurs de date fonctionnent (date picker natif Safari)
- [ ] Les dropdowns/selects fonctionnent
- [ ] Les modals peuvent être fermées (swipe ou bouton)

### 7. Mode hors ligne

- [ ] Activer le mode avion sur l'iPhone
- [ ] L'indicateur "Hors ligne" s'affiche
- [ ] Un message texte est mis en queue (pas d'erreur)
- [ ] Réactiver le réseau → le message est envoyé automatiquement

### 8. PWA — Ajout à l'écran d'accueil (optionnel mais recommandé)

Pour une expérience "app-like" sans App Store :
- [ ] Dans Safari, taper sur l'icône Partager (carré avec flèche)
- [ ] Taper sur "Sur l'écran d'accueil" (ou "Add to Home Screen")
- [ ] Donner un nom : "Thomas"
- [ ] Taper "Ajouter"
- [ ] L'icône Thomas apparaît sur l'écran d'accueil
- [ ] L'app s'ouvre en plein écran sans barre d'adresse Safari

---

## Problèmes connus Safari iOS et solutions

### Micro silencieux au premier enregistrement

**Cause** : iOS demande la permission de manière asynchrone.  
**Solution** : Si le premier enregistrement ne capte rien, fermer et rouvrir l'onglet, puis recommencer.

### Clavier qui pousse le layout vers le haut

**Cause** : Safari iOS gère le viewport différemment des autres navigateurs.  
**Statut** : Les composants utilisent `KeyboardAvoidingView` qui doit gérer ce cas.  
**Si problème** : Faire défiler manuellement vers le bas.

### "Dictée" affiche un message d'erreur

**Comportement attendu** : Le bouton "Dictée" doit afficher "La dictée en temps réel nécessite Chrome ou Edge." sur Safari iOS.  
**Ce comportement est normal** — utiliser le mode "Audio" à la place.

### Session expirée après longue inactivité

**Cause** : Safari iOS agresse la mémoire et peut décharger les onglets.  
**Solution** : Si l'écran de connexion s'affiche, se reconnecter. La session Supabase est stockée dans localStorage et devrait persister.

---

## Logs de débogage sur iOS Safari

Pour débugger sur iPhone depuis un Mac :
1. Mac → Safari → Réglages → Avancé → Activer le menu Développement
2. iPhone → Réglages → Safari → Avancé → Inspecteur Web → Activer
3. Brancher l'iPhone sur le Mac en USB
4. Mac Safari → Développement → [Votre iPhone] → mobile.thomas-app.com

Sans Mac (débogage à distance limité) :
- Utiliser `console.log` et vérifier l'historique des requêtes réseau dans un serveur de log distant
- Ou tester sur Android Chrome où les devtools sont plus accessibles
