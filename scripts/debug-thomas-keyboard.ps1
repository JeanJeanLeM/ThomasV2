# Script de débogage spécifique au clavier pour Thomas V2
# Focus sur les problèmes de clavier et d'input

$appPackage = "marketgardener.thomas.v2"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   DÉBOGAGE CLAVIER THOMAS V2" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $appPackage" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ce script capture les logs liés au clavier:" -ForegroundColor Yellow
Write-Host "- Événements de focus sur les champs de texte" -ForegroundColor White
Write-Host "- Ouverture/fermeture du clavier" -ForegroundColor White
Write-Host "- Saisie de texte" -ForegroundColor White
Write-Host "- Erreurs liées aux inputs" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Nettoyer le buffer
adb logcat -c

Write-Host "Début de la capture..." -ForegroundColor Cyan
Write-Host ""

# Capturer les logs liés au clavier et aux inputs
# On filtre spécifiquement les tags liés au système d'input Android
adb logcat -v time `
  ReactNativeJS:V `
  ReactNative:V `
  InputMethodManager:D `
  InputMethodManagerService:D `
  InputConnection:D `
  InputConnectionWrapper:D `
  ViewRootImpl:D `
  KeyEvent:D `
  WindowManager:D `
  SoftInputWindow:D `
  *:S
