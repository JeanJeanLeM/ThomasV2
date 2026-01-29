# 🔐 Résolution Problème Signature Android

## 🚨 Problème

Google Play Console rejette le AAB avec l'erreur :
```
Votre Android App Bundle a été signé avec la mauvaise clé.
```

**Empreintes SHA1** :
- **Attendue** : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`
- **Utilisée** : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

---

## ✅ Solution 1 : Activer Play App Signing (RECOMMANDÉ)

**Play App Signing** permet à Google de gérer la signature automatiquement. Vous pouvez uploader avec n'importe quelle clé, Google la re-signera avec la clé de production.

### Étapes

1. **Aller sur Google Play Console**
   - https://play.google.com/console
   - Sélectionner l'app "Thomas"

2. **Activer Play App Signing**
   ```
   Menu gauche → Configuration de l'app → App signing
   → Activer Play App Signing
   ```

3. **Si déjà activé** :
   - Vérifier que l'option "Upload key certificate" est configurée
   - Google acceptera votre nouvelle clé comme "upload key"

4. **Re-uploader le AAB**
   - Google Play acceptera le bundle signé avec la nouvelle clé
   - Google le re-signera automatiquement avec la clé de production

**Avantages** :
- ✅ Pas besoin de gérer la keystore originale
- ✅ Google gère la sécurité
- ✅ Récupération automatique en cas de perte de clé

---

## ✅ Solution 2 : Utiliser la Keystore Originale

Si Play App Signing n'est pas activé ou si vous préférez utiliser la même keystore :

### Option A : Uploader la Keystore vers EAS

1. **Trouver la keystore originale**
   - Fichier `.jks` ou `.keystore`
   - Généralement nommé `release.keystore` ou `thomas.keystore`
   - Si vous ne l'avez plus, voir Option B

2. **Uploader vers EAS**
   ```bash
   eas credentials
   # Sélectionner : Android
   # Sélectionner : Set up credentials for production
   # Sélectionner : Use existing keystore
   # Uploader le fichier .jks ou .keystore
   # Entrer le mot de passe
   # Entrer l'alias (généralement "key0")
   # Entrer le mot de passe de l'alias
   ```

3. **Re-build avec la keystore**
   ```bash
   eas build --platform android --profile production
   ```

### Option B : Si la Keystore est Perdue

**⚠️ ATTENTION** : Si vous n'avez plus la keystore originale, vous devez :

1. **Activer Play App Signing** (Solution 1)
   - C'est la seule solution si la keystore est perdue
   - Google peut migrer automatiquement

2. **OU créer une nouvelle app** (dernier recours)
   - Créer une nouvelle app dans Play Console
   - Nouveau package name
   - Perdre les utilisateurs existants

---

## 🔍 Vérifier l'Empreinte de la Keystore

### Si vous avez la keystore :

```bash
# Windows (PowerShell)
keytool -list -v -keystore path/to/your.keystore

# Entrer le mot de passe
# Chercher "SHA1: CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04"
```

### Vérifier l'empreinte du AAB actuel :

```bash
# Windows (PowerShell)
jarsigner -verify -verbose -certs path/to/your.aab

# Ou utiliser apksigner (Android SDK)
apksigner verify --print-certs path/to/your.aab
```

---

## 📋 Checklist Résolution

### Si Play App Signing activé :
- [ ] Vérifier que Play App Signing est actif dans Play Console
- [ ] Re-uploader le AAB
- [ ] Google devrait l'accepter automatiquement

### Si utilisation keystore originale :
- [ ] Trouver la keystore originale (.jks ou .keystore)
- [ ] Uploader vers EAS avec `eas credentials`
- [ ] Re-build avec `eas build --platform android --profile production`
- [ ] Vérifier l'empreinte SHA1 du nouveau AAB
- [ ] Uploader sur Play Console

---

## 🚀 Commandes Rapides

### Uploader keystore vers EAS
```bash
eas credentials
# Suivre les prompts interactifs
```

### Re-build avec nouvelle configuration
```bash
eas build --platform android --profile production --clear-cache
```

### Vérifier credentials EAS
```bash
eas credentials:list
```

---

## ⚠️ Important

- **Ne partagez JAMAIS votre keystore** ou son mot de passe
- **Sauvegardez votre keystore** dans un endroit sûr
- **Play App Signing** est la solution la plus sûre et recommandée
- Si vous perdez la keystore et que Play App Signing n'est pas activé, vous ne pourrez plus mettre à jour l'app

---

## 📞 Support

Si vous avez besoin d'aide :
- Documentation EAS : https://docs.expo.dev/app-signing/app-credentials/
- Documentation Google : https://support.google.com/googleplay/android-developer/answer/9842756

---

**Recommandation** : Activez Play App Signing dans Google Play Console, c'est la solution la plus simple et la plus sûre ! 🔐
