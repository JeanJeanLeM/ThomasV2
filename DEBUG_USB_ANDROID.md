# 🔌 Guide de Debug USB Android - PowerShell

## 📱 ÉTAPE 1 : Activer le débogage USB sur le téléphone

1. **Activer les options développeur** :
   - Allez dans `Paramètres` → `À propos du téléphone`
   - Tapez 7 fois sur `Numéro de build`
   - Un message confirme l'activation

2. **Activer le débogage USB** :
   - Allez dans `Paramètres` → `Options pour les développeurs`
   - Activez `Débogage USB`
   - Activez `Débogage USB (sécurité)` si disponible

3. **Connecter le téléphone** :
   - Connectez le téléphone au PC via USB
   - Sur le téléphone, acceptez la demande d'autorisation "Autoriser le débogage USB"
   - Cochez "Toujours autoriser depuis cet ordinateur"

---

## 🔍 ÉTAPE 2 : Vérifier la connexion (PowerShell)

```powershell
# Vérifier que ADB détecte le téléphone
adb devices

# Si "unauthorized" apparaît, acceptez la demande sur le téléphone
# Si aucun périphérique, vérifiez le câble USB et les pilotes
```

**Résultat attendu** :
```
List of devices attached
ABC123XYZ    device
```

---

## 📊 ÉTAPE 3 : Filtrer les logs en temps réel

### Option A : Logs AUDIO uniquement (recommandé pour l'erreur audio)

```powershell
# Nettoyer les logs précédents
adb logcat -c

# Filtrer uniquement les logs liés à l'audio et à l'application
adb logcat | Select-String -Pattern "AUDIO|TRANSCRIPTION|MediaService|ChatConversation|expo-av|Recording" -CaseSensitive:$false
```

### Option B : Logs COMPLETS avec filtres multiples

```powershell
# Nettoyer les logs
adb logcat -c

# Filtrer les logs importants (audio, erreurs, React Native)
adb logcat | Select-String -Pattern "AUDIO|ERROR|FATAL|ReactNative|ExpoModules|ChatConversation|MediaService|TranscriptionService|DirectSupabaseService" -CaseSensitive:$false
```

### Option C : Logs avec niveau de priorité (ERROR et FATAL uniquement)

```powershell
# Nettoyer les logs
adb logcat -c

# Afficher uniquement les erreurs et fatal
adb logcat *:E *:F
```

### Option D : Logs complets dans un fichier (pour analyse ultérieure)

```powershell
# Nettoyer les logs
adb logcat -c

# Enregistrer tous les logs dans un fichier
adb logcat > "C:\Users\cramp\Documents\Thomas\MobileV2Thomas\android_logs_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
```

---

## 🎯 ÉTAPE 4 : Commandes spécifiques pour votre erreur

### Pour l'erreur "Impossible de récupérer l'identifiant utilisateur"

```powershell
# Nettoyer les logs
adb logcat -c

# Filtrer les logs liés à l'authentification et l'utilisateur
adb logcat | Select-String -Pattern "AUTH|USER|userId|getAuthToken|DirectSupabaseService|AuthContext|localStorage|SecureStore" -CaseSensitive:$false
```

### Pour l'erreur "Impossible d'uploader l'audio : undefined is not a function"

```powershell
# Nettoyer les logs
adb logcat -c

# Filtrer les logs audio et les erreurs JavaScript
adb logcat | Select-String -Pattern "AUDIO|MediaService|uploadAudioFile|getURI|getStatusAsync|Recording|expo-av|undefined|TypeError" -CaseSensitive:$false
```

### Pour l'erreur "L'enregistrement n'a pas généré de fichier audio"

```powershell
# Nettoyer les logs
adb logcat -c

# Filtrer les logs d'enregistrement et de fichiers
adb logcat | Select-String -Pattern "AUDIO|Recording|stopRecording|getURI|FileSystem|audio.*file|permission|microphone" -CaseSensitive:$false
```

---

## 🔧 ÉTAPE 5 : Commandes de diagnostic supplémentaires

### Vérifier les permissions de l'application

```powershell
# Lister les permissions de l'application
adb shell dumpsys package com.votre.package.name | Select-String -Pattern "permission"
```

### Vérifier les processus en cours

```powershell
# Voir les processus React Native / Expo
adb shell ps | Select-String -Pattern "expo|react|node"
```

### Redémarrer l'application

```powershell
# Forcer l'arrêt de l'application
adb shell am force-stop com.votre.package.name

# Relancer l'application
adb shell am start -n com.votre.package.name/.MainActivity
```

### Vider le cache de l'application

```powershell
# Vider le cache
adb shell pm clear com.votre.package.name
```

---

## 📋 ÉTAPE 6 : Script PowerShell complet (tout-en-un)

Créez un fichier `debug_android.ps1` avec ce contenu :

```powershell
# Script de debug Android complet
Write-Host "=== DEBUG ANDROID USB ===" -ForegroundColor Cyan

# 1. Vérifier la connexion
Write-Host "`n1. Vérification connexion ADB..." -ForegroundColor Yellow
$devices = adb devices
Write-Host $devices

if ($devices -notmatch "device$") {
    Write-Host "❌ Aucun périphérique détecté !" -ForegroundColor Red
    Write-Host "Vérifiez :" -ForegroundColor Yellow
    Write-Host "  - Câble USB connecté" -ForegroundColor White
    Write-Host "  - Débogage USB activé sur le téléphone" -ForegroundColor White
    Write-Host "  - Autorisation acceptée sur le téléphone" -ForegroundColor White
    exit
}

Write-Host "✅ Périphérique détecté !" -ForegroundColor Green

# 2. Nettoyer les logs
Write-Host "`n2. Nettoyage des logs précédents..." -ForegroundColor Yellow
adb logcat -c

# 3. Demander le type de logs
Write-Host "`n3. Type de logs à afficher :" -ForegroundColor Yellow
Write-Host "  [1] Logs AUDIO uniquement" -ForegroundColor White
Write-Host "  [2] Logs ERREURS uniquement" -ForegroundColor White
Write-Host "  [3] Logs COMPLETS (filtres)" -ForegroundColor White
Write-Host "  [4] Logs COMPLETS (tout)" -ForegroundColor White
$choice = Read-Host "Choix (1-4)"

# 4. Lancer les logs selon le choix
Write-Host "`n4. Affichage des logs en temps réel..." -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter`n" -ForegroundColor Gray

switch ($choice) {
    "1" {
        adb logcat | Select-String -Pattern "AUDIO|TRANSCRIPTION|MediaService|ChatConversation|expo-av|Recording" -CaseSensitive:$false
    }
    "2" {
        adb logcat *:E *:F
    }
    "3" {
        adb logcat | Select-String -Pattern "AUDIO|ERROR|FATAL|ReactNative|ExpoModules|ChatConversation|MediaService|TranscriptionService|DirectSupabaseService" -CaseSensitive:$false
    }
    "4" {
        adb logcat
    }
    default {
        Write-Host "Choix invalide, affichage des logs complets..." -ForegroundColor Yellow
        adb logcat
    }
}
```

**Utilisation** :
```powershell
.\debug_android.ps1
```

---

## 🚀 COMMANDES RAPIDES (copier-coller)

### Pour votre erreur actuelle (audio)

```powershell
# 1. Vérifier connexion
adb devices

# 2. Nettoyer et filtrer logs audio
adb logcat -c
adb logcat | Select-String -Pattern "AUDIO|ERROR|FATAL|MediaService|ChatConversation|Recording|getURI|undefined" -CaseSensitive:$false
```

### Pour l'erreur d'initialisation

```powershell
# 1. Vérifier connexion
adb devices

# 2. Nettoyer et filtrer logs initialisation
adb logcat -c
adb logcat | Select-String -Pattern "AUTH|INIT|FarmContext|AuthContext|DirectSupabaseService|getAuthToken|timeout" -CaseSensitive:$false
```

---

## 📝 NOTES IMPORTANTES

1. **Le téléphone doit rester déverrouillé** pendant le débogage
2. **Ne débranchez pas le câble USB** pendant la capture des logs
3. **Appuyez sur Ctrl+C** pour arrêter la capture des logs
4. **Les logs sont en temps réel** : reproduisez l'erreur pendant que les logs s'affichent
5. **Copiez les logs** qui apparaissent au moment de l'erreur

---

## 🔍 INTERPRÉTATION DES LOGS

### Logs à chercher pour l'erreur audio :

- `❌ [AUDIO]` : Erreurs audio
- `⚠️ [AUDIO]` : Avertissements audio
- `getURI()` : Tentative d'obtenir l'URI
- `undefined is not a function` : Erreur JavaScript
- `Recording` : État de l'enregistrement
- `FileSystem` : Accès au système de fichiers
- `permission` : Problèmes de permissions

### Logs à chercher pour l'erreur d'initialisation :

- `⚠️ [DIRECT-API] getSession() timeout` : Timeout d'authentification
- `❌ [FARM-CONTEXT]` : Erreurs de contexte ferme
- `❌ [AUTH]` : Erreurs d'authentification
- `localStorage` : Tentative d'accès localStorage (ne fonctionne pas sur mobile)
