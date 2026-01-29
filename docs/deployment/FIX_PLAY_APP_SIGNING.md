# 🔐 Résolution - Play App Signing Activé mais Erreur de Signature

## 🚨 Problème

Play App Signing est activé ("Signature par Google Play") mais Google Play Console rejette quand même le AAB avec l'erreur "Mauvaise clé de signature".

**Cause probable** : La nouvelle clé d'upload n'a pas été enregistrée dans Play App Signing.

---

## ✅ Solution : Enregistrer la Clé d'Upload

Quand Play App Signing est activé, Google utilise deux clés :
1. **Clé de production** : Gérée par Google (jamais changée)
2. **Clé d'upload** : Votre clé pour signer les bundles avant upload

Si vous changez de clé d'upload (nouveau build EAS), il faut l'enregistrer dans Play App Signing.

---

## 📋 Étapes pour Enregistrer la Nouvelle Clé d'Upload

### 1. Aller dans Play App Signing

1. **Google Play Console** → Votre app "Thomas"
2. **Menu gauche** → **Configuration de l'app** → **App signing**
3. Vous devriez voir :
   - **Signature d'application** : "Signature par Google Play" ✅
   - **Clé d'upload** : Section avec l'empreinte actuelle

### 2. Obtenir l'Empreinte de la Nouvelle Clé

Le AAB actuel est signé avec la clé EAS. Obtenez son empreinte SHA1 :

**Option A : Depuis le AAB**
```bash
# Télécharger le AAB si pas déjà fait
# Puis extraire le certificat
jarsigner -verify -verbose -certs path/to/your.aab | findstr SHA1
```

**Option B : Depuis la keystore EAS**
```bash
# Si vous avez accès à la keystore EAS
keytool -list -v -keystore "@jeanjeanlem__thomas-v2-mobile.jks"
```

L'empreinte devrait être : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`

### 3. Enregistrer la Nouvelle Clé d'Upload

Dans Play Console → App signing :

1. **Chercher la section "Clé d'upload"**
2. **Cliquer sur "Ajouter une nouvelle clé d'upload"** ou **"Télécharger le certificat d'upload"**
3. **Deux options possibles** :

   **Option A : Uploader le certificat**
   - Extraire le certificat depuis le AAB ou la keystore
   - Uploader le fichier `.pem` ou `.der`
   
   **Option B : Télécharger le certificat depuis le AAB**
   - Google peut extraire automatiquement depuis le AAB uploadé
   - Suivre les instructions dans Play Console

4. **Confirmer l'enregistrement**
   - Google va enregistrer cette clé comme nouvelle clé d'upload
   - Les futurs AAB signés avec cette clé seront acceptés

### 4. Re-uploader le AAB

Une fois la clé enregistrée :
1. Re-uploader le même AAB (ou un nouveau build)
2. Google devrait maintenant l'accepter

---

## 🔍 Vérification

### Vérifier que la Clé est Enregistrée

Dans Play Console → App signing → Clé d'upload :
- L'empreinte SHA1 devrait correspondre à : `58:B6:F0:13:40:AB:8A:F4:4A:21:E9:92:F5:11:94:F3:E5:F3:54:10`
- Statut : "Active" ou "Enregistrée"

### Si l'Empreinte Ne Correspond Pas

Si l'empreinte dans Play Console est différente :
- C'est normal si vous avez changé de clé EAS
- Il faut enregistrer la nouvelle clé comme upload key

---

## 🚨 Si "Ajouter une Nouvelle Clé" N'Apparaît Pas

Si vous ne voyez pas l'option pour ajouter une nouvelle clé :

1. **Vérifier que Play App Signing est vraiment activé**
   - Statut doit être "Signature par Google Play"
   - Pas "Signature manuelle"

2. **Vérifier les Permissions**
   - Vous devez être admin ou owner de l'app
   - Certaines actions nécessitent des permissions spécifiques

3. **Contacter le Support Google Play**
   - Si l'option n'apparaît pas, il peut y avoir un problème de configuration
   - Support : https://support.google.com/googleplay/android-developer

---

## 📝 Alternative : Utiliser la Clé d'Upload Existante

Si vous préférez utiliser la clé d'upload existante (empreinte `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`) :

1. **Télécharger la clé d'upload depuis Play Console**
   - Play Console → App signing → Clé d'upload
   - Option "Télécharger" (si disponible)

2. **Uploader vers EAS**
   ```bash
   eas credentials
   # Sélectionner : Android → Set up credentials for production
   # Sélectionner : Use existing keystore
   # Uploader la clé téléchargée
   ```

3. **Re-build**
   ```bash
   eas build --platform android --profile production
   ```

---

## ✅ Checklist

- [ ] Play App Signing activé (vérifié ✅)
- [ ] Empreinte SHA1 de la nouvelle clé obtenue
- [ ] Nouvelle clé enregistrée dans Play Console
- [ ] AAB re-uploadé
- [ ] AAB accepté par Google Play

---

## 🆘 Si Rien Ne Fonctionne

1. **Vérifier les logs Play Console**
   - Messages d'erreur détaillés
   - Historique des uploads

2. **Vérifier la Configuration EAS**
   - `eas credentials:list` pour voir les credentials
   - Vérifier que la bonne keystore est utilisée

3. **Contacter Support**
   - Support Google Play : https://support.google.com/googleplay/android-developer
   - Support Expo EAS : https://expo.dev/support

---

**La solution la plus probable : Enregistrer la nouvelle clé d'upload dans Play App Signing !** 🔐
