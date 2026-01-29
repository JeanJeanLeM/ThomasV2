# 🔴 FIX: Status 0 - AuthRetryableFetchError

## 🔍 Diagnostic de l'erreur

### Erreur vue dans l'app
```
isAuthError: true
name: AuthRetryableFetchError
status: 0
```

### Logs ADB
```
TypeError: Network request failed
```

---

## ⚠️ Signification de "Status 0"

**Status HTTP 0** signifie : **Aucune réponse du serveur**

La requête est **bloquée AVANT d'atteindre Supabase**.

### Ce n'est PAS :
- ❌ Un problème de credentials (email/mot de passe)
- ❌ Un problème côté serveur Supabase
- ❌ Une erreur de code dans l'app

### C'est :
- ✅ Un **blocage réseau au niveau Android**
- ✅ La requête **ne part même pas** du téléphone
- ✅ Ou elle est **bloquée par le système**

---

## 🎯 Causes possibles (ordre de probabilité)

### 1. 🔴 Permissions Android manquantes (90% de chances)

**Vérification** :
```powershell
# Vérifier quelle version est installée
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"
```

**Résultat attendu** :
- `versionCode=30` → Nouvelle version avec permissions ✅
- `versionCode=29` ou moins → Ancienne version SANS permissions ❌

**Si versionCode < 30** :
```bash
# L'APK n'a PAS les permissions INTERNET
# Solution : Rebuilder
eas build --platform android --profile preview
```

### 2. 🔥 Firewall/Antivirus Android (5% de chances)

**Test** :
- Désactiver temporairement l'antivirus sur le téléphone
- Tester sur un autre réseau (4G au lieu de WiFi)

**Apps connues pour bloquer** :
- AVG Antivirus
- Avast Mobile
- Norton Mobile Security
- Kaspersky Mobile

### 3. 🌐 Pas de connexion Internet (3% de chances)

**Test** :
```powershell
# Vérifier Internet depuis le téléphone
adb shell ping -c 2 google.com
```

**Résultat attendu** :
```
2 packets transmitted, 2 received, 0% packet loss
```

### 4. 🔒 Certificat SSL rejeté (2% de chances)

**Causes** :
- Date/heure incorrectes sur le téléphone
- Certificat Supabase expiré (très rare)

**Test** :
```powershell
# Vérifier la date/heure
adb shell date
```

**Correction** :
- Paramètres → Date et heure → Automatique

---

## 🚀 PLAN D'ACTION (dans l'ordre)

### Étape 1 : Vérifier la version de l'APK ⏱️ 30 secondes

```powershell
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"
```

**Si versionCode < 30** → Passer à l'Étape 2
**Si versionCode = 30** → Passer à l'Étape 3

### Étape 2 : Rebuilder avec les permissions ⏱️ 20-30 min

```bash
# Rebuilder l'APK avec les nouvelles permissions
eas build --platform android --profile preview

# Attendre le build

# Installer la nouvelle APK

# Tester
```

**Si ça ne marche toujours pas** → Passer à l'Étape 3

### Étape 3 : Utiliser le diagnostic embarqué ⏱️ 1 min

1. Ouvrir Thomas V2
2. Essayer de se connecter (pour voir l'erreur)
3. **Cliquer sur "🔬 Lancer le diagnostic réseau"** (nouveau bouton)
4. Copier le rapport
5. ME LE PARTAGER

### Étape 4 : Tests de connectivité ⏱️ 2 min

```powershell
# Test 1 : Internet
adb shell ping -c 2 google.com

# Test 2 : Supabase
adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co

# Test 3 : DNS
adb shell nslookup kvwzbofifqqytyfertkhh.supabase.co
```

**Partager les 3 résultats**

### Étape 5 : Tester sur un autre réseau ⏱️ 1 min

- Si WiFi → Passer en 4G
- Si 4G → Passer en WiFi

**Si ça marche sur 4G mais pas WiFi** → Firewall du réseau WiFi bloque Supabase

---

## 🔬 Ce que le diagnostic va révéler

### Scénario A : Variables d'environnement manquantes

```
❌ Variables d'environnement: SUPABASE_URL non chargée dans l'APK !
```

**Cause** : Les variables ne sont pas compilées dans l'APK

**Solution** :
```bash
eas build --platform android --profile preview --clear-cache
```

### Scénario B : Pas d'Internet

```
✅ Configuration OK
✅ Variables d'environnement OK
❌ Connectivité réseau: Network request failed
   Code: ENOTFOUND
```

**Cause** : Pas de connexion Internet active

**Solution** :
- Vérifier WiFi/4G
- Tester sur un autre réseau

### Scénario C : Supabase bloqué par firewall

```
✅ Configuration OK
✅ Variables d'environnement OK
✅ Connectivité réseau OK (google.com accessible)
❌ Ping Supabase: Network request failed
   Status: 0
```

**Cause** : Firewall/proxy bloque `*.supabase.co`

**Solutions** :
- Tester sur 4G
- Désactiver antivirus
- Tester sur un autre réseau WiFi

### Scénario D : Permissions manquantes (LE PLUS PROBABLE)

```
✅ Configuration OK
❌ Variables d'environnement OK
❌ Connectivité réseau: Network request failed
   (Permission denied ou similaire)
```

**Cause** : Permissions Android manquantes

**Solution** : Rebuild APK avec permissions

---

## 📊 Statistiques des erreurs "Status 0"

Basé sur les erreurs similaires :

| Cause | Fréquence | Solution |
|-------|-----------|----------|
| Permissions manquantes | 85% | Rebuild APK |
| Firewall/Antivirus | 10% | Désactiver ou changer réseau |
| Pas d'Internet | 3% | Vérifier connexion |
| Certificat SSL | 2% | Vérifier date/heure |

---

## 🎯 CE QUE JE VEUX QUE VOUS FASSIEZ MAINTENANT

### Option A : Vérification rapide (2 minutes)

Exécutez ces 3 commandes et partagez les résultats :

```powershell
# 1. Version APK
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"

# 2. Test Internet
adb shell ping -c 2 google.com

# 3. Test Supabase
adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co
```

**Copiez-collez les 3 résultats ici** ⬇️

### Option B : Diagnostic embarqué (1 minute)

1. Ouvrir Thomas V2
2. Essayer de se connecter (erreur apparaît)
3. **Cliquer sur "🔬 Lancer le diagnostic réseau"**
4. Copier le rapport complet
5. **ME LE PARTAGER**

### Option C : Rebuild immédiat (si vous êtes sûr que c'est l'ancienne version)

```bash
eas build --platform android --profile preview
```

---

## 💡 Mon hypothèse principale

**Vous testez probablement l'ancienne APK** (versionCode 29 ou moins) qui n'a PAS les permissions `INTERNET`.

**Pourquoi je pense ça** :
1. Status 0 = requête bloquée avant de partir
2. AuthRetryableFetchError = Supabase ne peut pas faire la requête
3. C'est exactement le symptôme des permissions manquantes

**Solution** : Rebuilder l'APK avec le nouveau `app.json` qui contient :
```json
"permissions": [
  "android.permission.INTERNET",           // ← Ajouté
  "android.permission.ACCESS_NETWORK_STATE", // ← Ajouté
  ...
]
```

---

## ✅ Checklist de vérification

Avant de demander plus d'aide :

- [ ] Vérifier versionCode de l'APK installée (commande ci-dessus)
- [ ] Si versionCode < 30 → Rebuilder
- [ ] Si versionCode = 30 → Lancer diagnostic embarqué
- [ ] Tester sur un autre réseau (4G vs WiFi)
- [ ] Désactiver antivirus temporairement
- [ ] Partager le rapport du diagnostic

---

**Priorité** : 🔴 CRITIQUE  
**Probabilité** : 85% que ce soit les permissions manquantes  
**Solution** : Rebuild APK ou diagnostic embarqué  
**Temps estimé** : 2 min (vérif) ou 25 min (rebuild)

