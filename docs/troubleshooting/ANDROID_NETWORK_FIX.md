# 🔴 FIX URGENT: Network request failed sur APK Android

## 🔍 Diagnostic

### Symptômes
- ✅ Application fonctionne en développement (Expo Go)
- ❌ Sur APK: "Network request failed" lors de la connexion/inscription
- ❌ Impossible de communiquer avec Supabase

### Cause identifiée
**PERMISSIONS RÉSEAU ANDROID MANQUANTES** dans `app.json`

L'application Android **n'a pas les permissions pour accéder à Internet** !

## 🛠️ Solution

### Étape 1: Ajouter les permissions dans `app.json`

Les permissions suivantes sont **OBLIGATOIRES** pour les requêtes réseau :

```json
"android": {
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION"
  ]
}
```

### Étape 2: Créer un network_security_config.xml (optionnel mais recommandé)

Pour gérer les certificats SSL et autoriser le trafic HTTPS.

**Fichier**: `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Autoriser le trafic HTTPS pour tous les domaines -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
    
    <!-- Configuration spécifique pour Supabase -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">supabase.co</domain>
        <domain includeSubdomains="true">kvwzbofifqqytyfertkhh.supabase.co</domain>
    </domain-config>
</network-security-config>
```

### Étape 3: Référencer dans AndroidManifest.xml (si vous avez un projet bare)

Si vous êtes en workflow bare (pas managed), ajouter dans `AndroidManifest.xml`:

```xml
<application
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

## ⚡ Commandes pour rebuild

### Option 1: Build Preview (APK rapide)
```bash
eas build --platform android --profile preview
```

### Option 2: Build Development
```bash
eas build --platform android --profile development
```

### Option 3: Build Production
```bash
eas build --platform android --profile production
```

## 🧪 Vérifications post-build

### 1. Vérifier les permissions dans l'APK

Après avoir construit l'APK, vérifier les permissions:

```bash
aapt dump permissions votre-app.apk
```

Vous devez voir:
```
uses-permission: name='android.permission.INTERNET'
uses-permission: name='android.permission.ACCESS_NETWORK_STATE'
```

### 2. Tester la connexion

Sur votre appareil Android, essayer de:
1. Créer un compte
2. Se connecter
3. Vérifier les logs dans Logcat

```bash
adb logcat | grep -i "supabase\|auth\|network"
```

## 📋 Checklist de déploiement

Avant chaque build APK:

- [ ] Permissions INTERNET et ACCESS_NETWORK_STATE dans app.json
- [ ] Variables d'environnement dans eas.json (déjà ✅)
- [ ] URL Supabase correcte (déjà ✅)
- [ ] Clé ANON_KEY correcte (déjà ✅)
- [ ] network_security_config.xml créé (optionnel)
- [ ] Version incrémentée (versionCode)
- [ ] Test sur appareil physique

## 🎯 Configuration actuelle vs Configuration correcte

### ❌ AVANT (problème)
```json
"android": {
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION"
  ]
}
```

### ✅ APRÈS (corrigé)
```json
"android": {
  "permissions": [
    "android.permission.INTERNET",              // 🔴 CRITIQUE - MANQUANT
    "android.permission.ACCESS_NETWORK_STATE",  // 🔴 CRITIQUE - MANQUANT
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION"
  ]
}
```

## 🔬 Autres causes possibles (si le problème persiste)

### 1. Certificat SSL invalide
**Solution**: Vérifier que votre URL Supabase utilise HTTPS (déjà le cas ✅)

### 2. Firewall ou proxy réseau
**Solution**: Tester sur un réseau différent (4G/5G au lieu du WiFi)

### 3. Variables d'environnement non compilées
**Solution**: Les variables sont dans eas.json, donc elles sont compilées ✅

### 4. DNS ou problème réseau temporaire
**Solution**: 
```bash
# Tester la connectivité depuis l'appareil
adb shell ping supabase.co
adb shell ping kvwzbofifqqytyfertkhh.supabase.co
```

### 5. URL Supabase incorrecte
**Vérification actuelle**:
```
URL: https://kvwzbofifqqytyfertkhh.supabase.co
ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ Format correct

## 📱 Test rapide après correction

### Script de test de connectivité

Créer un fichier `test-network-android.js`:

```javascript
import { supabase } from './src/utils/supabase';

export async function testNetworkAndroid() {
  console.log('🧪 Test réseau Android...');
  
  try {
    // Test 1: Ping Supabase
    console.log('Test 1: Connexion Supabase...');
    const { error: pingError } = await supabase.auth.getSession();
    if (pingError) {
      console.error('❌ Erreur ping Supabase:', pingError);
      return false;
    }
    console.log('✅ Connexion Supabase OK');
    
    // Test 2: Créer un compte de test
    console.log('Test 2: Création compte test...');
    const testEmail = `test-${Date.now()}@thomas.test`;
    const { error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });
    
    if (signupError) {
      console.error('❌ Erreur signup:', signupError);
      return false;
    }
    console.log('✅ Signup OK');
    
    return true;
  } catch (error) {
    console.error('❌ Test échoué:', error);
    return false;
  }
}
```

## 🚀 Actions immédiates

1. **Modifier app.json** (correction ci-dessous)
2. **Rebuild l'APK** avec EAS Build
3. **Installer la nouvelle APK**
4. **Tester la connexion**

## 🎓 Explication technique

### Pourquoi ça fonctionne en dev mais pas en APK ?

**En développement (Expo Go)**:
- Expo Go a déjà TOUTES les permissions Android déclarées
- Votre app hérite de ces permissions

**En production (APK standalone)**:
- Android créé un APK avec UNIQUEMENT les permissions que vous déclarez
- Si INTERNET n'est pas déclaré → Android BLOQUE toutes les requêtes réseau
- Résultat: "Network request failed"

### Sécurité Android

Android nécessite que CHAQUE permission soit explicitement déclarée dans le manifest.
C'est une mesure de sécurité pour que l'utilisateur sache ce que l'app peut faire.

**Permissions obligatoires pour une app réseau**:
- `INTERNET` → Faire des requêtes HTTP/HTTPS
- `ACCESS_NETWORK_STATE` → Vérifier si le réseau est disponible

---

**Date de création**: 6 janvier 2026  
**Priorité**: 🔴 CRITIQUE  
**Temps estimé**: 10 minutes + rebuild (15-30 minutes)

