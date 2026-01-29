# Script PowerShell pour chercher toutes les keystores dans l'ancien projet

Write-Host "🔍 Recherche de keystores dans l'ancien projet..." -ForegroundColor Cyan

# Demander le chemin de l'ancien projet
$oldProjectPath = Read-Host "Entrez le chemin complet vers le dossier de l'application 1.0"

if (-not (Test-Path $oldProjectPath)) {
    Write-Host "❌ Le chemin n'existe pas !" -ForegroundColor Red
    exit
}

Write-Host "`nRecherche de fichiers keystore..." -ForegroundColor Yellow

# Chercher tous les fichiers keystore
$keystores = Get-ChildItem -Path $oldProjectPath -Recurse -Include *.jks,*.keystore,*.p12,*.pfx -ErrorAction SilentlyContinue

if ($keystores.Count -eq 0) {
    Write-Host "❌ Aucune keystore trouvée !" -ForegroundColor Red
    exit
}

Write-Host "`n✅ Keystores trouvées : $($keystores.Count)" -ForegroundColor Green
Write-Host "`n" + ("="*80) -ForegroundColor Gray

$expectedSHA1 = "CB:89:3E:AC:28:A0:29:76:E8:31:68:C8:96:01:F4:E7:93:4D:6E:04"

foreach ($ks in $keystores) {
    Write-Host "`n📁 Fichier : $($ks.FullName)" -ForegroundColor Cyan
    Write-Host "   Taille : $([math]::Round($ks.Length/1KB, 2)) KB" -ForegroundColor Gray
    Write-Host "   Date : $($ks.LastWriteTime)" -ForegroundColor Gray
    
    # Essayer d'obtenir l'empreinte SHA-1
    try {
        $result = keytool -list -v -keystore $ks.FullName 2>&1 | Select-String -Pattern "SHA 1:|SHA1:" 
        
        if ($result) {
            $sha1 = ($result -split ":")[-1].Trim()
            Write-Host "   SHA-1 : $sha1" -ForegroundColor Yellow
            
            if ($sha1 -eq $expectedSHA1) {
                Write-Host "   ✅ CORRESPOND À L'EMPREINTE ATTENDUE !" -ForegroundColor Green
                Write-Host "   🎯 C'EST LA BONNE KEYSTORE !" -ForegroundColor Green -BackgroundColor DarkGreen
            } else {
                Write-Host "   ❌ Ne correspond pas" -ForegroundColor Red
            }
        } else {
            Write-Host "   ⚠️  Impossible de lire l'empreinte (mot de passe requis ?)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Erreur lors de la lecture : $_" -ForegroundColor Yellow
    }
    
    Write-Host ("-"*80) -ForegroundColor Gray
}

Write-Host "`n✅ Recherche terminée !" -ForegroundColor Green
Write-Host "`nSi vous avez trouvé la bonne keystore, configurez-la dans EAS avec :" -ForegroundColor Cyan
Write-Host "   eas credentials" -ForegroundColor White
