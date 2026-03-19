# Script de debogage Thomas V2 - MODE MINIMAL
# Affiche UNIQUEMENT: React Native, clavier, erreurs

$appPackage = "marketgardener.thomas.v2"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   DEBOGAGE THOMAS V2 - MODE MINIMAL" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "On affiche UNIQUEMENT:" -ForegroundColor Cyan
Write-Host "  - ImeTracker / InsetsController (demande clavier)" -ForegroundColor White
Write-Host "  - ReactNativeJS / ReactNative (logs app)" -ForegroundColor White
Write-Host "  - KeyboardEventHandler (ouvert/ferme clavier)" -ForegroundColor White
Write-Host "  - InputMethodManager (clavier)" -ForegroundColor White
Write-Host "  - Lignes contenant ERROR ou Exception" -ForegroundColor White
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
    Write-Host "Ouvrez l'app Thomas sur le telephone, puis relancez." -ForegroundColor Yellow
    exit 1
}

Write-Host "PID Thomas: $appPid" -ForegroundColor Green
Write-Host ""

adb logcat -c

# Garder seulement les lignes utiles (ImeTracker = demande clavier, InsetsController = affichage)
$include = "ReactNativeJS|ReactNative:|KeyboardEventHandler|InputMethodManager|ImeTracker|InsetsController|ERROR|Exception|FATAL"
adb logcat -v time --pid=$appPid 2>$null | ForEach-Object {
    if ($_ -match $include) { Write-Host $_ }
}
