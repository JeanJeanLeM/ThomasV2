# ⚡ Commandes Rapides - Builds et Publication

## 📱 Android

### Build Preview (APK pour tests)
```bash
eas build --platform android --profile preview --clear-cache
```

### Build Production (AAB pour Play Store)
```bash
eas build --platform android --profile production
```

### Lister les Builds
```bash
eas build:list --platform android --limit 5
```

### Télécharger un Build
```bash
eas build:download --id [BUILD_ID] --output ./thomas-v2-production.aab
```

### Soumettre vers Play Store (Automatique)
```bash
eas submit --platform android --profile production
```

**Note** : Nécessite `google-play-service-account.json` configuré dans `eas.json`

---

## 🍎 iOS

### Build Preview (IPA pour TestFlight)
```bash
eas build --platform ios --profile preview
```

### Build Production (IPA pour App Store)
```bash
eas build --platform ios --profile production
```

### Lister les Builds iOS
```bash
eas build:list --platform ios --limit 5
```

### Télécharger un Build iOS
```bash
eas build:download --id [BUILD_ID] --output ./thomas-v2-production.ipa
```

### Soumettre vers App Store (Automatique)
```bash
eas submit --platform ios --profile production
```

**Note** : Nécessite credentials Apple configurés dans `eas.json`

---

## 🔍 Vérifications

### Vérifier Configuration
```bash
eas build:configure
```

### Vérifier Credentials
```bash
eas credentials
```

### Vérifier Version
```bash
cat app.json | grep -A 2 "version"
```

---

## 📊 Statut Builds

### Voir Builds en Cours
```bash
eas build:list --status in-progress
```

### Voir Dernier Build
```bash
eas build:list --platform android --limit 1
eas build:list --platform ios --limit 1
```

---

## 🧹 Nettoyage

### Clear Cache Build
```bash
eas build --platform android --profile preview --clear-cache
```

### Clear Credentials (si problème)
```bash
eas credentials
# Puis sélectionner "Remove credentials"
```

---

## 📝 Notes

- **Build Preview** : ~10-15 minutes
- **Build Production** : ~15-20 minutes
- **Upload Play Store** : ~5-10 minutes
- **Upload App Store** : ~10-15 minutes (via Transporter)

---

## 🚀 Workflow Recommandé

### 1. Test APK Preview
```bash
eas build --platform android --profile preview
# Tester l'APK
```

### 2. Build Production Android
```bash
eas build --platform android --profile production
# Upload manuel sur Play Console
```

### 3. Build Production iOS
```bash
eas build --platform ios --profile production
# Upload via Transporter ou eas submit
```

---

**Besoin d'aide ?** Voir les guides détaillés :
- `PUBLICATION_PLAY_STORE_GUIDE.md`
- `PUBLICATION_APP_STORE_GUIDE.md`
