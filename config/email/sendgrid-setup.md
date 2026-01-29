# Configuration SendGrid pour Thomas V2

## 📧 Étape 1 : Créer un compte SendGrid

1. **Allez sur** : https://sendgrid.com/
2. **Cliquez "Start for free"**
3. **Créez votre compte** avec vos informations
4. **Vérifiez votre email** de confirmation SendGrid

## 🔑 Étape 2 : Créer une API Key

1. **Connectez-vous à SendGrid**
2. **Allez dans Settings → API Keys**
3. **Cliquez "Create API Key"**
4. **Nommez-la** : "Thomas V2 SMTP"
5. **Sélectionnez "Restricted Access"**
6. **Activez uniquement** : "Mail Send" → "Full Access"
7. **Cliquez "Create & View"**
8. **⚠️ COPIEZ LA CLÉ IMMÉDIATEMENT** (elle ne sera plus visible)

## 📨 Étape 3 : Vérifier un domaine d'expéditeur

### Option A : Domaine personnalisé (Recommandé)
1. **Settings → Sender Authentication → Domain Authentication**
2. **Ajoutez votre domaine** (ex: thomasv2.fr)
3. **Suivez les instructions DNS**

### Option B : Single Sender (Plus simple)
1. **Settings → Sender Authentication → Single Sender Verification**
2. **Ajoutez votre email** (ex: noreply@votredomaine.com)
3. **Vérifiez l'email de confirmation**

## ⚙️ Étape 4 : Configuration SMTP dans Supabase

### Paramètres SMTP SendGrid :
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Votre API Key SendGrid]
Sender name: Thomas V2
Sender email: [Email vérifié à l'étape 3]
```

## 🔧 Étape 5 : Configuration dans Supabase Dashboard

1. **Allez sur** : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh/auth/templates
2. **Cliquez "Settings"** (onglet en haut)
3. **Section "SMTP Settings"** :
   - **Enable custom SMTP** : ✅ Activé
   - **Host** : `smtp.sendgrid.net`
   - **Port** : `587`
   - **Username** : `apikey`
   - **Password** : `[Votre API Key SendGrid]`
   - **Sender name** : `Thomas V2`
   - **Sender email** : `[Votre email vérifié]`
4. **Cliquez "Save"**

## ✅ Étape 6 : Test

1. **Créez un nouveau compte** dans votre app
2. **Vérifiez que l'email arrive** (inbox + spam)
3. **Cliquez sur le lien de confirmation**
4. **Connectez-vous à l'app** ✨

## 🎯 Avantages SendGrid :
- ✅ **100 emails/jour gratuits** (largement suffisant pour dev/test)
- ✅ **Délivrabilité excellente**
- ✅ **Analytics détaillées**
- ✅ **Templates d'emails personnalisables**
- ✅ **Support technique**

## 🚨 Points importants :
- **Username** est toujours `apikey` (pas votre email)
- **Password** est votre API Key SendGrid
- **Sender email** doit être vérifié dans SendGrid
- **Gardez votre API Key secrète** !


