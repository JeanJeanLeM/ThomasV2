# 🔄 Réinitialiser la Clé - Guide Rapide

## ✅ Certificat Prêt !

Le certificat a été extrait : **`upload_certificate.pem`**

---

## 📋 Étapes dans Google Play Console

### 1. Aller dans App Signing
- **Play Console** → App "Thomas" → **Configuration de l'app** → **App signing**

### 2. Réinitialiser la Clé
- Section **"Certificat de clé d'importation"**
- Cliquer **"Demander la réinitialisation de la clé d'importation"**

### 3. Uploader le Certificat
- Google va demander le nouveau certificat
- **Uploader le fichier** : `upload_certificate.pem` (à la racine du projet)
- Ou laisser Google extraire automatiquement depuis le AAB uploadé

### 4. Confirmer
- Google va enregistrer la nouvelle clé
- L'empreinte SHA-1 devrait devenir : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

### 5. Re-uploader le AAB
- Une fois la clé réinitialisée, re-uploader le AAB
- Google devrait maintenant l'accepter ✅

---

## 📁 Fichier Certificat

**Emplacement** : `upload_certificate.pem` (à la racine du projet)

Si Google demande le certificat manuellement, uploader ce fichier.

---

## ⚠️ Important

- L'ancienne clé ne fonctionnera plus après réinitialisation
- La nouvelle clé EAS est sauvegardée et gérée automatiquement
- Pas de risque de perte

---

**C'est tout ! Une fois réinitialisée, vous pourrez uploader le AAB !** 🚀
