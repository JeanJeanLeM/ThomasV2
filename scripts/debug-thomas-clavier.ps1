# Script de debogage Thomas V2 - CLAVIER UNIQUEMENT
# Utilise le filtre natif adb (pas de pipe PowerShell) = affichage en temps reel

$appPackage = "marketgardener.thomas.v2"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   DEBOGAGE CLAVIER (ImeTracker)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tags affiches: ImeTracker, InsetsController, InputMethodManager" -ForegroundColor Cyan
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
    Write-Host "Ouvrez l'app Thomas sur le telephone, puis relancez." -ForegroundColor Yellow
    exit 1
}

Write-Host "PID Thomas: $appPid" -ForegroundColor Green
Write-Host ""

adb logcat -c

# Filtre NATIF adb: on autorise seulement ces tags (*:S = tout le reste silencieux)
adb logcat -v time --pid=$appPid ImeTracker:I InsetsController:D InputMethodManager:D KeyboardEventHandler:I ReactNativeJS:V ReactNative:V *:S
