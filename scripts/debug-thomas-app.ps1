# Script de débogage pour Thomas V2
# Ce script capture les logs de l'application en temps réel

$appPackage = "marketgardener.thomas.v2"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   DÉBOGAGE THOMAS V2 APP" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $appPackage" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Ouvrez l'application Thomas sur votre téléphone" -ForegroundColor White
Write-Host "2. Naviguez vers un formulaire (Matériel, Conversion, ou Parcelle)" -ForegroundColor White
Write-Host "3. Essayez de saisir du texte dans le champ qui pose problème" -ForegroundColor White
Write-Host "4. Observez les logs ci-dessous en temps réel" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter la capture" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Nettoyer le buffer de logs
adb logcat -c

# Capturer les logs avec filtres
Write-Host "Début de la capture des logs..." -ForegroundColor Cyan
Write-Host ""

# Capturer tous les logs de l'app avec plusieurs niveaux de filtrage
adb logcat -v time `
  ReactNativeJS:V `
  ReactNative:V `
  chromium:V `
  ExpoReact:V `
  Expo:V `
  InputMethodManager:V `
  InputConnection:V `
  ViewRootImpl:V `
  *:S
