# ✅ Checklist Test APK Thomas V2

## 📱 Avant de Tester

### Prérequis
- [ ] APK téléchargé depuis EAS Build
- [ ] Téléphone Android physique (recommandé)
- [ ] Connexion Internet active
- [ ] Compte test Supabase (ou créer un nouveau compte)

### Installation APK

**Sur téléphone Android** :
1. Transférer le fichier `.apk` sur votre téléphone
2. Ouvrir le fichier depuis le gestionnaire de fichiers
3. Autoriser l'installation depuis sources inconnues (si demandé)
4. Installer l'app
5. Ouvrir Thomas V2

---

## 🧪 Tests Critiques

### 1. ✅ Démarrage App

- [ ] **App démarre sans crash**
- [ ] **Splash screen s'affiche** (logo Thomas sur fond vert)
- [ ] **Navigation vers écran login** (si non connecté)
- [ ] **Temps de démarrage < 5 secondes**

**Si échec** : Vérifier logs, crash au démarrage = bug critique

---

### 2. ✅ Authentification Supabase

#### Test Inscription
- [ ] **Écran inscription accessible**
- [ ] **Champs email/password fonctionnels**
- [ ] **Bouton "S'inscrire" fonctionne**
- [ ] **Email de confirmation envoyé** (vérifier boîte mail)
- [ ] **Confirmation email fonctionne**
- [ ] **Redirection vers app après confirmation**

#### Test Connexion
- [ ] **Écran connexion accessible**
- [ ] **Connexion avec email/password fonctionne**
- [ ] **Message d'erreur si mauvais identifiants**
- [ ] **Redirection vers dashboard après connexion**
- [ ] **Session persiste** (fermer/rouvrir app → toujours connecté)

#### Test Déconnexion
- [ ] **Bouton déconnexion accessible** (Profil → Déconnexion)
- [ ] **Déconnexion fonctionne**
- [ ] **Redirection vers écran login**

**Si échec** : Problème variables Supabase ou configuration auth

---

### 3. ✅ Chat avec Agent IA Thomas

#### Test Envoi Message
- [ ] **Écran chat accessible** (onglet Chat)
- [ ] **Champ de saisie fonctionnel**
- [ ] **Bouton envoyer fonctionne**
- [ ] **Message utilisateur s'affiche**
- [ ] **Indicateur "Thomas écrit..." s'affiche**
- [ ] **Réponse Thomas arrive** (< 10 secondes)
- [ ] **Réponse Thomas s'affiche correctement**

#### Test Matching Intelligent
Tester avec ces messages :

**Message 1** : "J'ai observé des pucerons sur mes tomates"
- [ ] **Thomas comprend** (observation)
- [ ] **Crée une observation automatiquement**
- [ ] **Suggère une tâche** (traitement)
- [ ] **Matching parcelle** (si parcelle "tomates" existe)

**Message 2** : "J'ai terminé le désherbage de la parcelle A"
- [ ] **Thomas comprend** (tâche terminée)
- [ ] **Crée une tâche terminée**
- [ ] **Matching parcelle A**
- [ ] **Confirmation claire**

**Message 3** : "Planifie l'arrosage pour demain matin"
- [ ] **Thomas comprend** (tâche planifiée)
- [ ] **Crée une tâche avec date future**
- [ ] **Confirmation avec date**

#### Test Historique Chat
- [ ] **Messages précédents visibles**
- [ ] **Scroll fonctionne**
- [ ] **Conversations multiples** (si implémenté)

**Si échec** : Problème Edge Function, OpenAI API, ou parsing

---

### 4. ✅ Gestion Tâches

#### Navigation
- [ ] **Onglet "Tâches" accessible**
- [ ] **Liste tâches s'affiche**
- [ ] **Tâches terminées visibles**
- [ ] **Tâches planifiées visibles**

#### Création Manuelle Tâche
- [ ] **Bouton "+" ou "Nouvelle tâche" fonctionne**
- [ ] **Formulaire s'affiche**
- [ ] **Champs titre, description fonctionnels**
- [ ] **Sélection parcelle fonctionne**
- [ ] **Sélection matériel fonctionne**
- [ ] **Sélection date fonctionne**
- [ ] **Bouton "Créer" fonctionne**
- [ ] **Tâche apparaît dans la liste**

#### Modification Tâche
- [ ] **Clic sur tâche ouvre détails**
- [ ] **Bouton "Modifier" accessible**
- [ ] **Modification fonctionne**
- [ ] **Changements sauvegardés**

#### Suppression Tâche
- [ ] **Bouton "Supprimer" accessible**
- [ ] **Confirmation demandée**
- [ ] **Suppression fonctionne**
- [ ] **Tâche disparaît de la liste**

**Si échec** : Problème CRUD Supabase ou RLS policies

---

### 5. ✅ Observations Terrain

#### Navigation
- [ ] **Onglet "Observations" accessible**
- [ ] **Liste observations s'affiche**

#### Création Observation
- [ ] **Bouton "+" ou "Nouvelle observation" fonctionne**
- [ ] **Formulaire s'affiche**
- [ ] **Champs titre, description fonctionnels**
- [ ] **Sélection catégorie fonctionne** (maladie, ravageur, météo)
- [ ] **Sélection parcelle fonctionne**
- [ ] **Bouton "Ajouter photo" fonctionne** (voir test photos ci-dessous)
- [ ] **Bouton "Créer" fonctionne**
- [ ] **Observation apparaît dans la liste**

#### Affichage Observation
- [ ] **Clic sur observation ouvre détails**
- [ ] **Photos s'affichent correctement**
- [ ] **Informations complètes visibles**

**Si échec** : Problème CRUD ou RLS policies

---

### 6. ✅ Upload Photos

#### Test Caméra
- [ ] **Permission caméra demandée**
- [ ] **Permission accordée**
- [ ] **Caméra s'ouvre**
- [ ] **Photo prise**
- [ ] **Photo prévisualisée**
- [ ] **Photo uploadée sur Supabase Storage**
- [ ] **Photo visible dans l'app**

#### Test Galerie
- [ ] **Permission galerie demandée**
- [ ] **Permission accordée**
- [ ] **Galerie s'ouvre**
- [ ] **Photo sélectionnée**
- [ ] **Photo uploadée**
- [ ] **Photo visible dans l'app**

#### Test Taille Photo
- [ ] **Photos < 5MB uploadées sans problème**
- [ ] **Photos > 5MB** : compression ou message erreur clair

**Si échec** : Problème permissions, Storage Supabase, ou RLS policies

---

### 7. ✅ Mode Offline

#### Test Sans Connexion
1. **Activer mode avion** sur le téléphone
2. Tester les fonctionnalités :

- [ ] **App démarre** (si déjà connecté)
- [ ] **Navigation fonctionne**
- [ ] **Tâches existantes visibles**
- [ ] **Observations existantes visibles**
- [ ] **Création tâche fonctionne** (stockée localement)
- [ ] **Création observation fonctionne** (stockée localement)
- [ ] **Indicateur "Offline" visible**

#### Test Synchronisation
1. **Désactiver mode avion**
2. **Attendre synchronisation automatique**

- [ ] **Indicateur "Sync en cours" visible**
- [ ] **Données locales uploadées**
- [ ] **Données serveur téléchargées**
- [ ] **Indicateur "Sync OK" visible**
- [ ] **Pas de doublons**
- [ ] **Pas de perte de données**

**Si échec** : Problème AsyncStorage ou logique sync

---

### 8. ✅ Permissions Android

#### Permissions Requises
- [ ] **CAMERA** : Demandée au premier usage caméra
- [ ] **READ_EXTERNAL_STORAGE** : Demandée au premier accès galerie
- [ ] **WRITE_EXTERNAL_STORAGE** : Demandée si nécessaire
- [ ] **ACCESS_FINE_LOCATION** : Demandée si feature localisation
- [ ] **RECORD_AUDIO** : Demandée si feature audio (messages vocaux)

#### Test Refus Permission
- [ ] **Message clair si permission refusée**
- [ ] **Lien vers paramètres système**
- [ ] **App ne crash pas**

**Si échec** : Problème gestion permissions ou messages utilisateur

---

### 9. ✅ Performance

#### Temps de Réponse
- [ ] **Démarrage app < 5s**
- [ ] **Navigation instantanée** (< 300ms)
- [ ] **Chargement listes < 2s**
- [ ] **Réponse Thomas < 10s**
- [ ] **Upload photo < 5s** (selon connexion)

#### Consommation Ressources
- [ ] **Pas de lag/freeze**
- [ ] **Scroll fluide**
- [ ] **Animations fluides**
- [ ] **Pas de surchauffe téléphone**
- [ ] **Consommation batterie raisonnable**

#### Mémoire
- [ ] **Pas de crash après usage prolongé** (30 minutes)
- [ ] **Pas de ralentissement progressif**

**Si échec** : Problème optimisation, memory leaks

---

### 10. ✅ UI/UX

#### Interface
- [ ] **Design cohérent**
- [ ] **Couleurs respectées** (vert #22c55e)
- [ ] **Icônes claires**
- [ ] **Textes lisibles**
- [ ] **Boutons accessibles**
- [ ] **Pas de texte tronqué**

#### Navigation
- [ ] **Bottom tabs fonctionnent**
- [ ] **Retour arrière fonctionne**
- [ ] **Navigation intuitive**
- [ ] **Pas de dead ends**

#### Messages
- [ ] **Messages d'erreur clairs**
- [ ] **Messages de succès visibles**
- [ ] **Confirmations demandées** (suppressions)
- [ ] **Loading indicators visibles**

**Si échec** : Problème design ou UX

---

### 11. ✅ Multi-Fermes (Si Implémenté)

- [ ] **Sélection ferme accessible**
- [ ] **Changement ferme fonctionne**
- [ ] **Données isolées par ferme**
- [ ] **Invitation collaborateurs fonctionne**
- [ ] **Permissions respectées** (propriétaire, manager, ouvrier)

**Si échec** : Problème RLS policies ou logique multi-tenant

---

### 12. ✅ Statistiques/Dashboard

- [ ] **Onglet "Dashboard" ou "Stats" accessible**
- [ ] **Métriques s'affichent**
- [ ] **Graphiques fonctionnels**
- [ ] **Données cohérentes**
- [ ] **Actualisation fonctionne**

**Si échec** : Problème requêtes Supabase ou calculs

---

## 🐛 Bugs à Signaler

### Format Rapport Bug

Pour chaque bug trouvé, noter :

```markdown
## Bug : [Titre court]

**Sévérité** : P0 (critique) / P1 (majeur) / P2 (mineur)

**Étapes pour reproduire** :
1. Ouvrir l'app
2. Aller sur [écran]
3. Cliquer sur [bouton]
4. [Action]

**Résultat attendu** :
[Ce qui devrait se passer]

**Résultat obtenu** :
[Ce qui se passe réellement]

**Screenshots** :
[Si possible]

**Device** :
- Modèle : [Ex: Samsung Galaxy S21]
- Android : [Ex: 13]
- Version app : 2.0.0 (29)
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
- [ ] Pas de crash après 15 minutes d'utilisation

### Tests Recommandés
- [ ] Mode offline fonctionne
- [ ] Synchronisation fonctionne
- [ ] Permissions gérées correctement
- [ ] Performance acceptable
- [ ] UI cohérente

### Tests Optionnels
- [ ] Multi-fermes (si implémenté)
- [ ] Statistiques (si implémenté)
- [ ] Toutes les edge cases

---

## 🚀 Validation

### ✅ APK Validé
Si tous les tests critiques passent :
- App prête pour build production AAB
- Peut être soumise à Google Play

### ⚠️ APK Non Validé
Si bugs critiques (P0) :
- Corriger les bugs
- Re-build preview
- Re-tester

### 📊 Rapport Final

```markdown
# Rapport Test APK Thomas V2

**Date** : [Date]
**Version** : 2.0.0 (29)
**Testeur** : [Nom]
**Device** : [Modèle + Android version]

## Résumé
- Tests réussis : X/Y
- Bugs P0 : X
- Bugs P1 : X
- Bugs P2 : X

## Décision
- [ ] ✅ Validé pour production
- [ ] ⚠️ Corrections requises
- [ ] ❌ Refonte nécessaire

## Commentaires
[Remarques générales]
```

---

**Bon test ! 🧪📱**

Une fois les tests terminés, vous pourrez lancer le build production en toute confiance ! 🚀

