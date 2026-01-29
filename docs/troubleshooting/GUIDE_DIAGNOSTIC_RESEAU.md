# 📘 Guide de Diagnostic Réseau - Thomas V2 Android

## 🎯 Objectif

Diagnostiquer et corriger l'erreur "Network request failed" sur l'APK Android en collectant des informations détaillées.

---

## 🔬 Méthode 1 : Écran de diagnostic embarqué (NOUVEAU ✅)

### Comment y accéder ?

**Sur l'écran de connexion** :
1. Ouvrir l'application Thomas V2
2. **Taper 5 fois rapidement** sur le logo 🌾
3. L'écran de diagnostic s'ouvre automatiquement

Le compteur s'affiche après le 1er tap : "4 tap(s) restant(s)"

### Ce que l'écran teste

L'écran exécute **6 tests automatiques** :

| Test | Description | Durée |
|------|-------------|-------|
| 📋 Configuration | Vérifie les URLs et clés Supabase | ~0ms |
| 🔑 Variables d'environnement | Vérifie que les vars sont compilées dans l'APK | ~0ms |
| 🌐 Connectivité réseau | Test Internet avec google.com | 100-500ms |
| 🔌 Ping Supabase | Test connexion à Supabase (health endpoint) | 200-1000ms |
| 🔐 Endpoint Auth | Test API d'authentification | 300-1500ms |
| 💾 Endpoint Database | Test API de base de données | 300-1500ms |

### Résultats possibles

#### ✅ Tous les tests passent
```
✅ Configuration OK
✅ Variables d'environnement OK
✅ Internet accessible (245ms)
✅ Supabase accessible (412ms)
✅ Endpoint Auth OK (567ms)
✅ Endpoint Database OK (623ms)
```

**➡️ Si tous passent mais l'erreur persiste** : Le problème vient des credentials (email/password invalides)

#### ❌ Test "Connectivité réseau" échoue
```
❌ Pas d'accès Internet: Network request failed
Code: ENOTFOUND
Type: TypeError
```

**Causes possibles** :
1. **Permissions Android manquantes** → Rebuild APK ✅ (déjà fait)
2. **Pas de connexion Internet** → Vérifier WiFi/4G
3. **Firewall bloque l'app** → Tester sur un autre réseau
4. **Antivirus mobile** → Désactiver temporairement

#### ❌ Test "Ping Supabase" échoue
```
❌ Impossible de contacter Supabase:
URL: https://kvwzbofifqqytyfertkhh.supabase.co
Erreur: Network request failed
```

**Causes possibles** :
1. **Firewall bloque Supabase spécifiquement**
2. **Problème DNS** → Tester sur 4G au lieu de WiFi
3. **Certificat SSL invalide** → Vérifier date/heure du téléphone
4. **Proxy d'entreprise** → Désactiver

#### ❌ Test "Variables d'environnement" échoue
```
❌ CRITIQUE: SUPABASE_URL non chargée dans l'APK !
```

**Cause** : Les variables d'environnement ne sont pas compilées dans l'APK

**Solution** : Problème de build EAS
```bash
# Vérifier eas.json contient bien les env vars
# Rebuilder avec :
eas build --platform android --profile preview --clear-cache
```

### Actions disponibles

**Bouton "Relancer"** :
- Réexécute tous les tests
- Utile après avoir changé de réseau

**Bouton "Copier rapport"** :
- Copie le rapport complet dans le presse-papier
- Inclut tous les tests + logs détaillés
- Partager ce rapport pour obtenir de l'aide

### Exemple de rapport copié

```
=== DIAGNOSTIC RÉSEAU ANDROID ===
Date: 06/01/2026 14:23:45
Platform: android 33

=== RÉSUMÉ DES TESTS ===
📋 Configuration: SUCCESS
  Message: Configuration OK
  Durée: 2ms
  Détails: {
    "platform": "android",
    "version": 33,
    "supabaseUrl": "https://kvwzbofifqqytyfertkhh.supabase.co",
    "anonKeyPrefix": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }

🔑 Variables d'environnement: SUCCESS
  Message: Variables d'environnement OK
  Durée: 1ms

🌐 Connectivité réseau: ERROR
  Message: Pas d'accès Internet: Network request failed
Code: ENOTFOUND
Type: TypeError
  Durée: 5234ms

...
```

---

## 🔌 Méthode 2 : Logs ADB (PowerShell)

### Prérequis

1. **Activer le mode développeur** sur Android :
   ```
   Paramètres → À propos du téléphone → Taper 7× sur "Numéro de build"
   ```

2. **Activer le débogage USB** :
   ```
   Paramètres → Options pour les développeurs → Débogage USB
   ```

3. **Installer ADB** (si pas installé) :
   ```powershell
   # Télécharger : https://developer.android.com/studio/releases/platform-tools
   # Ou via Chocolatey :
   choco install adb
   ```

### Commandes PowerShell

#### A. Diagnostic rapide (recommandé)

Copiez-collez ce script complet dans PowerShell :

```powershell
# Créer dossier pour les logs
New-Item -ItemType Directory -Force -Path ".\logs_thomas" | Out-Null

Write-Host "`n=== DIAGNOSTIC THOMAS V2 ANDROID ===" -ForegroundColor Cyan

# 1. Vérifier connexion
Write-Host "`n[1/6] Verification connexion appareil..." -ForegroundColor Yellow
$devices = adb devices
if ($devices -match "device$") {
    Write-Host "✅ Appareil connecte" -ForegroundColor Green
} else {
    Write-Host "❌ Aucun appareil connecte" -ForegroundColor Red
    Write-Host "→ Verifier cable USB et autoriser debogage sur le telephone" -ForegroundColor Yellow
    exit
}

# 2. Infos système
Write-Host "`n[2/6] Collecte infos systeme..." -ForegroundColor Yellow
$androidVersion = adb shell getprop ro.build.version.release
$manufacturer = adb shell getprop ro.product.manufacturer
$model = adb shell getprop ro.product.model
Write-Host "  📱 Appareil: $manufacturer $model" -ForegroundColor Gray
Write-Host "  🤖 Android: $androidVersion" -ForegroundColor Gray

# 3. Test connectivité
Write-Host "`n[3/6] Test connectivite Internet..." -ForegroundColor Yellow
$ping = adb shell ping -c 2 google.com 2>&1
if ($ping -match "2 packets transmitted, 2 received") {
    Write-Host "✅ Internet OK" -ForegroundColor Green
} else {
    Write-Host "❌ Pas d'Internet sur l'appareil" -ForegroundColor Red
}

# 4. Test Supabase
Write-Host "`n[4/6] Test connexion Supabase..." -ForegroundColor Yellow
$pingSupabase = adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co 2>&1
if ($pingSupabase -match "2 packets transmitted, 2 received") {
    Write-Host "✅ Supabase accessible" -ForegroundColor Green
} else {
    Write-Host "⚠️  Supabase non accessible (peut etre firewall)" -ForegroundColor Yellow
}

# 5. Nettoyer logcat
Write-Host "`n[5/6] Nettoyage anciens logs..." -ForegroundColor Yellow
adb logcat -c
Write-Host "✅ Logs nettoyes" -ForegroundColor Green

# 6. Capture logs
Write-Host "`n[6/6] Capture des logs en cours..." -ForegroundColor Yellow
Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  👉 MAINTENANT: Ouvrez Thomas V2                 ║" -ForegroundColor Cyan
Write-Host "║  👉 Essayez de vous connecter                    ║" -ForegroundColor Cyan
Write-Host "║  👉 Attendez l'erreur                            ║" -ForegroundColor Cyan
Write-Host "║  👉 Appuyez sur Ctrl+C quand l'erreur apparait   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Capture
adb logcat *:E > ".\logs_thomas\errors.txt"

# Après Ctrl+C
Write-Host "`n✅ Logs captures dans: .\logs_thomas\errors.txt" -ForegroundColor Green
Write-Host "→ Ouvrez ce fichier et cherchez 'Network request failed'" -ForegroundColor Yellow
```

#### B. Analyse des logs

```powershell
# Chercher l'erreur Network
Select-String -Path ".\logs_thomas\errors.txt" -Pattern "network|Network" -Context 3,3

# Chercher erreurs Supabase
Select-String -Path ".\logs_thomas\errors.txt" -Pattern "supabase|auth" -Context 3,3

# Chercher erreurs SSL/certificat
Select-String -Path ".\logs_thomas\errors.txt" -Pattern "ssl|certificate|cleartext" -Context 3,3
```

### Patterns d'erreurs à chercher

| Pattern | Signification | Solution |
|---------|---------------|----------|
| `CLEARTEXT communication not permitted` | Android bloque HTTP | Vérifier URL en HTTPS ✅ |
| `SSLHandshakeException` | Problème certificat SSL | Vérifier date/heure téléphone |
| `UnknownHostException` | Problème DNS | Tester sur 4G |
| `SocketTimeoutException` | Timeout réseau | Augmenter timeout ou vérifier firewall |
| `Network request failed` + `ENOTFOUND` | Domaine non trouvé | Problème DNS ou permissions |
| `Network request failed` + `ECONNREFUSED` | Connexion refusée | Firewall bloque |

---

## 📊 Méthode 3 : Amélioration des messages d'erreur (APPLIQUÉE ✅)

Les écrans de connexion/inscription affichent maintenant :

```
❌ Erreur: Network request failed
Code: ENOTFOUND
Type: TypeError

💡 Tap 5× sur le logo 🌾 pour diagnostic réseau
```

**Plus de détails techniques** :
- Code d'erreur
- Type d'erreur
- Détails JSON (si disponibles)
- Indication pour ouvrir le diagnostic

---

## 🎯 Plan d'action recommandé

### Étape 1 : Diagnostic embarqué (2 minutes)

1. Ouvrir Thomas V2
2. Taper 5× sur logo 🌾
3. Laisser les tests s'exécuter
4. Noter quels tests échouent
5. Copier le rapport

### Étape 2 : Si diagnostic embarqué ne suffit pas (10 minutes)

1. Connecter le téléphone en USB
2. Lancer le script PowerShell de diagnostic
3. Ouvrir Thomas V2 pendant la capture
4. Essayer de se connecter
5. Ctrl+C après l'erreur
6. Analyser `logs_thomas\errors.txt`

### Étape 3 : Tests de connectivité (5 minutes)

1. **Tester sur un autre réseau** :
   - Si WiFi → passer en 4G
   - Si 4G → passer en WiFi

2. **Désactiver VPN/Proxy** :
   - Paramètres → Réseau → VPN

3. **Vérifier date/heure** :
   - Paramètres → Date et heure
   - Activer "Date et heure automatiques"

4. **Désactiver antivirus temporairement**

---

## 🔍 Scénarios de dépannage

### Scénario A : Aucun test ne passe

```
❌ Configuration OK
❌ Variables d'environnement: SUPABASE_URL non chargée
```

**Cause** : Variables d'environnement non compilées

**Solution** :
```bash
# Rebuild avec clear cache
eas build --platform android --profile preview --clear-cache
```

### Scénario B : Internet OK mais Supabase échoue

```
✅ Connectivité réseau OK
❌ Ping Supabase: Network request failed
```

**Causes** :
- Firewall bloque `*.supabase.co`
- Proxy d'entreprise
- Réseau restreint (école, entreprise)

**Solutions** :
- Tester sur 4G
- Tester sur un autre réseau WiFi
- Contacter l'admin réseau

### Scénario C : Tous les tests passent

```
✅ Tous les tests: SUCCESS
```

**Mais l'erreur persiste lors de la connexion** :

**Cause** : Credentials invalides (pas un problème réseau !)

**Solutions** :
- Vérifier email/mot de passe
- Réinitialiser le mot de passe
- Créer un nouveau compte

---

## 📤 Partager les informations

Pour obtenir de l'aide, partager :

### 1. Rapport de diagnostic embarqué
- Copier avec le bouton dans l'app
- Coller dans le chat

### 2. Logs ADB (si disponibles)
```
.\logs_thomas\errors.txt
```

### 3. Informations système
```
- Marque/modèle : [ex: Samsung Galaxy S21]
- Version Android : [ex: 13]
- Type de connexion : [WiFi / 4G / 5G]
- Réseau : [Personnel / Entreprise / École]
- VPN actif : [Oui / Non]
```

---

## ✅ Checklist de vérification

Avant de demander de l'aide, vérifier :

- [ ] Permissions réseau dans app.json (INTERNET, ACCESS_NETWORK_STATE) ✅
- [ ] APK rebuilt avec les permissions
- [ ] Diagnostic embarqué exécuté (5× tap sur logo)
- [ ] Rapport copié
- [ ] Testé sur un autre réseau (4G vs WiFi)
- [ ] VPN/Proxy désactivé
- [ ] Date/heure correctes sur le téléphone
- [ ] Logs ADB capturés (si possible)

---

**Version du guide** : 1.0  
**Date** : 6 janvier 2026  
**Prochaine étape** : Rebuild APK + Test diagnostic embarqué

