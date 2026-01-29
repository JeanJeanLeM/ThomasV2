# 🚀 Build, Déploiement & Publication

Documentation complète du build, déploiement, et publication sur les stores (Google Play, App Store).

## 📋 Contenu

### **Guides de Déploiement**
- **DEPLOYMENT_README.md** ⭐ - README déploiement complet
- **QUICK_START_DEPLOYMENT.md** - Démarrage rapide déploiement
- **PRODUCTION_DEPLOYMENT_CHECKLIST.md** - Checklist production

### **Configuration & Status**
- **DEPLOYMENT_CONFIG_STATUS.md** - Status configuration
- **DEPLOYMENT_FINAL_STATUS.md** - Status final déploiement
- **DEPLOYMENT_STATUS_FINAL.md** - Status déploiement final

### **Build & EAS**
- **SETUP_EAS_MANUAL.md** - Configuration manuelle EAS Build
- **BUILD_CRASH_DEBUG.md** - Debug crash build
- **USE_FIRST_BUILD.md** - Utilisation premier build

### **Publication Stores**
- **PLAY_CONSOLE_UPLOAD_GUIDE.md** - Upload Google Play Console
- **STORE_ASSETS_GUIDE.md** - Assets stores (icônes, screenshots)

### **Supabase Edge Functions**
- **EDGE_FUNCTIONS_DEPLOYMENT_SUCCESS.md** - Déploiement edge functions

## 🎯 Par Où Commencer ?

1. **Setup initial** → `SETUP_EAS_MANUAL.md`
2. **Premier build** → `USE_FIRST_BUILD.md`
3. **Production** → `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
4. **Publication** → `PLAY_CONSOLE_UPLOAD_GUIDE.md`

## 🏗️ Build avec EAS (Expo Application Services)

### **Prérequis**
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### **Builds Disponibles**

#### **Development**
```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

#### **Preview (Test)**
```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

#### **Production**
```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

## 📱 Publication Stores

### **Google Play Console**
1. Build production Android (`eas build --profile production --platform android`)
2. Télécharger AAB depuis EAS
3. Upload sur Play Console
4. Remplir fiche store (description, screenshots, etc.)
5. Soumettre pour review

### **Apple App Store**
1. Build production iOS (`eas build --profile production --platform ios`)
2. Télécharger IPA depuis EAS
3. Upload via Transporter ou Xcode
4. Configurer App Store Connect
5. Soumettre pour review

## 🔧 Configuration

### **eas.json**
```json
{
  "build": {
    "development": { ... },
    "preview": { ... },
    "production": { ... }
  }
}
```

### **app.json**
```json
{
  "expo": {
    "name": "Thomas Agent",
    "slug": "thomas-v2",
    "version": "2.0.0",
    ...
  }
}
```

## ☁️ Supabase Edge Functions

### **Déploiement**
```bash
cd supabase/functions
supabase functions deploy thomas-agent-v2
supabase functions deploy match-prompt
```

### **Secrets**
```bash
supabase secrets set ANTHROPIC_API_KEY=your_key
supabase secrets set OPENAI_API_KEY=your_key
```

## ✅ Checklist Production

### **Code & Tests**
- [ ] Tous les tests passent
- [ ] Pas d'erreurs linter
- [ ] Code review OK
- [ ] Version incrémentée

### **Configuration**
- [ ] Variables d'env configurées
- [ ] API keys en production
- [ ] Supabase projet production
- [ ] Analytics configuré

### **Build**
- [ ] Build Android OK
- [ ] Build iOS OK
- [ ] Taille APK/IPA acceptable
- [ ] Permissions correctes

### **Stores**
- [ ] Assets stores créés
- [ ] Descriptions rédigées
- [ ] Screenshots générés
- [ ] Policies acceptées

## 🐛 Troubleshooting

**Build crash ?** → `BUILD_CRASH_DEBUG.md`  
**Erreur EAS ?** → `SETUP_EAS_MANUAL.md`  
**Problème store ?** → `PLAY_CONSOLE_UPLOAD_GUIDE.md`

## 🔗 Liens Utiles

- **EAS Build** : https://docs.expo.dev/build/introduction/
- **Play Console** : https://play.google.com/console
- **App Store Connect** : https://appstoreconnect.apple.com
- **Supabase CLI** : https://supabase.com/docs/reference/cli

---

**12 documents** | Build EAS, déploiement production, publication stores




