# 🔬 Diagnostic Network Error - Android APK

## 📱 Étape 1 : Récupérer les logs via ADB (PowerShell)

### Prérequis
1. Activer le **mode développeur** sur votre téléphone Android
2. Activer le **débogage USB**
3. Connecter le téléphone à l'ordinateur via USB
4. Installer ADB (Android Debug Bridge)

### Installation ADB (si pas installé)

```powershell
# Télécharger et installer Android Platform Tools
# Lien : https://developer.android.com/studio/releases/platform-tools

# Ou via Chocolatey
choco install adb

# Vérifier l'installation
adb version
```

### Commandes pour récupérer les logs

```powershell
# 1. Vérifier que l'appareil est connecté
adb devices

# Vous devriez voir votre appareil listé
# Si "unauthorized", accepter sur le téléphone

# 2. Nettoyer les anciens logs
adb logcat -c

# 3. Démarrer la capture des logs (LAISSER TOURNER)
adb logcat > logs_thomas_android.txt

# 4. Sur le téléphone : Ouvrir Thomas V2, essayer de se connecter
#    Laisser tourner jusqu'à l'erreur

# 5. Arrêter la capture : Ctrl+C dans PowerShell

# 6. Le fichier logs_thomas_android.txt contient TOUS les logs
```

### Filtrer les logs pertinents

```powershell
# Filtrer uniquement les erreurs réseau et Supabase
adb logcat | Select-String -Pattern "network|supabase|auth|https|ssl|certificate|thomas"

# OU sauvegarder dans un fichier filtré
adb logcat | Select-String -Pattern "network|supabase|auth|https|ssl|certificate" > logs_filtered.txt
```

### Logs spécifiques à chercher

Pendant que les logs tournent, cherchez ces patterns :

```
❌ Network request failed
❌ Failed to connect to
❌ SSL handshake failed
❌ Certificate
❌ Timeout
❌ Connection refused
❌ CLEARTEXT communication not permitted
```

---

## 🧪 Étape 2 : Écran de diagnostic embarqué (je vais créer)

Je vais ajouter un écran de diagnostic dans l'app qui affiche :
- ✅ Configuration détaillée
- ✅ Test de connectivité réseau
- ✅ Test Supabase
- ✅ Messages d'erreur complets
- ✅ Export des logs

---

## 📊 Étape 3 : Informations à collecter

### A. Informations système
```powershell
# Version Android
adb shell getprop ro.build.version.release

# Marque et modèle
adb shell getprop ro.product.manufacturer
adb shell getprop ro.product.model

# État de la connexion
adb shell dumpsys wifi | Select-String "Wi-Fi is"
adb shell dumpsys connectivity | Select-String "NetworkInfo"
```

### B. Test de connectivité basique

```powershell
# Test ping vers Supabase (depuis le téléphone)
adb shell ping -c 4 kvwzbofifqqytyfertkhh.supabase.co

# Test résolution DNS
adb shell nslookup kvwzbofifqqytyfertkhh.supabase.co

# Test HTTPS (si curl disponible sur l'appareil)
adb shell curl -I https://kvwzbofifqqytyfertkhh.supabase.co
```

---

## 🔍 Scénarios possibles et solutions

### Scénario 1: "CLEARTEXT communication not permitted"

**Cause**: Android 9+ bloque HTTP par défaut, autorise seulement HTTPS

**Solution**: Vérifier que l'URL Supabase est bien en HTTPS ✅ (déjà le cas)

---

### Scénario 2: "SSL handshake failed" ou "Certificate error"

**Cause**: Problème de certificat SSL

**Solutions possibles**:
```powershell
# Vérifier le certificat depuis le PC
curl -vI https://kvwzbofifqqytyfertkhh.supabase.co
```

---

### Scénario 3: "Connection timeout" ou "Failed to connect"

**Cause**: Firewall, proxy, ou problème réseau

**Solutions**:
- Tester sur un autre réseau (4G au lieu de WiFi)
- Désactiver VPN/proxy sur le téléphone
- Vérifier le pare-feu du réseau

---

### Scénario 4: "Failed to load resource" avec code 0

**Cause**: Variables d'environnement non compilées dans l'APK

**Vérification**: Je vais créer un écran qui affiche les variables

---

## 📝 Template pour partager les logs

Quand vous avez les logs, cherchez et partagez ces sections :

### 1. Message d'erreur exact
```
[Copier le message d'erreur complet ici]
```

### 2. Stack trace (si disponible)
```
[Copier la stack trace complète]
```

### 3. Configuration réseau
```
Type de connexion : WiFi / 4G / 5G
Réseau : [nom du réseau]
VPN actif : Oui / Non
```

### 4. Version Android
```
Version : [ex: Android 12]
Appareil : [ex: Samsung Galaxy S21]
```

---

## 🎯 Commandes rapides (copier-coller)

### PowerShell - Diagnostic complet

```powershell
# Créer un dossier pour les logs
New-Item -ItemType Directory -Force -Path ".\logs_thomas_debug"

# 1. Infos système
Write-Host "📱 Collecte des infos système..." -ForegroundColor Yellow
adb shell getprop ro.build.version.release > .\logs_thomas_debug\android_version.txt
adb shell getprop ro.product.manufacturer > .\logs_thomas_debug\device_manufacturer.txt
adb shell getprop ro.product.model > .\logs_thomas_debug\device_model.txt

# 2. État réseau
Write-Host "🌐 Test connectivité réseau..." -ForegroundColor Yellow
adb shell ping -c 4 kvwzbofifqqytyfertkhh.supabase.co > .\logs_thomas_debug\ping_supabase.txt 2>&1

# 3. Nettoyer logcat
Write-Host "🧹 Nettoyage des anciens logs..." -ForegroundColor Yellow
adb logcat -c

# 4. Démarrer capture
Write-Host "📝 Capture des logs..." -ForegroundColor Green
Write-Host "➡️  MAINTENANT : Ouvrez Thomas V2 et essayez de vous connecter" -ForegroundColor Cyan
Write-Host "➡️  Appuyez sur Ctrl+C quand l'erreur apparaît" -ForegroundColor Cyan
adb logcat > .\logs_thomas_debug\full_logcat.txt

# Après Ctrl+C
Write-Host "✅ Logs capturés dans .\logs_thomas_debug\" -ForegroundColor Green
```

### Analyse rapide des logs

```powershell
# Chercher les erreurs réseau
Select-String -Path ".\logs_thomas_debug\full_logcat.txt" -Pattern "network|Network|NETWORK" -Context 2,2 > .\logs_thomas_debug\errors_network.txt

# Chercher les erreurs Supabase
Select-String -Path ".\logs_thomas_debug\full_logcat.txt" -Pattern "supabase|Supabase|auth|Auth" -Context 2,2 > .\logs_thomas_debug\errors_supabase.txt

# Chercher les exceptions
Select-String -Path ".\logs_thomas_debug\full_logcat.txt" -Pattern "Exception|Error|ERROR" -Context 3,3 > .\logs_thomas_debug\errors_all.txt

Write-Host "✅ Analyse terminée. Fichiers créés :" -ForegroundColor Green
Get-ChildItem .\logs_thomas_debug\
```

---

## 🆘 Si ADB ne fonctionne pas

### Alternative : Logs via l'application

Je vais créer un écran de diagnostic dans l'app qui :
1. Capture toutes les erreurs
2. Affiche les détails en temps réel
3. Permet de copier/partager les logs

---

## 📤 Partage des logs

Une fois collectés, vous pouvez :

1. **Coller dans le chat** les fichiers :
   - `errors_network.txt`
   - `errors_supabase.txt`
   - Les 50 premières lignes de `full_logcat.txt`

2. **Ou** utiliser l'écran de diagnostic de l'app (que je vais créer)

---

**Prochaine étape** : Je vais créer un écran de diagnostic embarqué dans l'app

