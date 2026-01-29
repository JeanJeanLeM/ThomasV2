# 🔄 Réinitialiser la Clé d'Importation - Étapes Détaillées

## 🎯 Objectif

Réinitialiser la clé d'importation dans Google Play Console pour utiliser la nouvelle clé EAS.

**Empreinte actuelle** : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`  
**Nouvelle empreinte** : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

---

## 📋 Étapes dans Google Play Console

### 1. Accéder à App Signing

1. Aller sur **https://play.google.com/console**
2. Sélectionner l'app **"Thomas"** (marketgardener.thomas.v2)
3. **Menu gauche** → **Configuration de l'app** → **App signing**

### 2. Trouver la Section "Certificat de clé d'importation"

Vous devriez voir :
- **Signature d'application** : "Signature par Google Play" ✅
- **Certificat de clé d'importation** : Section avec l'empreinte actuelle

### 3. Cliquer sur "Demander la réinitialisation de la clé d'importation"

1. Dans la section **"Certificat de clé d'importation"**
2. Chercher le lien/bouton : **"Demander la réinitialisation de la clé d'importation"**
3. Cliquer dessus

### 4. Suivre le Processus de Réinitialisation

Google va vous demander :

#### Étape A : Confirmer la Réinitialisation
- Lire les avertissements
- Comprendre que l'ancienne clé ne fonctionnera plus
- Confirmer que vous voulez continuer

#### Étape B : Uploader le Nouveau Certificat

**Option 1 : Google Extrait Automatiquement (Recommandé)**
- Si vous avez déjà uploadé le AAB, Google peut détecter automatiquement la nouvelle clé
- Suivre les instructions à l'écran

**Option 2 : Uploader le Certificat Manuellement**

Si Google demande le certificat manuellement, extraire depuis la keystore EAS :

```bash
# Extraire le certificat depuis la keystore EAS
keytool -exportcert -alias key0 -keystore "@jeanjeanlem__thomas-v2-mobile.jks" -file upload_certificate.pem -storepass [MOT_DE_PASSE]
```

**Si vous ne connaissez pas le mot de passe** :
- EAS peut avoir généré la keystore sans mot de passe
- Essayer sans `-storepass` :
  ```bash
  keytool -exportcert -alias key0 -keystore "@jeanjeanlem__thomas-v2-mobile.jks" -file upload_certificate.pem
  ```

**Si l'alias est différent** :
- Lister d'abord les alias :
  ```bash
  keytool -list -keystore "@jeanjeanlem__thomas-v2-mobile.jks"
  ```
- Utiliser le bon alias dans la commande d'export

#### Étape C : Validation
- Google va vérifier le certificat
- Enregistrer la nouvelle clé d'importation
- Confirmation : "Clé d'importation réinitialisée avec succès"

### 5. Vérifier la Nouvelle Clé

Après réinitialisation :
1. Dans **App signing** → **Certificat de clé d'importation**
2. Vérifier que l'empreinte SHA-1 est maintenant : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

### 6. Re-uploader le AAB

1. Aller dans **Production** → **Releases** → **Créer une nouvelle version**
2. Uploader le même AAB (ou un nouveau build)
3. Google devrait maintenant l'accepter ✅

---

## 🔐 Extraire le Certificat (Si Nécessaire)

Si Google demande le certificat manuellement :

### Méthode 1 : Depuis la Keystore EAS

```bash
# Essayer sans mot de passe d'abord
keytool -exportcert -alias key0 -keystore "@jeanjeanlem__thomas-v2-mobile.jks" -file upload_certificate.pem

# Si ça ne marche pas, essayer avec mot de passe (si vous le connaissez)
keytool -exportcert -alias key0 -keystore "@jeanjeanlem__thomas-v2-mobile.jks" -file upload_certificate.pem -storepass [MOT_DE_PASSE]
```

### Méthode 2 : Depuis le AAB

```bash
# Télécharger le AAB d'abord depuis EAS
# Puis extraire le certificat
jarsigner -verify -verbose -certs your-app.aab > cert_info.txt
# Extraire le certificat depuis cert_info.txt et le convertir en .pem
```

---

## ⚠️ Important

- **L'ancienne clé ne fonctionnera plus** après réinitialisation
- **La nouvelle clé EAS est sauvegardée** : `@jeanjeanlem__thomas-v2-mobile.jks`
- **EAS gère aussi cette clé** automatiquement
- **Pas de risque de perte** : la clé est sauvegardée dans EAS

---

## ✅ Checklist

- [ ] Aller dans Play Console → App signing
- [ ] Cliquer "Demander la réinitialisation de la clé d'importation"
- [ ] Suivre le processus de réinitialisation
- [ ] Uploader le certificat (si demandé)
- [ ] Vérifier la nouvelle empreinte SHA-1
- [ ] Re-uploader le AAB
- [ ] AAB accepté par Google Play ✅

---

## 🆘 Si Problème

1. **Vérifier les permissions** : Vous devez être admin/owner
2. **Vérifier le format** : Google accepte généralement `.pem` ou `.der`
3. **Support Google Play** : https://support.google.com/googleplay/android-developer

---

**Une fois réinitialisée, vous pourrez uploader le AAB sans problème !** 🚀
