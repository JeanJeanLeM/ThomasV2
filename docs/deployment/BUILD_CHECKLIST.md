# ✅ Checklist Avant Build Production

## 📋 Pré-Build

### Configuration App
- [x] Version : 2.0.0 (dans `app.json`)
- [x] Version code Android : 30 (dans `app.json`)
- [x] Package Android : `marketgardener.thomas.v2`
- [x] Bundle ID iOS : `fr.thomas-assistant.mobile`
- [x] Variables d'environnement configurées dans `eas.json`

### Tests
- [ ] APK preview testé et validé
- [ ] Pas de crash au démarrage
- [ ] Fonctionnalités critiques testées
- [ ] Performance acceptable
- [ ] Mode offline fonctionne

### Assets
- [ ] Icon app vérifié (512x512 pour Android, 1024x1024 pour iOS)
- [ ] Splash screen configuré
- [ ] Permissions déclarées correctement

---

## 🤖 Build Android Production

### Commande
```bash
eas build --platform android --profile production
```

### Vérifications Post-Build
- [ ] Build terminé avec succès
- [ ] AAB téléchargé
- [ ] Taille AAB raisonnable (< 50MB)
- [ ] Version code correct (30 ou supérieur)
- [ ] Pas d'erreurs dans les logs

### Upload Play Store
- [ ] AAB uploadé sur Play Console
- [ ] Notes de version remplies
- [ ] Rollout configuré
- [ ] Soumis pour révision

---

## 🍎 Build iOS Production

### Prérequis
- [ ] Compte Apple Developer actif
- [ ] Certificats iOS configurés dans EAS
- [ ] Bundle ID vérifié

### Commande
```bash
eas build --platform ios --profile production
```

### Vérifications Post-Build
- [ ] Build terminé avec succès
- [ ] IPA téléchargé
- [ ] Taille IPA raisonnable (< 100MB)
- [ ] Build number incrémenté
- [ ] Pas d'erreurs dans les logs

### Upload App Store
- [ ] IPA uploadé sur App Store Connect
- [ ] Privacy Nutrition Label complété
- [ ] Screenshots uploadés
- [ ] Notes de version remplies
- [ ] Soumis pour révision

---

## 📝 Assets Store

### Google Play Store
- [ ] Icon 512x512
- [ ] Feature Graphic 1024x500
- [ ] Screenshots (2-8 images)
- [ ] Description store
- [ ] Notes de version

### Apple App Store
- [ ] Icon 1024x1024 (sans transparence)
- [ ] Screenshots iPhone 6.5" (min 3)
- [ ] Screenshots iPhone 5.5" (min 3)
- [ ] Screenshots iPad 12.9" (min 3, si support)
- [ ] Description store
- [ ] Privacy Nutrition Label
- [ ] Notes de version

---

## 🎯 Post-Publication

### Monitoring
- [ ] Surveiller crashes (Play Console / App Store Connect)
- [ ] Lire et répondre aux reviews
- [ ] Monitorer statistiques d'installation
- [ ] Vérifier Pre-Launch Reports (Android)

---

**Tout est prêt ?** Lancez les builds ! 🚀
