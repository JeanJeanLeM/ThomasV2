# Configuration SMTP OVH pour Thomas V2

## 📧 Option 1 : Email Pro / Exchange OVH

### Avantages :
- ✅ **Intégré à votre hébergement**
- ✅ **Support français**
- ✅ **Délivrabilité excellente**
- ✅ **Pas de limite stricte d'envoi**

### Configuration SMTP :
```
Host: ssl0.ovh.net (ou pro1.mail.ovh.net pour Email Pro)
Port: 587 (STARTTLS) ou 465 (SSL)
Username: votre-email@votredomaine.com
Password: mot-de-passe-email
Enable TLS: Oui
```

### Étapes :
1. **Créez un email** : noreply@votredomaine.com (dans votre espace client OVH)
2. **Utilisez ces paramètres** dans Supabase
3. **Testez l'envoi**

## 📧 Option 2 : OVH Mail (Hébergement web)

### Si vous avez un hébergement web OVH :
```
Host: ssl0.ovh.net
Port: 587
Username: votre-email@votredomaine.com
Password: mot-de-passe-email
```

## 📧 Option 3 : OVH SMS/Email API (Transactionnel)

### Pour de gros volumes :
- **Service** : https://www.ovh.com/fr/emails/
- **API dédiée** aux emails transactionnels
- **Tarification** : ~0.0001€ par email
- **Intégration** : Plus complexe mais très fiable

## ⚙️ Configuration dans Supabase

### Paramètres SMTP OVH :
1. **Allez sur** : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh/auth/templates
2. **Cliquez "Settings"**
3. **Section "SMTP Settings"** :
   - **Enable custom SMTP** : ✅ Activé
   - **Host** : `ssl0.ovh.net`
   - **Port** : `587`
   - **Username** : `noreply@votredomaine.com`
   - **Password** : `[Mot de passe de l'email]`
   - **Sender name** : `Thomas V2`
   - **Sender email** : `noreply@votredomaine.com`
4. **Cliquez "Save"**

## 🔧 Étapes détaillées OVH

### 1. Créer un email dédié
1. **Espace client OVH** → **Emails**
2. **Créer un compte email** : `noreply@votredomaine.com`
3. **Définir un mot de passe fort**

### 2. Vérifier les paramètres SMTP
- **Serveur sortant** : ssl0.ovh.net
- **Port** : 587 (recommandé) ou 465
- **Authentification** : Oui
- **Chiffrement** : STARTTLS ou SSL

### 3. Tester la configuration
- **Envoyez un email de test** depuis Supabase
- **Vérifiez les logs** OVH si problème

## 🚨 Points importants OVH

### Limitations à connaître :
- **Limite d'envoi** : ~200 emails/heure (hébergement standard)
- **Réputation** : Partagée avec d'autres clients
- **SPF/DKIM** : Configurés automatiquement par OVH

### Avantages :
- **Pas de coût supplémentaire** (si vous avez déjà l'hébergement)
- **Support en français**
- **Configuration simple**
- **Bonne délivrabilité**

## 🎯 Recommandation

### Pour Thomas V2 (développement/test) :
**Utilisez Email Pro OVH** si vous l'avez déjà, sinon **créez un email simple** sur votre hébergement web.

### Configuration recommandée :
```
Email: noreply@votredomaine.com
Host: ssl0.ovh.net
Port: 587
TLS: Activé
```

## 🔄 Alternative hybride

Vous pouvez aussi :
1. **Développement** : OVH SMTP (simple)
2. **Production** : SendGrid (plus robuste)

Cela vous permet de tester rapidement avec OVH, puis migrer vers SendGrid si nécessaire.


