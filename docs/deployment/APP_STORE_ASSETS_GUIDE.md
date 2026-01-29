# 🍎 Guide Assets Apple App Store

## 📋 Assets Requis iOS

### 1. Icon App (1024x1024) ⚠️ À VÉRIFIER

**Spécifications** :
- Taille : 1024x1024 pixels exactement
- Format : PNG (sans transparence)
- Poids max : 500KB
- Pas de transparence (fond opaque requis)

**Fichier actuel** : `assets/ThomasSmall.png`

**Vérification** :
- [ ] Dimensions : 1024x1024 pixels
- [ ] Format : PNG sans transparence
- [ ] Qualité : Net et lisible
- [ ] Fond opaque (pas de transparence)

**Si besoin de redimensionner** :
- Utiliser GIMP, Photoshop, ou Canva
- Exporter en PNG sans transparence
- Fond opaque requis

---

### 2. Screenshots (Obligatoires par Taille) ⚠️ À CRÉER

**IMPORTANT** : Apple exige des screenshots pour **chaque taille d'écran** !

#### iPhone 6.5" (iPhone 14 Pro Max, iPhone 13 Pro Max)
- **Taille** : 1290x2796 pixels
- **Minimum** : 3 screenshots
- **Maximum** : 10 screenshots

#### iPhone 5.5" (iPhone 8 Plus)
- **Taille** : 1242x2208 pixels
- **Minimum** : 3 screenshots
- **Maximum** : 10 screenshots

#### iPad Pro 12.9" (si support tablette)
- **Taille** : 2048x2732 pixels
- **Minimum** : 3 screenshots
- **Maximum** : 10 screenshots

**Screenshots à prendre** (même contenu que Android) :
1. Chat avec Thomas Agent
2. Dashboard/Statistiques
3. Liste des tâches
4. Observations terrain
5. Profil/Paramètres

**Comment créer** :
- Utiliser iPhone Simulator (Xcode)
- Installer l'app
- Prendre screenshots (Cmd+S)
- Ou utiliser device physique + redimensionner

---

### 3. App Preview Vidéo (Optionnel mais Recommandé)

**Spécifications** :
- Durée : 15-30 secondes
- Format : MP4, MOV, ou M4V
- Résolution : 1080p minimum
- Poids max : 500MB

**Contenu suggéré** :
- 0-5s : Logo Thomas + slogan
- 5-15s : Démo rapide du chat IA
- 15-25s : Aperçu des fonctionnalités (tâches, observations)
- 25-30s : Call to action "Téléchargez maintenant"

**Outils** :
- **OBS Studio** : Enregistrement écran gratuit
- **DaVinci Resolve** : Montage vidéo gratuit
- **Canva Video** : Montage simple en ligne

---

## 📝 Contenu Store iOS

### Description App (Max 4000 caractères)

**Même template que Google Play** (voir `PLAY_STORE_ASSETS_GUIDE.md`)

---

### Sous-titre (Max 30 caractères)

```
Assistant IA pour agriculteurs
```

ou

```
Gestion exploitation intelligente
```

---

### Mots-clés (Max 100 caractères)

```
agriculture,ferme,exploitation,tâches,IA,assistant,agriculteur,parcelle,observation
```

---

### Privacy Nutrition Label ⚠️ IMPORTANT

Apple exige un **Privacy Nutrition Label** complet.

**Data Types à déclarer** :

#### Contact Info
- ✅ Email (pour compte utilisateur)
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### User Content
- ✅ Photos (observations, tâches)
- ✅ Documents (factures, certificats)
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### Identifiers
- ✅ User ID (Supabase auth)
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### Usage Data
- ✅ Product Interaction (analytics usage app)
- **Purpose** : App Functionality, Analytics (si activé)
- **Linked to User** : Oui
- **Used for Tracking** : Non

#### Location
- ✅ Location (si feature localisation)
- **Purpose** : App Functionality
- **Linked to User** : Oui
- **Used for Tracking** : Non

**Important** :
- ✅ **Linked to User** : Oui (toutes les données)
- ✅ **Used for Tracking** : Non (pas de tracking publicitaire)

---

### Notes de Version

**Même template que Google Play** (voir `PLAY_STORE_ASSETS_GUIDE.md`)

---

## ✅ Checklist Assets iOS

### Obligatoires
- [ ] Icon app 1024x1024 (sans transparence)
- [ ] Screenshots iPhone 6.5" (min 3)
- [ ] Screenshots iPhone 5.5" (min 3)
- [ ] Screenshots iPad 12.9" (min 3, si support tablette)
- [ ] Description app
- [ ] Sous-titre
- [ ] Mots-clés
- [ ] Privacy Nutrition Label complété
- [ ] Notes de version

### Recommandés
- [ ] App Preview vidéo (15-30s)
- [ ] 5-10 screenshots par taille
- [ ] Screenshots avec annotations

---

## 🛠️ Outils Utiles

### Design
- **Canva** : Templates App Store
- **Figma** : Design professionnel
- **GIMP** : Gratuit

### Screenshots
- **Xcode Simulator** : Screenshots iPhone/iPad
- **Screely** : Mockups téléphone

### Vidéo
- **OBS Studio** : Enregistrement écran
- **DaVinci Resolve** : Montage vidéo

---

**Une fois les assets prêts, on pourra configurer App Store Connect !** 🍎
