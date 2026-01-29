# 🔍 Recherche de la Keystore Originale

## 📊 Résultat de la Vérification

### Keystore Trouvée : `@jeanjeanlem__Thomas.bak.jks`

**Empreinte SHA-1** : `B9:7D:C4:11:3F:2C:99:35:1B:F7:D0:CB:5A:17:A0:7A:0A:0D:81:C2`

**Empreinte Attendue** : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`

**Résultat** : ❌ **Ne correspond PAS**

---

## 🔍 Prochaines Étapes

### 1. Chercher d'Autres Keystores dans l'Ancien Projet

Dans le dossier de l'application 1.0, chercher :
- `*.jks`
- `*.keystore`
- `*.p12`
- `*.pfx`
- Fichiers avec "key", "sign", "release" dans le nom

**Commandes pour chercher** :
```bash
# Windows PowerShell
Get-ChildItem -Path "C:\chemin\vers\ancien\projet" -Recurse -Include *.jks,*.keystore,*.p12,*.pfx

# Ou chercher dans le dossier parent
Get-ChildItem -Path ".." -Recurse -Include *.jks,*.keystore
```

### 2. Vérifier Chaque Keystore Trouvée

Pour chaque keystore trouvée :

```bash
keytool -list -v -keystore path/to/keystore.jks | findstr SHA1
```

**Comparer avec** : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`

### 3. Si Trouvée, Configurer EAS

Si vous trouvez la keystore qui correspond :

```bash
eas credentials
```

Puis :
1. Android → Set up credentials for production
2. Use existing keystore
3. Uploader la keystore qui correspond
4. Entrer le mot de passe
5. Entrer l'alias (si demandé)

---

## 📁 Emplacements à Vérifier

### Dans l'Ancien Projet (Application 1.0)

1. **Racine du projet**
   - `*.jks`
   - `*.keystore`
   - `release.keystore`
   - `thomas.keystore`

2. **Dossier `android/app/`**
   - `android/app/*.jks`
   - `android/app/*.keystore`

3. **Dossier `android/`**
   - `android/*.jks`
   - `android/*.keystore`

4. **Fichiers de configuration**
   - `gradle.properties` (peut contenir le chemin)
   - `build.gradle` (peut contenir des références)

5. **Sauvegardes**
   - Dossier `backup/`
   - Dossier `saved/`
   - Fichiers `.bak`

### Autres Emplacements

- **Sauvegardes cloud** : Google Drive, Dropbox, OneDrive
- **Autres ordinateurs** : Si vous avez buildé sur plusieurs machines
- **Emails** : Si vous avez envoyé la keystore quelque part
- **Serveurs de build** : Si vous avez utilisé CI/CD

---

## 🔑 Informations Utiles

### Alias de la Keystore

L'alias de la keystore `.bak.jks` est : `150567ea43afd701d465ccdf8ca2f6cd`

**Si vous trouvez d'autres keystores**, l'alias peut être différent, mais l'empreinte SHA-1 doit correspondre.

### Date de Création

La keystore `.bak.jks` a été créée le : **21 août 2025**

**La keystore originale** devrait avoir une date similaire ou antérieure.

---

## ✅ Si Vous Trouvez la Bonne Keystore

### Vérification

L'empreinte SHA-1 doit être exactement : `CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04`

### Configuration EAS

```bash
eas credentials
```

Puis suivre les prompts pour uploader la keystore.

### Re-build

```bash
eas build --platform android --profile production
```

Le nouveau AAB sera signé avec la bonne clé et sera accepté par Play Console.

---

## ⚠️ Si Vous Ne Trouvez Pas la Keystore

Si après avoir cherché partout vous ne trouvez pas la keystore originale :

**Solution** : Réinitialiser la clé dans Play Console (24-48h)

Voir : `docs/deployment/RESET_KEY_STEPS.md`

---

## 📋 Checklist de Recherche

- [ ] Chercher dans l'ancien projet (Application 1.0)
- [ ] Chercher `*.jks` et `*.keystore`
- [ ] Vérifier `android/app/` et `android/`
- [ ] Vérifier les fichiers de configuration
- [ ] Vérifier les sauvegardes cloud
- [ ] Vérifier les autres ordinateurs
- [ ] Vérifier les emails
- [ ] Pour chaque keystore trouvée, vérifier l'empreinte SHA-1
- [ ] Si trouvée, configurer EAS
- [ ] Si pas trouvée, réinitialiser dans Play Console

---

**Continuez à chercher dans l'ancien projet - la keystore doit être quelque part !** 🔍
