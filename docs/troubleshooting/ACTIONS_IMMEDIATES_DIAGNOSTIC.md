# 🚨 Actions Immédiates - Diagnostic Network Error

## ✅ Modifications Appliquées

### 1. Écran de diagnostic embarqué créé ✅
**Fichier** : `src/screens/NetworkDiagnosticScreen.tsx`

Écran complet de diagnostic qui teste :
- Configuration Supabase
- Variables d'environnement (si compilées dans APK)
- Connectivité Internet
- Connexion à Supabase
- Endpoints Auth et Database

### 2. Messages d'erreur améliorés ✅
**Fichier** : `src/screens/AuthScreens.tsx`

Maintenant affiche :
- Code d'erreur technique
- Type d'erreur
- Détails JSON complets
- Indication pour ouvrir le diagnostic

### 3. Accès au diagnostic ✅
**Méthode** : **Taper 5× rapidement sur le logo 🌾**

Un compteur s'affiche après chaque tap

---

## 🚀 Prochaines Étapes (DANS L'ORDRE)

### Étape 1 : Rebuild l'APK (OBLIGATOIRE) ⏱️ ~20-30 min

```bash
# Option A : Preview (rapide, pour test)
eas build --platform android --profile preview

# Option B : Production (si tout fonctionne)
eas build --platform android --profile production
```

**Pourquoi ?** L'écran de diagnostic doit être compilé dans l'APK

### Étape 2 : Installer la nouvelle APK ⏱️ ~2 min

1. Télécharger l'APK depuis EAS Build
2. Désinstaller l'ancienne version
3. Installer la nouvelle APK

### Étape 3 : Exécuter le diagnostic ⏱️ ~1 min

1. Ouvrir Thomas V2
2. **Taper 5× rapidement sur le logo 🌾** (en haut de l'écran)
3. L'écran de diagnostic s'ouvre
4. Laisser les tests s'exécuter (6 tests automatiques)
5. **Copier le rapport** avec le bouton "Copier rapport"
6. **ME PARTAGER LE RAPPORT** (coller ici)

### Étape 4 : (Optionnel) Logs ADB via PowerShell ⏱️ ~10 min

**Si le diagnostic embarqué ne suffit pas**, exécuter le script PowerShell.

**Commande complète** (voir `DIAGNOSTIC_NETWORK_ANDROID.md`) :
```powershell
# Coller ce script dans PowerShell
New-Item -ItemType Directory -Force -Path ".\logs_thomas" | Out-Null
Write-Host "`n=== DIAGNOSTIC THOMAS V2 ===" -ForegroundColor Cyan
...
# (Script complet dans le guide)
```

---

## 📊 Ce que je vais voir dans le rapport

### Scénario 1 : Variables d'environnement manquantes

```
❌ Variables d'environnement: SUPABASE_URL non chargée dans l'APK !
```

**➡️ Solution** : Problème de build EAS, rebuild avec `--clear-cache`

### Scénario 2 : Pas d'Internet

```
✅ Configuration OK
✅ Variables d'environnement OK
❌ Connectivité réseau: Network request failed
   Code: ENOTFOUND
```

**➡️ Solution** : 
- Vérifier WiFi/4G actif
- Tester sur un autre réseau
- Désactiver VPN/antivirus

### Scénario 3 : Firewall bloque Supabase

```
✅ Configuration OK
✅ Variables d'environnement OK
✅ Connectivité réseau OK
❌ Ping Supabase: Impossible de contacter Supabase
```

**➡️ Solution** :
- Tester sur 4G au lieu de WiFi
- Firewall/proxy bloque `*.supabase.co`
- Tester sur un autre réseau

### Scénario 4 : Problème certificat SSL

```
...
❌ SSLHandshakeException
```

**➡️ Solution** :
- Vérifier date/heure du téléphone
- Certificat expiré ou invalide

### Scénario 5 : Tout fonctionne !

```
✅ Configuration OK (2ms)
✅ Variables d'environnement OK (1ms)
✅ Internet accessible (245ms)
✅ Supabase accessible (412ms)
✅ Endpoint Auth OK (567ms)
✅ Endpoint Database OK (623ms)
```

**➡️ Si tous passent mais erreur lors de la connexion** :
- Le réseau fonctionne parfaitement
- Le problème vient des credentials (email/mot de passe invalide)
- OU problème côté serveur Supabase

---

## 🎯 Timeline

| Étape | Action | Durée |
|-------|--------|-------|
| 1 | Rebuild APK avec diagnostic | 20-30 min |
| 2 | Télécharger + Installer | 2 min |
| 3 | Exécuter diagnostic (5× tap) | 1 min |
| 4 | Copier et partager rapport | 1 min |
| 5 | (Opt) Logs ADB PowerShell | 10 min |
| **TOTAL** | **~25-45 min** | |

---

## 📝 Format du rapport à partager

Après avoir copié le rapport, il ressemblera à :

```
=== DIAGNOSTIC RÉSEAU ANDROID ===
Date: 06/01/2026 14:23:45
Platform: android 33

=== RÉSUMÉ DES TESTS ===
📋 Configuration: SUCCESS
  Message: Configuration OK
  Durée: 2ms
  Détails: {...}

🔑 Variables d'environnement: SUCCESS
  Message: Variables d'environnement OK
  Durée: 1ms

🌐 Connectivité réseau: ERROR
  Message: Network request failed
  Durée: 5234ms
  Détails: {...}

...

=== LOGS COMPLETS ===
[14:23:45] 🚀 Démarrage des diagnostics...
[14:23:45] ℹ️ Test 1: Vérification configuration...
...
```

**➡️ Copier-coller TOUT le rapport ici**

---

## 🔬 Commandes PowerShell (si besoin)

### Installation ADB (si pas installé)

```powershell
# Via Chocolatey
choco install adb

# Vérifier
adb version
```

### Diagnostic rapide

```powershell
# 1. Vérifier appareil connecté
adb devices

# 2. Nettoyer logs
adb logcat -c

# 3. Capturer (Ctrl+C après erreur)
adb logcat *:E > logs_thomas.txt

# 4. Analyser
Select-String -Path "logs_thomas.txt" -Pattern "network|Network" -Context 3
```

---

## 📚 Documentation créée

| Fichier | Description |
|---------|-------------|
| `DIAGNOSTIC_NETWORK_ANDROID.md` | Guide complet des logs ADB PowerShell |
| `GUIDE_DIAGNOSTIC_RESEAU.md` | Guide utilisateur du diagnostic embarqué |
| `ACTIONS_IMMEDIATES_DIAGNOSTIC.md` | Ce fichier (actions rapides) |
| `src/screens/NetworkDiagnosticScreen.tsx` | Écran de diagnostic (à compiler) |

---

## ✅ Checklist avant de partager

Avant de me partager les infos, vérifier :

- [ ] APK rebuilt avec le nouveau code
- [ ] Nouvelle APK installée
- [ ] Diagnostic exécuté (5× tap sur 🌾)
- [ ] Rapport copié avec bouton "Copier rapport"
- [ ] Informations système notées :
  - [ ] Marque/modèle téléphone
  - [ ] Version Android
  - [ ] Type de connexion (WiFi/4G)
  - [ ] VPN actif ou non

---

## 🎯 Ce que j'attends de vous MAINTENANT

### Option A : Diagnostic embarqué (RECOMMANDÉ)

1. **Rebuilder l'APK** :
   ```bash
   eas build --platform android --profile preview
   ```

2. **Attendre le build** (~20-30 min)

3. **Installer la nouvelle APK**

4. **Exécuter diagnostic** (5× tap sur 🌾)

5. **ME PARTAGER** :
   - Le rapport complet (copier-coller)
   - Marque/modèle du téléphone
   - Version Android
   - Type de connexion utilisée

### Option B : Logs ADB (si vous voulez tout de suite)

1. **Connecter téléphone en USB**

2. **Activer débogage USB**

3. **Exécuter dans PowerShell** :
   ```powershell
   adb logcat -c
   adb logcat *:E
   ```

4. **Sur le téléphone** : Ouvrir Thomas V2 → Essayer connexion

5. **Ctrl+C** après l'erreur

6. **ME PARTAGER** les dernières 50 lignes du log

---

## 💬 Questions à me poser maintenant

- "Le rebuild est lancé, j'attends le résultat" ✅
- "J'ai le rapport du diagnostic, le voici : ..." ✅
- "Comment activer le débogage USB ?" ✅
- "ADB ne détecte pas mon téléphone" ✅
- "Tous les tests passent mais ça ne marche toujours pas" ✅

---

**Priorité** : 🔴 CRITIQUE  
**Action suivante** : Rebuild APK avec diagnostic embarqué  
**Temps estimé** : ~25-30 minutes

