# 📤 Guide Publication Google Play Store

## 🎯 Prérequis

- [x] Build AAB production créé
- [x] Package name : `marketgardener.thomas.v2`
- [x] Version : 2.0.0
- [x] Version code : 30 (ou supérieur)
- [x] Assets préparés (icon, feature graphic, screenshots)
- [x] Notes de version rédigées
- [x] Accès à Google Play Console

---

## 📱 Étape 1 : Accéder à Play Console

1. Aller sur **https://play.google.com/console**
2. Connectez-vous avec votre compte Google
3. Sélectionner l'app **"Thomas"** (marketgardener.thomas.v2)

---

## 🚀 Étape 2 : Créer une Nouvelle Version

### Navigation
```
Menu gauche → Production → Releases → "Créer une nouvelle version"
```

**Ou si vous voulez tester d'abord** :
```
Menu gauche → Tests fermés → Alpha → "Créer une nouvelle version"
```

**Recommandation** : Commencez par **Tests fermés - Alpha** pour valider avant production.

---

## 📦 Étape 3 : Upload du AAB

### 3.1 Télécharger le AAB depuis EAS

Si vous n'avez pas encore le fichier :
```bash
# Lister vos builds
eas build:list --platform android

# Télécharger le dernier build production
eas build:download --id [BUILD_ID] --output ./thomas-v2-production.aab
```

### 3.2 Upload sur Play Console

1. Dans la section **"App bundles"**, cliquer sur **"Parcourir les fichiers"**
2. Sélectionner votre fichier `.aab`
3. Attendre l'upload (peut prendre 1-5 minutes)
4. Google Play va automatiquement analyser le bundle

### 3.3 Vérifications Automatiques

Google Play va vérifier :
- ✅ Signature valide
- ✅ Version code supérieur à la précédente (30 > 28)
- ✅ Package name correct
- ✅ Permissions déclarées
- ✅ Compatibilité appareils

**Si erreur** → Voir section "Résolution Problèmes" ci-dessous

---

## 📝 Étape 4 : Notes de Version

### 4.1 Nom de la Version (Interne)
```
Thomas V2.0.0 - Refonte Complète
```

### 4.2 Notes de Version (Français)

Copier depuis `PLAY_STORE_ASSETS_GUIDE.md` :

```
🚀 Thomas V2 - Refonte complète !

Thomas revient entièrement repensé pour vous offrir la meilleure expérience de gestion agricole.

✨ Nouveautés majeures :

🤖 Agent IA Thomas Amélioré
• Intelligence artificielle OpenAI GPT-4o-mini
• Compréhension naturelle du langage français
• Reconnaissance automatique des parcelles et matériels
• Suggestions personnalisées et contextuelles

✅ Nouveau Système de Tâches
• Interface modernisée et intuitive
• Tâches terminées et planifiées
• Photos et descriptions détaillées

👁️ Observations Terrain Améliorées
• Documentation instantanée avec photos
• Catégorisation automatique

📊 Dashboard Statistiques
• Métriques d'exploitation en temps réel
• Graphiques interactifs

🏠 Gestion Multi-Exploitations
• Gérez plusieurs fermes facilement
• Invitez vos collaborateurs

📱 Mode Offline Performant
• Travaillez sans connexion Internet
• Synchronisation automatique

🎨 Interface Modernisée
⚡ Performance Optimisée
🔒 Sécurité Renforcée

📱 Version 2.0.0
🌾 Conçu par des agriculteurs, pour des agriculteurs !

Merci de votre confiance ! 🚜
```

**Limite** : 500 caractères (Google tronquera si trop long)

---

## 🎚️ Étape 5 : Configuration du Rollout

### Option A : Tests Fermés (Recommandé pour première version)
```
Tests fermés → Alpha
→ Liste de testeurs : Vos testeurs actuels
→ Rollout : 100% (tous les testeurs)
```

**Avantages** :
- Tester en conditions réelles
- Recevoir feedback avant production
- Corriger bugs éventuels
- Pas d'impact sur le public

### Option B : Production Directe
```
Production
→ Pays : France (+ autres si souhaité)
→ Rollout progressif :
  - 10% le jour 1
  - 50% le jour 2 (si stable)
  - 100% le jour 3
```

**Ou rollout complet** :
```
→ Rollout : 100% immédiatement
```

**Recommandation** : Vu que vous avez déjà des testeurs et pas d'utilisateurs actifs en production, vous pouvez faire **100% direct**.

---

## 🖼️ Étape 6 : Mise à Jour Store Listing

### Navigation
```
Menu gauche → Présence sur le Store → Fiche du Store → Graphiques
```

### Assets à Upload

1. **Icon App (512x512)** ✅
   - Fichier : `assets/ThomasSmall.png`
   - Vérifier dimensions et upload

2. **Feature Graphic (1024x500)** ⚠️
   - À créer (voir `PLAY_STORE_ASSETS_GUIDE.md`)
   - Bannière horizontale avec logo et slogan

3. **Screenshots (2-8 images)** ⚠️
   - Captures d'écran de l'app
   - Chat, Dashboard, Tâches, Observations
   - Idéalement 4-8 images

4. **Description** (Optionnel)
   - Mettre à jour si besoin
   - Template dans `PLAY_STORE_ASSETS_GUIDE.md`

**Note** : Ces modifications sont optionnelles et peuvent être faites après la publication.

---

## ✅ Étape 7 : Révision et Soumission

### 7.1 Vérifier le Récapitulatif

Avant de soumettre, vérifiez :
- [x] AAB uploadé avec succès
- [x] Version code : 30 (ou supérieur)
- [x] Version name : 2.0.0
- [x] Notes de version remplies
- [x] Rollout configuré
- [x] Pas d'erreurs ou avertissements

### 7.2 Pré-lancement (Automatique)

Google Play va automatiquement :
- Tester l'app sur plusieurs appareils
- Vérifier les crashes
- Tester les fonctionnalités de base
- Générer un rapport

**Durée** : 30 minutes à 2 heures

### 7.3 Soumettre pour Révision

1. Cliquer sur **"Enregistrer"**
2. Puis **"Examiner la version"**
3. Vérifier le résumé
4. Cliquer sur **"Déployer vers [Canal]"**

**Confirmation** :
```
✅ Version envoyée pour examen
```

---

## ⏱️ Étape 8 : Attendre la Révision

### Délais Typiques

- **Tests fermés (Alpha/Beta)** : Quelques heures (souvent immédiat)
- **Production** : 1-3 jours (généralement 24-48h)

### Statuts Possibles

1. **En cours d'examen** 🔄
   - Google analyse l'app
   - Rien à faire, attendre

2. **Approuvé** ✅
   - App publiée !
   - Visible sur Play Store selon rollout

3. **Modifications requises** ⚠️
   - Google demande des corrections
   - Voir email et Play Console pour détails
   - Corriger et re-soumettre

4. **Rejeté** ❌
   - Violation des règles Google Play
   - Lire le motif de rejet
   - Corriger et re-soumettre

---

## 📧 Étape 9 : Après Publication

### Vérifier la Publication

1. **Play Console** → **Dashboard**
   - Vérifier statut : "Publié"
   - Voir nombre d'installations

2. **Play Store Public**
   - Rechercher "Thomas" sur Play Store
   - Ou aller sur : `https://play.google.com/store/apps/details?id=marketgardener.thomas.v2`
   - Vérifier que tout s'affiche correctement

### Monitoring

1. **Crashes et ANR**
   ```
   Menu → Qualité → Rapports de crash Android
   ```
   - Surveiller les crashes
   - Corriger rapidement si taux élevé

2. **Avis Utilisateurs**
   ```
   Menu → Accroître l'audience → Avis
   ```
   - Lire les retours
   - Répondre aux avis (important pour le ranking)

3. **Statistiques**
   ```
   Menu → Statistiques → Présentation
   ```
   - Installations
   - Désinstallations
   - Évaluations

---

## 🚨 Résolution de Problèmes

### Erreur : "Version code must be greater"
**Cause** : Version code 30 n'est pas supérieur à la version actuelle

**Solution** :
1. Vérifier la dernière version publiée sur Play Console
2. Incrémenter version code dans `app.json`
3. Re-build avec EAS

### Erreur : "Signature mismatch"
**Cause** : La signature du AAB ne correspond pas à l'app existante

**Solution** :
- Si **Play App Signing activé** : Google gère automatiquement
- Si **pas activé** : Vous devez utiliser la même keystore que l'app originale

### Avertissement : "Permissions sensibles"
**Cause** : App demande CAMERA, MICROPHONE, LOCATION

**Solution** :
- Normal pour Thomas (photos, audio, localisation)
- Remplir le questionnaire "Data Safety" dans Play Console
- Expliquer pourquoi chaque permission est nécessaire

### Pré-lancement échoué
**Cause** : Crash au démarrage ou fonctionnalité critique cassée

**Solution** :
1. Lire le rapport de pré-lancement
2. Reproduire le bug localement
3. Corriger et re-build
4. Re-soumettre

---

## 📋 Checklist Finale

Avant de cliquer sur "Déployer" :

- [ ] AAB uploadé et validé
- [ ] Version code : 30 (> 28)
- [ ] Version name : 2.0.0
- [ ] Notes de version en français
- [ ] Rollout configuré (100% ou progressif)
- [ ] Pas d'erreurs critiques
- [ ] Rapport pré-lancement OK (si disponible)
- [ ] Assets store à jour (optionnel)
- [ ] Description store à jour (optionnel)

---

## 🎉 Félicitations !

Une fois publié, votre app Thomas V2 sera disponible sur Google Play Store ! 🚀

---

**Besoin d'aide ?**
- Documentation Google : https://support.google.com/googleplay/android-developer
- Support : support@thomas-app.com
