# 🚨 INSTRUCTIONS IMMÉDIATES

## ✅ Modifications appliquées (il y a 2 minutes)

### 1. Bouton de diagnostic ajouté ✅

Quand vous voyez l'erreur de connexion, un **bouton vert apparaît maintenant** :

```
🔬 Lancer le diagnostic réseau
```

Cliquez dessus pour ouvrir l'écran de diagnostic.

### 2. Fichier de diagnostic créé

`FIX_STATUS_0_ERROR.md` - Explication de l'erreur "Status 0"

---

## 🎯 CE QUE VOUS DEVEZ FAIRE MAINTENANT (2 options)

### Option A : Test rapide (⏱️ 2 minutes) - RECOMMANDÉ

Exécutez ces **3 commandes** dans PowerShell et partagez les résultats :

```powershell
# 1. Quelle version de l'APK est installée ?
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"

# 2. Internet fonctionne sur le téléphone ?
adb shell ping -c 2 google.com

# 3. Supabase accessible depuis le téléphone ?
adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co
```

**➡️ Copiez-collez les 3 résultats ici**

Cela me dira EXACTEMENT quel est le problème.

---

### Option B : Rebuild avec le nouveau bouton (⏱️ 25 minutes)

```bash
# Rebuilder l'APK avec le bouton de diagnostic
eas build --platform android --profile preview

# Attendre 20-30 min

# Installer la nouvelle APK

# Ouvrir Thomas V2
# Essayer de se connecter
# Cliquer sur "🔬 Lancer le diagnostic réseau"
# Copier le rapport
# ME LE PARTAGER
```

---

## 🔍 Analyse de votre erreur

### Ce que vous voyez :
```
isAuthError: true
name: AuthRetryableFetchError
status: 0
```

### Ce que ça signifie :

**Status 0** = **La requête n'atteint JAMAIS le serveur Supabase**

Elle est bloquée **AVANT de partir** du téléphone.

### Causes possibles :

| Cause | Probabilité | Comment vérifier |
|-------|-------------|------------------|
| **Permissions manquantes** | 85% | versionCode < 30 ? |
| Firewall bloque l'app | 10% | Marche sur 4G mais pas WiFi ? |
| Pas d'Internet | 3% | ping google.com échoue ? |
| Certificat SSL | 2% | Date/heure incorrectes ? |

---

## 📊 Diagnostic rapide

### Si versionCode = 29 ou moins ➡️ C'est les permissions !

```
versionCode=29 (ou moins)
```

**Problème** : L'APK n'a PAS la permission `INTERNET`

**Solution** : Rebuilder avec le nouveau `app.json`

### Si versionCode = 30 ➡️ Autre problème

```
versionCode=30 (ou plus)
```

**Les permissions sont présentes**, donc c'est probablement :
- Firewall du réseau WiFi
- Antivirus Android
- Problème de certificat SSL

**Solution** : Lancer le diagnostic embarqué pour identifier

---

## 🎯 Ma recommandation

### Étape 1 : Vérification version (30 secondes)

```powershell
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"
```

**Réponse attendue** :
- Si `versionCode=30` ou plus ➡️ Passez à l'étape 2
- Si `versionCode=29` ou moins ➡️ Passez à l'étape 3

### Étape 2 : Si versionCode ≥ 30 (diagnostic)

Les permissions sont présentes, donc il faut diagnostiquer plus en détail.

**Dans l'app** :
1. Essayer de se connecter (erreur apparaît)
2. Cliquer sur "🔬 Lancer le diagnostic réseau"
3. Copier le rapport complet
4. ME LE PARTAGER

### Étape 3 : Si versionCode < 30 (rebuild)

Les permissions ne sont PAS dans l'APK.

```bash
# Rebuilder avec les permissions
eas build --platform android --profile preview
```

---

## 💬 RÉPONDEZ-MOI

### Question 1 : Quel est le versionCode ?

```powershell
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"
```

**Résultat** : _______________

### Question 2 : Internet fonctionne ?

```powershell
adb shell ping -c 2 google.com
```

**Résultat** : _______________

### Question 3 : Supabase accessible ?

```powershell
adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co
```

**Résultat** : _______________

---

## 🔥 Si vous voulez aller TRÈS vite

### Plan éclair (5 minutes max)

```powershell
# Tout-en-un - Copiez-collez ce bloc complet
Write-Host "`n=== DIAGNOSTIC RAPIDE ===" -ForegroundColor Cyan

Write-Host "`n1. Version APK:" -ForegroundColor Yellow
adb shell dumpsys package marketgardener.thomas.v2 | Select-String "versionCode"

Write-Host "`n2. Test Internet:" -ForegroundColor Yellow
$pingGoogle = adb shell ping -c 2 google.com 2>&1
if ($pingGoogle -match "2 received") {
    Write-Host "✅ Internet OK" -ForegroundColor Green
} else {
    Write-Host "❌ Pas d'Internet" -ForegroundColor Red
}

Write-Host "`n3. Test Supabase:" -ForegroundColor Yellow
$pingSupabase = adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co 2>&1
if ($pingSupabase -match "2 received") {
    Write-Host "✅ Supabase accessible" -ForegroundColor Green
} else {
    Write-Host "❌ Supabase inaccessible" -ForegroundColor Red
}

Write-Host "`n=== FIN DIAGNOSTIC ===" -ForegroundColor Cyan
```

**Copiez-collez TOUT le résultat ici** ⬇️

---

## ⏰ Timeline selon votre choix

| Action | Durée | Quand |
|--------|-------|-------|
| **Commandes ADB** (Option A) | 2 min | MAINTENANT |
| Rebuild APK (si versionCode < 30) | 25 min | Après Option A |
| Diagnostic embarqué (si versionCode ≥ 30) | 1 min | Après rebuild |

---

## 🎯 Objectif

Avoir le rapport du diagnostic embarqué avec **les 6 tests** :

```
✅/❌ Configuration
✅/❌ Variables d'environnement
✅/❌ Connectivité réseau
✅/❌ Ping Supabase
✅/❌ Endpoint Auth
✅/❌ Endpoint Database
```

Ce rapport me dira **EXACTEMENT** où ça bloque.

---

**Action suivante** : Exécuter les 3 commandes PowerShell OU lancer le rebuild  
**Temps estimé** : 2 min (commandes) ou 25 min (rebuild)  
**Priorité** : 🔴 CRITIQUE

