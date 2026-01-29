# Script de debug Android USB complet
# Usage: .\debug_android.ps1

Write-Host "=== DEBUG ANDROID USB ===" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier la connexion
Write-Host "1. Vérification connexion ADB..." -ForegroundColor Yellow
$devices = adb devices
Write-Host $devices

if ($devices -notmatch "device$") {
    Write-Host ""
    Write-Host "❌ Aucun périphérique détecté !" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez sur votre téléphone :" -ForegroundColor Yellow
    Write-Host "  1. Paramètres → Options pour les développeurs → Débogage USB (ACTIVÉ)" -ForegroundColor White
    Write-Host "  2. Câble USB connecté au PC" -ForegroundColor White
    Write-Host "  3. Autorisation acceptée sur le téléphone (popup 'Autoriser le débogage USB')" -ForegroundColor White
    Write-Host ""
    Write-Host "Appuyez sur Entrée pour réessayer, ou Ctrl+C pour quitter..." -ForegroundColor Gray
    Read-Host
    exit
}

Write-Host "✅ Périphérique détecté !" -ForegroundColor Green
Write-Host ""

# 2. Nettoyer les logs
Write-Host "2. Nettoyage des logs précédents..." -ForegroundColor Yellow
adb logcat -c
Write-Host "✅ Logs nettoyés" -ForegroundColor Green
Write-Host ""

# 3. Demander le type de logs
Write-Host "3. Type de logs à afficher :" -ForegroundColor Yellow
Write-Host "  [1] Logs AUDIO uniquement (recommandé pour erreur audio)" -ForegroundColor White
Write-Host "  [2] Logs ERREURS uniquement (ERROR et FATAL)" -ForegroundColor White
Write-Host "  [3] Logs COMPLETS avec filtres (audio + erreurs + app)" -ForegroundColor White
Write-Host "  [4] Logs COMPLETS (tout afficher)" -ForegroundColor White
Write-Host "  [5] Logs INITIALISATION (pour erreur de chargement)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Votre choix (1-5)"

# 4. Lancer les logs selon le choix
Write-Host ""
Write-Host "4. Affichage des logs en temps réel..." -ForegroundColor Yellow
Write-Host "⚠️  IMPORTANT : Reproduisez l'erreur maintenant sur votre téléphone !" -ForegroundColor Red
Write-Host "⚠️  Appuyez sur Ctrl+C pour arrêter la capture`n" -ForegroundColor Gray

switch ($choice) {
    "1" {
        Write-Host "📊 Mode : Logs AUDIO uniquement" -ForegroundColor Cyan
        adb logcat | Select-String -Pattern "AUDIO|TRANSCRIPTION|MediaService|ChatConversation|expo-av|Recording|getURI|getStatusAsync|FileSystem|uploadAudioFile" -CaseSensitive:$false
    }
    "2" {
        Write-Host "📊 Mode : Logs ERREURS uniquement" -ForegroundColor Cyan
        adb logcat *:E *:F
    }
    "3" {
        Write-Host "📊 Mode : Logs COMPLETS avec filtres" -ForegroundColor Cyan
        adb logcat | Select-String -Pattern "AUDIO|ERROR|FATAL|ReactNative|ExpoModules|ChatConversation|MediaService|TranscriptionService|DirectSupabaseService|Recording|getURI|undefined" -CaseSensitive:$false
    }
    "4" {
        Write-Host "📊 Mode : Logs COMPLETS (tout)" -ForegroundColor Cyan
        adb logcat
    }
    "5" {
        Write-Host "📊 Mode : Logs INITIALISATION" -ForegroundColor Cyan
        adb logcat | Select-String -Pattern "AUTH|INIT|FarmContext|AuthContext|DirectSupabaseService|getAuthToken|getSession|timeout|FARM-CONTEXT|SIMPLE-INIT" -CaseSensitive:$false
    }
    default {
        Write-Host "❌ Choix invalide, affichage des logs complets..." -ForegroundColor Yellow
        adb logcat
    }
}
