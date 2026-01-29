# 🍎 Guide Publication Apple App Store

## 🎯 Prérequis

- [x] Build IPA production créé
- [x] Bundle ID : `fr.thomas-assistant.mobile`
- [x] Version : 2.0.0
- [x] Build number : Incrémenté
- [x] Compte Apple Developer actif
- [x] Certificats iOS configurés dans EAS
- [x] Assets préparés (icon, screenshots, Privacy Label)
- [x] Accès à App Store Connect

---

## 📱 Étape 1 : Accéder à App Store Connect

1. Aller sur **https://appstoreconnect.apple.com**
2. Connectez-vous avec votre compte Apple Developer
3. Cliquer sur **"Mes Apps"**

---

## 🔑 Étape 1.5 : Créer le Bundle ID (IMPORTANT - Si N'existe Pas)

**⚠️ AVANT de créer l'app dans App Store Connect, le Bundle ID doit exister !**

Si vous obtenez une page inexistante ou une erreur, c'est probablement parce que le Bundle ID `fr.thomas-assistant.mobile` n'existe pas encore.

### Option 1 : Via Apple Developer Portal (Recommandé)

1. Aller sur **https://developer.apple.com/account**
2. Connectez-vous avec votre compte Apple Developer
3. Cliquer sur **"Certificates, Identifiers & Profiles"**
4. Dans le menu de gauche, cliquer sur **"Identifiers"**
5. Cliquer sur **"+"** en haut à gauche
6. Sélectionner **"App IDs"** → **"Continuer"**
7. Sélectionner **"App"** → **"Continuer"**
8. Remplir :
   - **Description** : `Thomas Assistant Mobile`
   - **Bundle ID** : Choisir **"Explicit"** et entrer `fr.thomas-assistant.mobile`
9. Cliquer **"Continuer"** → **"Enregistrer"**

### Option 2 : Via App Store Connect (Si disponible)

Parfois, le Bundle ID peut être créé automatiquement lors de la création de l'app. Mais si cela ne fonctionne pas, utilisez l'Option 1.

**Important** : Le Bundle ID doit correspondre exactement à celui dans `app.json` : `fr.thomas-assistant.mobile`

---

## 🆕 Étape 2 : Créer l'App dans App Store Connect

### 2.1 Créer Nouvelle App

1. Dans App Store Connect, cliquer sur **"+"** → **"Nouvelle app"**
2. Remplir le formulaire :
   - **Platformes** : Sélectionner **iOS** (cocher la case)
   - **Nom** : `Thomas - Assistant Agricole`
   - **Langue principale** : **Français (France)**
   - **Bundle ID** : Sélectionner `fr.thomas-assistant.mobile` dans la liste déroulante
     - ⚠️ Si le Bundle ID n'apparaît pas, retournez à l'Étape 1.5
   - **SKU** : `thomas-assistant-agricole-v2`
     - (SKU = identifiant unique interne, peut être n'importe quoi de unique)
3. Cliquer **"Créer"**

### 2.2 Si Vous Voyez "Page Inexistante"

**Causes possibles** :

1. **Bundle ID non créé** : Créez-le d'abord dans Apple Developer Portal (Étape 1.5)
2. **Permissions insuffisantes** : Vérifiez que vous avez les droits **"Admin"** ou **"Account Holder"**
3. **Compte non actif** : Vérifiez que votre compte Apple Developer est actif et payé

**Solution** :
- Créer le Bundle ID dans Developer Portal (Étape 1.5)
- Attendre 5-10 minutes pour la synchronisation
- Revenir à App Store Connect et réessayer

### 2.3 Si App Existe Déjà

- Aller dans **"Mes Apps"**
- Sélectionner l'app existante
- Vérifier que le Bundle ID correspond : `fr.thomas-assistant.mobile`

---

## 📦 Étape 3 : Upload du Build IPA

### 3.1 Via EAS Submit (Recommandé)

```bash
# Submit automatique vers App Store Connect
eas submit --platform ios --profile production
```

**Avantages** :
- Automatique
- Gère les credentials
- Upload direct

### 3.2 Via Transporter (Manuel)

1. Télécharger **Transporter** depuis Mac App Store
2. Ouvrir Transporter
3. Glisser-déposer le fichier `.ipa`
4. Cliquer **"Deliver"**
5. Attendre upload

### 3.3 Vérification Upload

1. Dans App Store Connect → **"TestFlight"**
2. Vérifier que le build apparaît
3. Attendre traitement (10-30 minutes)
4. Build prêt quand statut = "Prêt à soumettre"

---

## 📝 Étape 4 : App Information

### 4.1 Informations App

**Navigation** : App Store Connect → Votre App → **"App Information"**

Remplir :
- **Sous-titre** (max 30 chars) : "Assistant IA pour agriculteurs"
- **Catégorie principale** : Productivité
- **Catégorie secondaire** : Professionnel
- **URL Politique de confidentialité** : https://votre-site.com/privacy
- **Contact support** : support@thomas-app.com

---

## 🖼️ Étape 5 : Store Presence (Présence Store)

### 5.1 Screenshots

**Navigation** : **"Présence sur le Store"** → **"Fiche du Store"**

**Upload screenshots pour chaque taille** :

#### iPhone 6.5" (iPhone 14 Pro Max)
- Taille : 1290x2796
- Minimum : 3 screenshots
- Maximum : 10 screenshots

#### iPhone 5.5" (iPhone 8 Plus)
- Taille : 1242x2208
- Minimum : 3 screenshots
- Maximum : 10 screenshots

#### iPad Pro 12.9" (si support tablette)
- Taille : 2048x2732
- Minimum : 3 screenshots
- Maximum : 10 screenshots

**Ordre recommandé** :
1. Chat avec Thomas
2. Dashboard/Statistiques
3. Liste tâches
4. Observations terrain
5. Profil/Paramètres

### 5.2 App Preview (Optionnel)

- Upload vidéo 15-30 secondes
- Format : MP4, MOV, M4V
- Résolution : 1080p minimum

### 5.3 Description

**Template** (même que Google Play) :

```
🌾 Thomas - Votre Assistant IA Agricole Intelligent

Gérez votre exploitation agricole simplement et efficacement avec Thomas, l'assistant IA qui comprend le langage naturel français.

✨ FONCTIONNALITÉS PRINCIPALES

🤖 Agent IA Intelligent
• Communiquez naturellement
• Création automatique observations et tâches
• Reconnaissance parcelles et matériels

✅ Gestion Complète des Tâches
📊 Statistiques & Analytics
🏠 Multi-Exploitations
📱 Mode Offline
📸 Documents Centralisés

🔒 SÉCURITÉ & CONFIDENTIALITÉ
• Vos données sont cryptées
• Hébergement sécurisé
• Conformité RGPD

🌟 POURQUOI THOMAS ?
Thomas a été conçu par et pour des agriculteurs français.

💬 SUPPORT
Email : support@thomas-app.com

🚀 Téléchargez Thomas maintenant !
```

### 5.4 Mots-clés

**Max 100 caractères** :
```
agriculture,ferme,exploitation,tâches,IA,assistant,agriculteur,parcelle,observation
```

---

## 🔒 Étape 6 : Privacy Nutrition Label

**Navigation** : **"App Privacy"**

### 6.1 Data Types à Déclarer

#### Contact Info
- ✅ **Email** : Collecté
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### User Content
- ✅ **Photos** : Collecté
- ✅ **Documents** : Collecté
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### Identifiers
- ✅ **User ID** : Collecté
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### Usage Data
- ✅ **Product Interaction** : Collecté
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### Location
- ✅ **Location** : Collecté (si feature activée)
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

**Important** :
- ✅ Toutes les données sont **Linked to User** : Oui
- ✅ Toutes les données **Used for Tracking** : Non

---

## 📋 Étape 7 : Version Information

### 7.1 Sélectionner le Build

1. Aller dans **"Présence sur le Store"** → **"Version"**
2. Cliquer **"Sélectionner un build"**
3. Choisir le build uploadé (statut "Prêt à soumettre")
4. Confirmer

### 7.2 Notes de Version

**Template** (même que Google Play) :

```
🚀 Thomas V2 - Refonte complète !

✨ Nouveautés majeures :

🤖 Agent IA Thomas Amélioré
• Intelligence artificielle OpenAI GPT-4o-mini
• Compréhension naturelle du langage français

✅ Nouveau Système de Tâches
• Interface modernisée et intuitive

👁️ Observations Terrain Améliorées
• Documentation instantanée avec photos

📊 Dashboard Statistiques
• Métriques d'exploitation en temps réel

🏠 Gestion Multi-Exploitations
📱 Mode Offline Performant
📸 Documents Centralisés

🎨 Interface Modernisée
⚡ Performance Optimisée
🔒 Sécurité Renforcée

📱 Version 2.0.0
🌾 Conçu par des agriculteurs, pour des agriculteurs !
```

---

## ✅ Étape 8 : Soumission pour Révision

### 8.1 Export Compliance

**Question** : "Does your app use encryption?"

**Réponse** :
- ✅ **Oui** (HTTPS, Supabase encryption)
- Sélectionner : "My app uses encryption and I have completed the annual self-classification report"

**OU**

- ✅ **Non** (si vous déclarez seulement HTTPS standard)
- Sélectionner : "My app does not use encryption"

**Recommandation** : Répondre **"Oui"** et déclarer HTTPS standard.

### 8.2 Informations pour Révision

**Compte de démo** (si requis) :
- Email : demo@thomas-app.com
- Password : [Mot de passe temporaire]
- Notes : "Compte de test pour révision App Store"

**Notes pour reviewers** :
```
Bonjour,

Thomas est une application de gestion agricole avec assistant IA.

Pour tester :
1. Créer un compte (email/mot de passe)
2. Aller dans l'onglet Chat
3. Taper : "Bonjour Thomas"
4. L'agent IA répondra automatiquement

Fonctionnalités principales :
- Chat avec agent IA
- Gestion tâches avec photos
- Observations terrain
- Mode offline

Merci pour votre révision !
```

### 8.3 Soumettre

1. Vérifier récapitulatif
2. Cliquer **"Envoyer pour examen"**
3. Confirmation : "Votre app a été soumise pour examen"

---

## ⏱️ Étape 9 : Attendre la Révision

### Délais Typiques

- **Première soumission** : 24-48 heures
- **Mises à jour** : 24-48 heures
- **Re-soumission après corrections** : 24-48 heures

### Statuts Possibles

1. **En attente d'examen** 🔄
   - Apple analyse l'app
   - Rien à faire, attendre

2. **En examen** 🔍
   - Apple teste l'app
   - Durée : quelques heures

3. **En attente de publication** ✅
   - Approuvé !
   - Prêt à publier
   - Cliquer "Publier" pour rendre disponible

4. **Rejeté** ❌
   - Violation des règles App Store
   - Lire le motif de rejet
   - Corriger et re-soumettre

---

## 📧 Étape 10 : Après Publication

### Vérifier la Publication

1. **App Store Connect** → **"Présence sur le Store"**
   - Vérifier statut : "Prêt à vendre"

2. **App Store Public**
   - Rechercher "Thomas" sur App Store
   - Ou aller sur : `https://apps.apple.com/app/id[APP_ID]`
   - Vérifier que tout s'affiche correctement

### Monitoring

1. **Analytics**
   ```
   App Store Connect → Analytics
   ```
   - Installations
   - Utilisateurs actifs
   - Crashes
   - Métriques de performance

2. **Reviews**
   ```
   App Store Connect → Reviews
   ```
   - Lire les reviews
   - Répondre aux reviews (important)

3. **TestFlight Feedback**
   ```
   App Store Connect → TestFlight → Feedback
   ```
   - Lire feedback testeurs
   - Corriger bugs signalés

---

## 🚨 Résolution de Problèmes

### ❌ Problème : "Page Inexistante" ou Erreur 404 en créant l'App

**Symptômes** :
- Vous cliquez sur **"+"** → **"Nouvelle app"**
- Vous choisissez **"App Store"**
- Vous êtes redirigé vers une page d'erreur ou page inexistante

**Causes possibles** :

1. **Bundle ID n'existe pas** (Cause la plus fréquente) ⚠️
   - Le Bundle ID `fr.thomas-assistant.mobile` n'a pas été créé dans Apple Developer Portal
   - App Store Connect ne peut pas créer une app sans Bundle ID existant

2. **Permissions insuffisantes**
   - Vous n'avez pas les droits **"Admin"** ou **"Account Holder"**
   - Vérifiez vos permissions dans App Store Connect → **"Users and Access"**

3. **Compte Apple Developer non actif**
   - Votre abonnement annuel peut avoir expiré
   - Vérifiez dans **https://developer.apple.com/account**

**Solutions** :

#### Solution 1 : Créer le Bundle ID (Recommandé)

1. Aller sur **https://developer.apple.com/account**
2. **"Certificates, Identifiers & Profiles"** → **"Identifiers"**
3. Cliquer **"+"** → Sélectionner **"App IDs"** → **"App"**
4. Créer le Bundle ID : `fr.thomas-assistant.mobile`
5. Attendre 5-10 minutes pour la synchronisation
6. Retourner à App Store Connect et réessayer

#### Solution 2 : Vérifier les Permissions

1. Dans App Store Connect → **"Users and Access"**
2. Vérifiez que vous avez le rôle **"Admin"** ou **"Account Holder"**
3. Si non, demandez à un Admin de vous donner les permissions

#### Solution 3 : Vérifier le Compte

1. Aller sur **https://developer.apple.com/account**
2. Vérifier que votre compte est actif
3. Si expiré, renouvelez votre abonnement Apple Developer

---

### Erreur : "Invalid Bundle"
**Cause** : Bundle ID ne correspond pas

**Solution** :
1. Vérifier Bundle ID dans `app.json` : `fr.thomas-assistant.mobile`
2. Vérifier Bundle ID dans App Store Connect
3. Re-build si nécessaire

### Erreur : "Missing Compliance"
**Cause** : Export Compliance non rempli

**Solution** :
- Remplir Export Compliance (voir Étape 8.1)
- Déclarer encryption si utilisé

### Rejet : "Guideline 2.1 - Performance"
**Cause** : Feature manquante ou non-fonctionnelle

**Solution** :
1. Lire message rejection complet
2. Fournir compte démo fonctionnel
3. Ajouter notes détaillées pour reviewers
4. Fix problème et re-soumettre

### Rejet : "Guideline 5.1.1 - Privacy"
**Cause** : Privacy Nutrition Label incomplet

**Solution** :
1. Compléter Privacy Nutrition Label
2. Déclarer toutes les données collectées
3. Re-soumettre

---

## 📋 Checklist Finale

Avant de soumettre :

- [ ] IPA uploadé et traité
- [ ] Build sélectionné dans version
- [ ] Screenshots uploadés (toutes tailles)
- [ ] Description complète
- [ ] Privacy Nutrition Label complété
- [ ] Notes de version remplies
- [ ] Export Compliance rempli
- [ ] Compte démo fourni (si requis)
- [ ] Notes pour reviewers ajoutées

---

## 🎉 Félicitations !

Une fois publié, votre app Thomas V2 sera disponible sur Apple App Store ! 🍎

---

**Besoin d'aide ?**
- Documentation Apple : https://developer.apple.com/app-store-connect/
- Support : support@thomas-app.com
