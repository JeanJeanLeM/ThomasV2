# Deploy Supabase Edge Functions
# Usage: .\scripts\deploy-functions.ps1

# Load .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "Env:$name" -Value $value
    }
}

Write-Host "[DEPLOY] Edge Functions to project: $env:SUPABASE_PROJECT_ID" -ForegroundColor Cyan

if (-not $env:SUPABASE_ACCESS_TOKEN -or $env:SUPABASE_ACCESS_TOKEN -eq "VOTRE_TOKEN_ICI") {
    Write-Host "[ERROR] SUPABASE_ACCESS_TOKEN manquant dans .env" -ForegroundColor Red
    Write-Host "   Generez-le ici: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    exit 1
}

# Deploy all functions
$functions = @(
    "thomas-agent-pipeline",
    "thomas-agent-v2",
    "transcribe-audio"
)

foreach ($fn in $functions) {
    Write-Host "`n[DEPLOYING] $fn..." -ForegroundColor Yellow
    npx supabase functions deploy $fn --project-ref $env:SUPABASE_PROJECT_ID
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $fn deployed" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Failed to deploy $fn" -ForegroundColor Red
    }
}

Write-Host "`n[DONE] Deployment complete!" -ForegroundColor Green
