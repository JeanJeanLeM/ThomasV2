# 🚨 FIX: Network request failed - Android APK

## 🎯 Problème
Erreur "Network request failed" lors de la connexion/inscription sur l'APK Android.

## ✅ Solution (APPLIQUÉE)

J'ai corrigé le fichier `app.json` en ajoutant les **permissions réseau Android manquantes** :

### Modifications effectuées

**Fichier: `app.json`**
- ✅ Ajout de `"android.permission.INTERNET"`
- ✅ Ajout de `"android.permission.ACCESS_NETWORK_STATE"`
- ✅ Incrémentation de `versionCode` de 29 à 30

### Configuration avant (❌ incorrect)
```json
"permissions": [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  ...
]
```

### Configuration après (✅ correct)
```json
"permissions": [
  "android.permission.INTERNET",              // 🆕 AJOUTÉ
  "android.permission.ACCESS_NETWORK_STATE",  // 🆕 AJOUTÉ
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  ...
]
```

---

## 🚀 Actions à effectuer MAINTENANT

### 1. Rebuild l'APK avec les nouvelles permissions

```bash
# Option A: Preview (APK rapide pour test)
eas build --platform android --profile preview

# Option B: Production (Google Play Store)
eas build --platform android --profile production
```

### 2. Installer la nouvelle APK

Une fois le build terminé (15-30 minutes):
1. Télécharger l'APK depuis le lien EAS
2. Désinstaller l'ancienne version sur votre appareil
3. Installer la nouvelle APK
4. Tester la connexion

### 3. Tester

✅ **Créer un nouveau compte**
```
Email: test@votredomaine.com
Mot de passe: Test123456!
Prénom: Test
Nom: User
```

✅ **Se connecter à un compte existant**

---

## 🔍 Vérification des permissions

Pour vérifier que les permissions sont bien présentes dans l'APK:

```bash
# Télécharger l'APK
# Puis vérifier les permissions avec aapt (Android Asset Packaging Tool)
aapt dump permissions thomas-v2.apk | grep INTERNET
```

Vous devriez voir:
```
uses-permission: name='android.permission.INTERNET'
uses-permission: name='android.permission.ACCESS_NETWORK_STATE'
```

---

## 📱 Test sur l'appareil

### Logs ADB (optionnel)

Pour voir les logs en temps réel:

```bash
# Connecter l'appareil en USB avec debug activé
adb logcat | grep -i "network\|supabase\|auth"
```

### Messages attendus

**✅ Succès:**
```
✅ [AUTH] Session trouvée
✅ [AUTH] Utilisateur validé: test@example.com
```

**❌ Échec (si le problème persiste):**
```
❌ Network request failed
❌ Failed to connect to supabase.co
```

---

## ⚠️ Si le problème persiste après le rebuild

### Checklist de dépannage

1. **Vérifier le réseau de l'appareil**
   - [ ] WiFi ou données mobiles activées
   - [ ] Connexion Internet fonctionnelle (tester avec navigateur)
   - [ ] Essayer sur un autre réseau (4G au lieu de WiFi)

2. **Vérifier les variables d'environnement**
   ```bash
   # Elles sont dans eas.json (déjà vérifié ✅)
   EXPO_PUBLIC_SUPABASE_URL=https://kvwzbofifqqytyfertkhh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```

3. **Vérifier la configuration Supabase**
   - [ ] Projet Supabase actif
   - [ ] URL correcte
   - [ ] Anon key valide

4. **Problème de certificat SSL**
   - Tester depuis un navigateur sur l'appareil:
   ```
   https://kvwzbofifqqytyfertkhh.supabase.co/auth/v1/health
   ```
   - Devrait retourner un JSON

5. **Firewall ou antivirus**
   - Certains antivirus Android bloquent les connexions
   - Désactiver temporairement pour tester

---

## 📊 Timeline estimée

| Étape | Durée |
|-------|-------|
| Build EAS | 15-30 min |
| Téléchargement APK | 1-2 min |
| Installation | 1 min |
| Test connexion | 1 min |
| **TOTAL** | **~20-35 min** |

---

## 🎓 Explication technique

### Pourquoi ça marchait en dev mais pas en APK ?

**Expo Go (développement)**:
- Contient TOUTES les permissions Android par défaut
- Votre app hérite de ces permissions

**APK standalone (production)**:
- Contient UNIQUEMENT les permissions que VOUS déclarez
- Sans `INTERNET` → Android bloque TOUTES les requêtes réseau
- Résultat: "Network request failed"

### Permissions Android critiques

```xml
<!-- Obligatoire pour faire des requêtes HTTP/HTTPS -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Recommandé pour vérifier l'état du réseau -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

Sans ces permissions, Android refuse TOUTES les connexions réseau par sécurité.

---

## 📚 Documentation

- **Fichier de diagnostic détaillé**: `ANDROID_NETWORK_FIX.md`
- **Script de test**: `scripts/test-android-network.js`
- **Documentation auth**: `AUTH_CONNEXION_DOCUMENTATION.md`

---

## ✅ Confirmation de correction

Une fois le rebuild effectué, confirmer que:

- [ ] L'APK s'installe correctement
- [ ] La création de compte fonctionne
- [ ] La connexion fonctionne
- [ ] Pas d'erreur "Network request failed"
- [ ] Les données se chargent (fermes, profil, etc.)

---

## 💬 Support

Si le problème persiste après le rebuild avec les permissions:

1. Vérifier les logs ADB
2. Tester sur un autre appareil
3. Tester sur un autre réseau
4. Vérifier la configuration Supabase dans le dashboard

---

**Date**: 6 janvier 2026  
**Priorité**: 🔴 CRITIQUE  
**Status**: ✅ CORRIGÉ (rebuild nécessaire)  
**Version corrigée**: versionCode 30

