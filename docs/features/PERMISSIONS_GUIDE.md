# Guide des Autorisations - Chat Interface

## 🎯 Fonctionnement des Autorisations

### 📱 Sur Mobile (iOS/Android)
Les boutons demandent les **VRAIES autorisations système** :

#### 🎥 Bouton Caméra
- **Permission demandée** : Accès à l'appareil photo
- **Popup système** : "ThomasV2 souhaite accéder à votre appareil photo"
- **Si acceptée** : Ouvre l'interface native de capture photo
- **Si refusée** : Propose d'aller dans les paramètres

#### 🖼️ Bouton Galerie
- **Permission demandée** : Accès à la galerie photo
- **Popup système** : "ThomasV2 souhaite accéder à vos photos"
- **Si acceptée** : Ouvre la galerie de sélection d'images
- **Si refusée** : Propose d'aller dans les paramètres

#### 🎤 Bouton Microphone
- **Permission demandée** : Accès au microphone
- **Popup système** : "ThomasV2 souhaite accéder à votre microphone"
- **Si acceptée** : Configure l'audio pour l'enregistrement
- **Si refusée** : Propose d'aller dans les paramètres

### 🌐 Sur Web (Développement)
Les boutons **simulent** le comportement pour permettre le développement :

- **Indicateur visuel** : Bannière orange "Mode Web - Autorisations simulées"
- **Popups de test** : Permettent de simuler "Succès" ou "Refus" d'autorisation
- **Pas d'accès réel** : Aucun matériel n'est utilisé (sécurité web)
- **Logs détaillés** : Console avec émojis pour suivre le flux

## 🧪 Comment Tester

### Test en Développement Web
1. Lancez `expo start --web`
2. Cliquez sur un bouton (📷, 🖼️ ou 🎤)
3. Un popup apparaît avec options de simulation
4. Choisissez "Simuler succès" ou "Simuler refus"
5. Observez les logs dans la console

### Test sur Device/Émulateur
1. Lancez `expo start`
2. Scannez le QR code ou utilisez un émulateur
3. Cliquez sur un bouton - **popup système réel**
4. Acceptez ou refusez l'autorisation
5. Testez le comportement dans les deux cas

## 🔧 Configuration

### Permissions configurées dans `app.json` :

```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Cette application a besoin d'accéder à la caméra pour prendre des photos.",
      "NSMicrophoneUsageDescription": "Cette application a besoin d'accéder au microphone pour enregistrer des messages vocaux.",
      "NSPhotoLibraryUsageDescription": "Cette application a besoin d'accéder à la galerie photo pour sélectionner des images."
    }
  },
  "android": {
    "permissions": [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

### Dépendances requises :
```json
{
  "expo-image-picker": "~14.7.1",
  "expo-av": "~13.10.6"
}
```

## 🚀 Intégration Future

### TODO - Fonctionnalités à implémenter :
- [ ] Traitement des images capturées/sélectionnées
- [ ] Envoi des images dans le chat
- [ ] Enregistrement vocal complet
- [ ] Envoi des messages vocaux
- [ ] Redirection vers paramètres système (Settings.openSettings())
- [ ] Gestion du cache des permissions

### Logs à surveiller :
```bash
# Sur mobile - vraies permissions
📱 Demande RÉELLE d'autorisation caméra...
✅ Permission caméra accordée
📸 Photo réellement prise: file://path/to/image.jpg

# Sur web - simulation
Web Dev: Photo simulée capturée
```

## 🔒 Sécurité

- **Permissions minimales** : Seules les permissions nécessaires sont demandées
- **Messages clairs** : Chaque permission explique pourquoi elle est nécessaire
- **Gestion des refus** : L'application continue de fonctionner même sans permissions
- **Compatibilité web** : Aucun accès matériel en mode développement web
