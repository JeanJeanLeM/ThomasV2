# 🍎 Configuration Build iOS pour App Store

## ✅ Configuration Actuelle

### Fichiers Configurés

1. **`app.json`** ✅
   - Bundle ID : `fr.thomas-assistant.mobile`
   - Version : `2.0.0`
   - Build Number : `1` (auto-increment activé)
   - `ITSAppUsesNonExemptEncryption: false` ajouté

2. **`eas.json`** ✅
   - `appVersionSource: "local"` configuré
   - `autoIncrement: true` activé
   - Variables d'environnement configurées

## 🔧 Étape Suivante : Configuration des Credentials iOS

### Option 1 : Configuration Interactive (Recommandé)

Lancez cette commande dans votre terminal **en mode interactif** :

```bash
eas build --platform ios --profile production
```

EAS vous guidera pour :
1. Configurer les certificats de distribution iOS
2. Configurer les provisioning profiles
3. Valider les credentials

**Important** : Vous devez avoir :
- Un compte Apple Developer actif
- Les permissions nécessaires pour créer des certificats
- Un Apple Team ID valide

### Option 2 : Configuration Manuelle des Credentials

Si vous préférez configurer manuellement :

```bash
# Accéder à la gestion des credentials
eas credentials

# Sélectionner iOS
# Suivre les instructions pour :
# - Distribution Certificate
# - Provisioning Profile
```

## 📦 Lancer le Build

Une fois les credentials configurés, lancez :

```bash
eas build --platform ios --profile production
```

Le build prendra environ 15-30 minutes.

## 📋 Vérifications Avant Build

- [x] Bundle ID configuré : `fr.thomas-assistant.mobile`
- [x] Version : `2.0.0`
- [x] Build Number initial : `1`
- [x] `ITSAppUsesNonExemptEncryption` : `false`
- [x] Variables d'environnement configurées
- [ ] Credentials iOS configurés (à faire en mode interactif)

## 🚀 Après le Build

Une fois le build terminé :

1. **Télécharger le fichier IPA** :
   ```bash
   eas build:download --platform ios --latest
   ```

2. **Soumettre à l'App Store** :
   ```bash
   eas submit --platform ios --profile production
   ```

   Ou manuellement via App Store Connect / Transporter

3. **Suivre le guide de publication** :
   - Voir `docs/deployment/PUBLICATION_APP_STORE_GUIDE.md`

## 📝 Notes

- Le build number sera automatiquement incrémenté à chaque build
- Les credentials sont stockés de manière sécurisée sur les serveurs EAS
- Le certificat de distribution doit être valide pour les builds de production

## 🆘 Problèmes Courants

### "Credentials are not set up"
→ Lancez `eas build --platform ios --profile production` en mode interactif pour configurer

### "Distribution Certificate is not validated"
→ Vérifiez votre compte Apple Developer et les permissions

### "Invalid Bundle ID"
→ Vérifiez que le Bundle ID dans `app.json` correspond à celui dans App Store Connect
