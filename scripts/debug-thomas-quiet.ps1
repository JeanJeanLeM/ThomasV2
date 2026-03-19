# Script de debogage Thomas V2 - MODE SILENCIEUX
# Exclut les logs repetitifs (clavier systeme) pour voir l'essentiel

$appPackage = "marketgardener.thomas.v2"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   DEBOGAGE THOMAS V2 - MODE SILENCIEUX" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $appPackage" -ForegroundColor Cyan
Write-Host "Filtre: on exclut HardKeyTracker, NotificationCenter, etc." -ForegroundColor Gray
Write-Host "On garde: ReactNative, KeyboardEventHandler, InputMethod, ERROR" -ForegroundColor Gray
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

$state = adb get-state 2>$null
if ($state -ne "device") {
    Write-Host "ERREUR: Aucun telephone connecte!" -ForegroundColor Red
    exit 1
}

$appPid = adb shell pidof $appPackage 2>$null
$appPid = $appPid -replace "`r`n", "" -replace "`n", ""
if ([string]::IsNullOrWhiteSpace($appPid)) {
    Write-Host "Ouvrez l'app Thomas sur le telephone, puis relancez ce script." -ForegroundColor Yellow
    exit 1
}

Write-Host "PID Thomas: $appPid" -ForegroundColor Green
Write-Host ""

adb logcat -c

# Tags a IGNORER (bruit)
$exclude = "HardKeyTracker|NotificationCenter\.unregister|DataShareHelper\.share|NgaVoiceInputHandler|NgaInputManager|AutoCloseableReference|BackgroundInstallControlService|Package event received"

adb logcat -v time --pid=$appPid 2>$null | ForEach-Object {
    if ($_ -notmatch $exclude) { Write-Host $_ }
}
