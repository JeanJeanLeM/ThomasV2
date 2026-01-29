# Script de rebuild Android avec fix audio AAC
# Fix AMR-NB → AAC pour transcription Whisper

Write-Host "🔧 REBUILD ANDROID - FIX AUDIO TRANSCRIPTION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Déployer l'Edge Function
Write-Host "📤 Étape 1/3: Déploiement Edge Function transcribe-audio..." -ForegroundColor Yellow
npx supabase functions deploy transcribe-audio

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur déploiement Edge Function" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Edge Function déployée" -ForegroundColor Green
Write-Host ""

# 2. Clean build
Write-Host "🧹 Étape 2/3: Nettoyage build précédent..." -ForegroundColor Yellow
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build"
    Write-Host "✅ Build Android nettoyé" -ForegroundColor Green
}
Write-Host ""

# 3. Rebuild APK
Write-Host "🔨 Étape 3/3: Build nouvel APK avec fix audio AAC..." -ForegroundColor Yellow
Write-Host "⚠️  Cela peut prendre 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

eas build --profile development --platform android --local

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur build Android" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ BUILD TERMINÉ AVEC SUCCÈS!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host "1. Installer le nouvel APK sur votre téléphone" -ForegroundColor White
Write-Host "2. Tester l'enregistrement audio" -ForegroundColor White
Write-Host "3. Vérifier les logs avec:" -ForegroundColor White
Write-Host "   adb logcat | Select-String 'CCodecConfig.*output.media-type'" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ RÉSULTAT ATTENDU: 'audio/mp4' ou 'audio/mpeg'" -ForegroundColor Green
Write-Host "❌ SI VOUS VOYEZ: 'audio/3gpp' → Problème persiste" -ForegroundColor Red
Write-Host ""
