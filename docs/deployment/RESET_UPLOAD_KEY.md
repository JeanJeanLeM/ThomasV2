# 🔄 Réinitialiser la Clé d'Importation (Upload Key)

## 🚨 Situation

- **Clé d'importation actuelle dans Play Console** : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`
- **Clé utilisée par EAS** : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`
- **Problème** : Les deux clés ne correspondent pas

---

## ✅ Solution : Réinitialiser la Clé d'Importation

Google Play Console permet de réinitialiser la clé d'importation pour utiliser une nouvelle clé.

### ⚠️ IMPORTANT AVANT DE CONTINUER

**Réinitialiser la clé d'importation signifie** :
- ✅ Vous pourrez utiliser la nouvelle clé EAS
- ⚠️ Vous ne pourrez PLUS utiliser l'ancienne clé
- ⚠️ Assurez-vous d'avoir sauvegardé la nouvelle clé EAS

**La nouvelle clé EAS est sauvegardée** :
- ✅ Dans EAS (gérée automatiquement)
- ✅ Localement : `@jeanjeanlem__thomas-v2-mobile.jks` (à la racine du projet)

---

## 📋 Étapes pour Réinitialiser

### 1. Dans Google Play Console

1. **Aller dans** : Configuration de l'app → App signing
2. **Section** : "Certificat de clé d'importation"
3. **Cliquer sur** : **"Demander la réinitialisation de la clé d'importation"**

### 2. Processus de Réinitialisation

Google va vous demander :

1. **Confirmer la réinitialisation**
   - Lire les avertissements
   - Comprendre que l'ancienne clé ne fonctionnera plus

2. **Uploader le nouveau certificat**
   - Google peut extraire automatiquement depuis le AAB uploadé
   - OU vous pouvez uploader le certificat manuellement

3. **Validation**
   - Google va vérifier le certificat
   - Enregistrer la nouvelle clé d'importation

### 3. Après Réinitialisation

1. **Vérifier la nouvelle empreinte**
   - Dans Play Console → App signing
   - L'empreinte SHA-1 devrait être : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

2. **Re-uploader le AAB**
   - Uploader le même AAB (ou un nouveau build)
   - Google devrait maintenant l'accepter

---

## 🔐 Extraire le Certificat depuis la Keystore EAS

Si Google demande le certificat manuellement :

### Option A : Depuis la Keystore

```bash
# Extraire le certificat depuis la keystore EAS
keytool -exportcert -alias key0 -keystore "@jeanjeanlem__thomas-v2-mobile.jks" -file upload_certificate.pem

# Si l'alias est différent, lister d'abord :
keytool -list -keystore "@jeanjeanlem__thomas-v2-mobile.jks"
```

### Option B : Depuis le AAB

```bash
# Extraire le certificat depuis le AAB
jarsigner -verify -verbose -certs your-app.aab > cert_info.txt
# Puis extraire le certificat depuis cert_info.txt
```

---

## 📝 Checklist

Avant de réinitialiser :
- [ ] Comprendre que l'ancienne clé ne fonctionnera plus
- [ ] Avoir sauvegardé la nouvelle clé EAS (`@jeanjeanlem__thomas-v2-mobile.jks`)
- [ ] Avoir le mot de passe de la keystore EAS (si nécessaire)

Après réinitialisation :
- [ ] Nouvelle empreinte SHA-1 vérifiée dans Play Console
- [ ] AAB re-uploadé
- [ ] AAB accepté par Google Play

---

## 🆘 Si la Réinitialisation Échoue

1. **Vérifier les permissions**
   - Vous devez être admin/owner de l'app
   - Certaines actions nécessitent des permissions spécifiques

2. **Vérifier le format du certificat**
   - Google accepte généralement `.pem` ou `.der`
   - Format X.509 standard

3. **Contacter le Support Google Play**
   - Si le processus échoue
   - Support : https://support.google.com/googleplay/android-developer

---

## ✅ Alternative : Utiliser l'Ancienne Clé

Si vous préférez garder l'ancienne clé (et que vous l'avez) :

1. **Télécharger la clé d'importation depuis Play Console** (si disponible)
2. **Configurer EAS pour utiliser cette clé** :
   ```bash
   eas credentials
   # Sélectionner : Android → Set up credentials for production
   # Sélectionner : Use existing keystore
   # Uploader l'ancienne keystore
   ```
3. **Re-build** avec l'ancienne clé

**Mais** : Si vous n'avez pas l'ancienne keystore, cette option n'est pas possible.

---

## 🎯 Recommandation

**Réinitialiser la clé d'importation** est la solution la plus simple si :
- ✅ Vous n'avez pas l'ancienne keystore
- ✅ Vous voulez utiliser la nouvelle clé EAS
- ✅ Vous avez sauvegardé la nouvelle clé

**C'est la solution recommandée dans votre cas !** 🔄

---

**Une fois réinitialisée, vous pourrez uploader le AAB sans problème !** 🚀
