# Script de débogage simplifié pour Thomas V2
# Capture TOUS les logs de l'application

$appPackage = "marketgardener.thomas.v2"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   DÉBOGAGE THOMAS V2 - MODE SIMPLE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $appPackage" -ForegroundColor Cyan
Write-Host ""
Write-Host "Capture de TOUS les logs de l'application..." -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Vérifier qu'un appareil est connecté
$state = adb get-state 2>$null
if ($state -ne "device") {
    Write-Host "ERREUR: Aucun téléphone connecté!" -ForegroundColor Red
    Write-Host "1. Connectez le téléphone en USB" -ForegroundColor Yellow
    Write-Host "2. Activez le débogage USB (Paramètres > Options développeur)" -ForegroundColor Yellow
    Write-Host "3. Acceptez la demande d'autorisation sur le téléphone" -ForegroundColor Yellow
    exit 1
}

# Obtenir le PID de l'application ($pid est réservé en PowerShell)
$appPid = adb shell pidof $appPackage 2>$null
$appPid = $appPid -replace "`r`n", "" -replace "`n", ""
if ([string]::IsNullOrWhiteSpace($appPid)) {
    Write-Host "L'application n'est pas ouverte. Capture de tous les logs (filtrés manuellement)..." -ForegroundColor Yellow
    Write-Host "Conseil: Ouvrez l'app Thomas sur le téléphone pour plus de pertinence." -ForegroundColor Yellow
    Write-Host ""
    adb logcat -c
    adb logcat -v time
} else {
    Write-Host "PID de l'application: $appPid" -ForegroundColor Green
    Write-Host ""
    adb logcat -c
    adb logcat -v time --pid=$appPid
}
