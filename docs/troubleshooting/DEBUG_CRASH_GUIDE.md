# 🐛 Guide Debug Crash Thomas V2

## Installation ADB (si nécessaire)

Si la commande `adb` n'est pas reconnue :

### Télécharger Platform Tools
```
https://developer.android.com/studio/releases/platform-tools
```

1. Téléchargez le ZIP
2. Extrayez dans `C:\platform-tools\`
3. Ajoutez au PATH :
   - Windows : Paramètres → Système → Paramètres système avancés → Variables d'environnement
   - Ajoutez `C:\platform-tools` au PATH

Ou utilisez cette commande rapide :
```powershell
choco install adb
```

## 🔍 Commandes de Debug

### 1. Vérifier la connexion
```bash
adb devices
```

### 2. Lancer l'app et capturer les logs
```bash
adb logcat -c
adb logcat | Select-String -Pattern "thomas|Thomas|react|React|ERROR|FATAL|crash" -CaseSensitive:$false
```

### 3. Logs complets (si trop de bruit)
```bash
adb logcat *:E
```

### 4. Sauvegarder les logs dans un fichier
```bash
adb logcat > thomas_crash_logs.txt
```

Puis après le crash, `Ctrl+C` et envoyez-moi le fichier.

## 🎯 Procédure Complète

1. **Lancer la capture de logs** :
```powershell
adb logcat -c
adb logcat | Select-String -Pattern "thomas|react|ERROR" > crash.txt
```

2. **Lancer Thomas** sur le téléphone

3. **Attendre le crash**

4. **Arrêter** (`Ctrl+C`) après le crash

5. **M'envoyer** les dernières lignes de `crash.txt`

## 📋 Exemple de ce que je cherche

Les erreurs importantes ressemblent à :
```
E/ReactNativeJS: Error: Variables d'environnement manquantes
E/AndroidRuntime: FATAL EXCEPTION: main
E/ReactNativeJS: TypeError: undefined is not an object
```

## 🚀 Commande Rapide (Recommandée)

La plus simple :

```powershell
adb logcat -c && adb logcat | Select-String -Pattern "thomas|react|error|fatal" -Context 2 > crash.txt
```

Puis lancez l'app, attendez le crash, `Ctrl+C`, et envoyez-moi `crash.txt`.

