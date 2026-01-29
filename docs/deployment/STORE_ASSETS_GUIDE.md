# 📱 Guide de Préparation des Assets Google Play Store

## 🎨 Assets Disponibles

Vous avez déjà ces fichiers dans `assets/` :
- ✅ `ThomasSmall.png` - Icon app
- ✅ `Logocolorfull.png` - Icon flat pour adaptive icon et favicon
- ✅ `LogoFull.png` - Logo complet

## 📋 Assets Requis pour Google Play Console

### 1. Icon App (512x512) ✅
**Statut** : Déjà disponible
- Fichier : `ThomasSmall.png`
- Taille requise : 512x512 pixels
- Format : PNG 32-bit avec transparence

**Action** : Vérifier que l'image fait bien 512x512. Si besoin, redimensionner.

### 2. Feature Graphic (1024x500) ⚠️
**Statut** : À créer
- Taille : 1024x500 pixels
- Format : PNG ou JPG
- Contenu suggéré :
  - Logo Thomas au centre
  - Slogan : "Assistant IA Agricole Intelligent"
  - Fond vert (#22c55e) avec dégradé
  - Éléments visuels : icônes agriculture, chat IA

**Outils recommandés** :
- Canva (template "Google Play Feature Graphic")
- Figma
- Photoshop
- GIMP (gratuit)

**Template suggéré** :
```
[Logo Thomas]
Thomas V2
Assistant IA pour Agriculteurs
```

### 3. Screenshots (Minimum 2, Idéal 4-8) ⚠️
**Statut** : À créer
- Taille recommandée : 1080x1920 (portrait) ou 1920x1080 (landscape)
- Format : PNG ou JPG
- Poids max : 8MB par image

**Screenshots suggérés** :
1. **Écran Chat avec Thomas Agent**
   - Montrer une conversation naturelle
   - Exemple : "J'ai observé des pucerons sur mes tomates"
   - Réponse de Thomas avec suggestions

2. **Dashboard / Statistiques**
   - Vue d'ensemble de l'exploitation
   - Graphiques et métriques
   - Tâches en cours

3. **Liste des Tâches**
   - Tâches terminées et planifiées
   - Avec photos et descriptions
   - Filtres et recherche

4. **Observations Terrain**
   - Observation avec photo
   - Catégorisation (maladie, ravageur, météo)
   - Localisation parcelle

5. **Gestion Parcelles/Matériels**
   - Liste des parcelles
   - Informations détaillées
   - Carte si disponible

6. **Profil / Paramètres**
   - Gestion ferme
   - Multi-exploitations
   - Paramètres utilisateur

**Comment créer les screenshots** :
1. Lancer l'app sur un émulateur Android
2. Naviguer vers chaque écran
3. Prendre des captures (Ctrl+S dans l'émulateur)
4. Ou utiliser un vrai device et transférer les images

**Améliorer les screenshots** :
- Ajouter un cadre de téléphone (mockup)
- Ajouter des annotations/légendes
- Utiliser des outils comme :
  - Screely.com
  - MockUPhone.com
  - Figma avec templates

### 4. Vidéo Promo (Optionnel) 💡
**Statut** : Optionnel mais recommandé
- Durée : 15-30 secondes
- Format : MP4, WebM, AVI
- Taille max : 30 secondes
- Résolution : 1080p minimum

**Contenu suggéré** :
- 0-5s : Logo Thomas + slogan
- 5-15s : Démo rapide du chat IA
- 15-25s : Aperçu des fonctionnalités (tâches, observations)
- 25-30s : Call to action "Téléchargez maintenant"

## 📝 Description Store (Déjà Préparée)

Voir le template complet dans `agents/07_PUBLISHER_DEPLOYMENT.md` lignes 767-842.

**Résumé** :
```
🌾 Thomas - Votre Assistant IA Agricole Intelligent

Gérez votre exploitation agricole simplement et efficacement avec Thomas, 
l'assistant IA qui comprend le langage naturel français.

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

[...]
```

## 🎯 Checklist Assets

### Obligatoires
- [ ] Icon app 512x512 (vérifier dimensions)
- [ ] Feature Graphic 1024x500 (à créer)
- [ ] Minimum 2 screenshots (à créer)
- [ ] Description store (déjà prête)
- [ ] Notes de version (déjà prêtes)

### Recommandés
- [ ] 4-8 screenshots de qualité
- [ ] Screenshots avec mockups téléphone
- [ ] Vidéo promo 15-30s
- [ ] Feature Graphic professionnelle

### Optionnels
- [ ] Screenshots avec annotations
- [ ] Bannière promotionnelle
- [ ] Assets pour différentes tailles d'écran

## 🛠️ Outils Utiles

### Design
- **Canva** : Templates Google Play prêts à l'emploi
- **Figma** : Design professionnel
- **GIMP** : Gratuit et puissant

### Screenshots
- **Android Studio Emulator** : Captures d'écran intégrées
- **Screely** : Ajouter des mockups
- **MockUPhone** : Cadres de téléphone

### Vidéo
- **OBS Studio** : Enregistrement écran gratuit
- **DaVinci Resolve** : Montage vidéo gratuit
- **Canva Video** : Montage simple en ligne

## 📐 Dimensions Exactes

```
Icon App:           512 x 512 px (PNG, 32-bit)
Feature Graphic:    1024 x 500 px (PNG/JPG)
Screenshots:        1080 x 1920 px (portrait) ou 1920 x 1080 (landscape)
Promo Video:        1920 x 1080 px (16:9), max 30s
```

## 🎨 Charte Graphique Thomas

**Couleurs** :
- Vert principal : `#22c55e`
- Fond splash : `#22c55e`
- Texte : Noir/Blanc selon fond

**Style** :
- Moderne et épuré
- Icônes claires et reconnaissables
- Typographie lisible
- Ambiance agricole mais tech

## 📤 Upload sur Play Console

Une fois les assets prêts :

1. **Play Console** → Votre app → **Présence sur le Store** → **Fiche du Store**

2. **Graphics** :
   - Upload Icon (512x512)
   - Upload Feature Graphic (1024x500)
   - Upload Screenshots (2-8 images)
   - Upload Promo Video (optionnel)

3. **Enregistrer** et **Publier**

## ✅ Validation

Avant de publier, vérifiez :
- [ ] Toutes les images sont nettes (pas floues)
- [ ] Pas de texte trop petit (illisible)
- [ ] Cohérence visuelle entre les assets
- [ ] Respect des dimensions exactes
- [ ] Pas de contenu protégé par copyright
- [ ] Respect des guidelines Google Play

## 🚀 Prochaines Étapes

1. ✅ Créer Feature Graphic (1024x500)
2. ✅ Prendre 4-8 screenshots de l'app
3. ✅ Optionnel : Créer vidéo promo
4. ✅ Upload sur Play Console
5. ✅ Vérifier le rendu dans la prévisualisation
6. ✅ Publier !

---

**Besoin d'aide ?** Consultez :
- Guide Google Play : https://support.google.com/googleplay/android-developer/answer/9866151
- Templates Canva : https://www.canva.com/templates/
- Agent référence : `agents/07_PUBLISHER_DEPLOYMENT.md`

