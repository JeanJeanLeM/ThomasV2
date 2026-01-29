# 🔐 Solution Rapide - Problème Signature

## 🚨 Problème
Google Play Console rejette le AAB : "Mauvaise clé de signature"

**Empreinte attendue** : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`  
**Empreinte actuelle** : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

---

## ✅ Solution Rapide (2 minutes)

### Option 1 : Activer Play App Signing (RECOMMANDÉ)

1. **Aller sur Google Play Console**
   - https://play.google.com/console
   - Sélectionner app "Thomas"

2. **Activer Play App Signing**
   ```
   Menu gauche → Configuration de l'app → App signing
   → Cliquer "Activer Play App Signing"
   ```

3. **Re-uploader le AAB**
   - Google acceptera automatiquement votre bundle
   - Google le re-signera avec la clé de production

**✅ C'est tout !** Google gère la signature automatiquement.

---

### Option 2 : Utiliser la Keystore Originale

**Si vous avez la keystore originale** (.jks ou .keystore) :

1. **Uploader vers EAS**
   ```bash
   eas credentials
   ```
   - Sélectionner : Android
   - Sélectionner : Set up credentials for production
   - Sélectionner : Use existing keystore
   - Uploader votre fichier .jks
   - Entrer le mot de passe et l'alias

2. **Re-build**
   ```bash
   eas build --platform android --profile production
   ```

3. **Uploader le nouveau AAB**

---

## 📋 Quelle Solution Choisir ?

- **✅ Option 1 (Play App Signing)** : Si vous n'avez pas la keystore originale OU si vous voulez la solution la plus simple
- **✅ Option 2 (Keystore originale)** : Si vous avez la keystore et préférez la contrôler vous-même

**Recommandation** : Option 1 (Play App Signing) - Plus simple et plus sûr !

---

## 📖 Guide Complet

Voir `docs/deployment/FIX_SIGNING_KEY.md` pour plus de détails.

---

**Une fois résolu, re-uploader le AAB sur Play Console !** 🚀
