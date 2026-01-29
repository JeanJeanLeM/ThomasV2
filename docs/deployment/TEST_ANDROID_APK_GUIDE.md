# 📱 Guide de Test APK Android - Thomas V2

**Version** : 2.0.0 (version code 30)  
**APK** : https://expo.dev/artifacts/eas/cQr9dwihj3pb3TdC4TC2K.apk  
**Date** : 2026-01-06

---

## 📥 Étape 1 : Installation

### 1.1 Télécharger l'APK
1. Ouvrir le lien : https://expo.dev/artifacts/eas/cQr9dwihj3pb3TdC4TC2K.apk
2. Télécharger le fichier `.apk` sur votre téléphone Android

### 1.2 Désinstaller l'Ancienne Version
**IMPORTANT** : Si vous avez déjà l'ancienne app Thomas installée :
1. **Paramètres** → **Applications** → **Thomas**
2. **Désinstaller**
3. (Nécessaire car signature différente)

### 1.3 Installer le Nouvel APK
1. Ouvrir le fichier `.apk` téléchargé
2. Autoriser l'installation depuis sources inconnues (si demandé)
3. **Installer**
4. **Ouvrir** l'app

---

## ✅ Étape 2 : Tests Fonctionnels Critiques

### 2.1 Démarrage App ⚠️ CRITIQUE
**Test** : Lancer l'app

**Résultat attendu** :
- ✅ App démarre sans crash
- ✅ Splash screen s'affiche (logo Thomas sur fond vert)
- ✅ Navigation vers écran login ou dashboard
- ✅ Temps de démarrage < 5 secondes

**Si crash** : Noter l'erreur exacte et me la communiquer

---

### 2.2 Authentification Supabase

#### Test Inscription
1. Cliquer sur "S'inscrire" ou "Créer un compte"
2. Remplir email et mot de passe
3. Cliquer "S'inscrire"

**Résultat attendu** :
- ✅ Message de confirmation
- ✅ Email de confirmation envoyé
- ✅ Redirection vers écran de confirmation

#### Test Connexion
1. Entrer email et mot de passe
2. Cliquer "Se connecter"

**Résultat attendu** :
- ✅ Connexion réussie
- ✅ Redirection vers dashboard
- ✅ Session persistante (fermer/rouvrir app → toujours connecté)

**Si erreur** : Noter le message d'erreur exact

---

### 2.3 Chat avec Agent IA Thomas 🤖

#### Test Message Simple
1. Aller dans l'onglet **Chat**
2. Taper : "Bonjour Thomas"
3. Envoyer

**Résultat attendu** :
- ✅ Message utilisateur s'affiche
- ✅ Indicateur "Thomas écrit..." visible
- ✅ Réponse Thomas arrive (< 10 secondes)
- ✅ Réponse s'affiche correctement

#### Test Matching Intelligent
Tester avec ces messages :

**Message 1** : "J'ai observé des pucerons sur mes tomates"
- ✅ Thomas comprend (observation)
- ✅ Crée une observation automatiquement
- ✅ Suggère une tâche (traitement)

**Message 2** : "J'ai terminé le désherbage de la parcelle A"
- ✅ Thomas comprend (tâche terminée)
- ✅ Crée une tâche terminée
- ✅ Matching parcelle A

**Si pas de réponse** : Noter le temps d'attente et si erreur affichée

---

### 2.4 Création Tâche ✅

1. Aller dans l'onglet **Tâches**
2. Cliquer sur **"+"** ou **"Nouvelle tâche"**
3. Remplir :
   - Titre : "Test tâche"
   - Description : "Tâche de test"
   - Parcelle : Sélectionner une parcelle
   - Date : Aujourd'hui
4. Ajouter une photo (optionnel)
5. Cliquer **"Créer"**

**Résultat attendu** :
- ✅ Formulaire s'affiche correctement
- ✅ Tâche créée avec succès
- ✅ Tâche apparaît dans la liste
- ✅ Photo uploadée (si ajoutée)

---

### 2.5 Création Observation 👁️

1. Aller dans l'onglet **Observations**
2. Cliquer sur **"+"** ou **"Nouvelle observation"**
3. Remplir :
   - Titre : "Test observation"
   - Description : "Observation de test"
   - Catégorie : Sélectionner (maladie, ravageur, météo)
   - Parcelle : Sélectionner
4. Ajouter une photo
5. Cliquer **"Créer"**

**Résultat attendu** :
- ✅ Observation créée avec succès
- ✅ Photo uploadée
- ✅ Observation apparaît dans la liste

---

### 2.6 Upload Photos 📸

#### Test Caméra
1. Dans création tâche/observation, cliquer **"Ajouter photo"**
2. Sélectionner **"Caméra"**
3. Autoriser permission caméra
4. Prendre une photo
5. Confirmer

**Résultat attendu** :
- ✅ Permission demandée
- ✅ Caméra s'ouvre
- ✅ Photo prise
- ✅ Photo prévisualisée
- ✅ Photo uploadée

#### Test Galerie
1. Cliquer **"Ajouter photo"**
2. Sélectionner **"Galerie"**
3. Autoriser permission galerie
4. Sélectionner une photo
5. Confirmer

**Résultat attendu** :
- ✅ Galerie s'ouvre
- ✅ Photo sélectionnée
- ✅ Photo uploadée

---

### 2.7 Permissions 🔐

**Permissions à tester** :
- ✅ **CAMERA** : Demandée au premier usage
- ✅ **READ_EXTERNAL_STORAGE** : Demandée pour galerie
- ✅ **ACCESS_FINE_LOCATION** : Demandée si feature localisation
- ✅ **RECORD_AUDIO** : Demandée si messages vocaux

**Test** : Utiliser chaque fonctionnalité nécessitant une permission

**Résultat attendu** :
- ✅ Permission demandée au bon moment
- ✅ Message clair si permission refusée
- ✅ App ne crash pas si permission refusée

---

### 2.8 Mode Offline 📱

#### Test Sans Connexion
1. **Activer mode avion** sur le téléphone
2. Tester :
   - Navigation entre écrans
   - Création tâche
   - Création observation
   - Consultation données existantes

**Résultat attendu** :
- ✅ App fonctionne (si déjà connecté)
- ✅ Indicateur "Offline" visible
- ✅ Création fonctionne (stockée localement)
- ✅ Données existantes visibles

#### Test Synchronisation
1. **Désactiver mode avion**
2. Attendre synchronisation

**Résultat attendu** :
- ✅ Indicateur "Sync en cours" visible
- ✅ Données locales uploadées
- ✅ Indicateur "Sync OK" visible
- ✅ Pas de doublons
- ✅ Pas de perte de données

---

### 2.9 Navigation 🧭

**Test** : Naviguer entre tous les écrans

**Écrans à tester** :
- ✅ Dashboard/Accueil
- ✅ Chat
- ✅ Tâches
- ✅ Observations
- ✅ Documents
- ✅ Profil/Paramètres
- ✅ Gestion fermes (si implémenté)

**Résultat attendu** :
- ✅ Navigation fluide
- ✅ Pas de lag
- ✅ Retour arrière fonctionne
- ✅ Bottom tabs fonctionnent

---

### 2.10 Gestion Multi-Fermes 🏠

**Si implémenté** :
1. Aller dans Profil/Paramètres
2. Sélectionner ferme
3. Changer de ferme
4. Vérifier données isolées

**Résultat attendu** :
- ✅ Sélection ferme fonctionne
- ✅ Changement ferme fonctionne
- ✅ Données isolées par ferme

---

## ⚡ Étape 3 : Tests de Performance

### 3.1 Temps de Réponse
- [ ] Démarrage app < 5 secondes
- [ ] Navigation instantanée (< 300ms)
- [ ] Chargement listes < 2 secondes
- [ ] Réponse Thomas < 10 secondes
- [ ] Upload photo < 5 secondes

### 3.2 Fluidité
- [ ] Pas de lag/freeze
- [ ] Scroll fluide
- [ ] Animations fluides
- [ ] Pas de surchauffe téléphone

### 3.3 Stabilité
- [ ] Pas de crash après 15 minutes
- [ ] Pas de crash après 30 minutes
- [ ] Pas de ralentissement progressif

---

## 📊 Étape 4 : Tests de Compatibilité

### 4.1 Versions Android
- [ ] Test sur Android 11
- [ ] Test sur Android 12
- [ ] Test sur Android 13+ (si disponible)

### 4.2 Tailles d'Écran
- [ ] Petit écran (< 5")
- [ ] Écran moyen (5-6")
- [ ] Grand écran (> 6")
- [ ] Tablette (si supportée)

---

## 📝 Format Rapport de Test

Pour chaque test, noter :

```markdown
## Test : [Nom du test]

**Statut** : ✅ Réussi / ❌ Échoué / ⚠️ Partiel

**Résultat** :
[Description détaillée]

**Problèmes rencontrés** :
[Si applicable]

**Screenshots** :
[Si applicable]
```

---

## 🐛 Bugs à Signaler

### Format Rapport Bug

```markdown
## Bug : [Titre court]

**Sévérité** : P0 (critique) / P1 (majeur) / P2 (mineur)

**Étapes pour reproduire** :
1. [Action]
2. [Action]
3. [Action]

**Résultat attendu** :
[Ce qui devrait se passer]

**Résultat obtenu** :
[Ce qui se passe réellement]

**Device** :
- Modèle : [Ex: Samsung Galaxy S21]
- Android : [Version]
- Version app : 2.0.0 (30)
```

### Sévérités

- **P0 (Critique)** : App crash, fonctionnalité principale cassée, perte de données
- **P1 (Majeur)** : Fonctionnalité importante ne marche pas, UX très dégradée
- **P2 (Mineur)** : Bug cosmétique, fonctionnalité secondaire, workaround existe

---

## ✅ Checklist Finale

### Tests Obligatoires (Bloquants)
- [ ] App démarre sans crash
- [ ] Authentification fonctionne
- [ ] Chat Thomas répond
- [ ] Création tâche fonctionne
- [ ] Upload photo fonctionne
- [ ] Pas de crash après 15 minutes

### Tests Recommandés
- [ ] Mode offline fonctionne
- [ ] Synchronisation fonctionne
- [ ] Permissions gérées correctement
- [ ] Performance acceptable
- [ ] UI cohérente

---

## 🎯 Validation

### ✅ APK Validé
Si tous les tests critiques passent :
- ✅ App prête pour build production AAB
- ✅ Peut être soumise à Google Play

### ⚠️ APK Non Validé
Si bugs critiques (P0) :
- Corriger les bugs
- Re-build preview
- Re-tester

---

**Bon test ! 🧪📱**

Une fois les tests terminés, communiquez-moi les résultats et je continuerai avec le build production ! 🚀
