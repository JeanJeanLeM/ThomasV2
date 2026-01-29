# 🔴 FIX CRITIQUE: URL Supabase Invalide

## 🚨 PROBLÈME IDENTIFIÉ

L'URL Supabase dans votre configuration **N'EXISTE PAS** :

```
https://kvwzbofifqqytyfertkhh.supabase.co
```

**Résultat DNS** :
```
Non-existent domain
```

---

## 🔍 Vérification

### Test depuis votre PC :
```powershell
nslookup kvwzbofifqqytyfertkhh.supabase.co
# Résultat : Non-existent domain
```

### Test depuis le téléphone :
```powershell
adb shell ping -c 2 kvwzbofifqqytyfertkhh.supabase.co
# Résultat : unknown host
```

**Conclusion** : Le projet Supabase n'existe pas ou a été supprimé.

---

## 🎯 ACTIONS IMMÉDIATES

### 1. Vérifier le Dashboard Supabase

**Allez sur** : https://supabase.com/dashboard

**Vérifiez** :
- [ ] Le projet existe-t-il ?
- [ ] Le projet est-il actif (pas en pause) ?
- [ ] Quelle est la vraie URL ?

### 2. Obtenir la bonne URL

Dans le Dashboard Supabase :

1. Cliquer sur votre projet
2. **Settings** (⚙️) → **API**
3. Copier **Project URL**

Format : `https://XXXXX.supabase.co`

### 3. Mettre à jour eas.json

Une fois que vous avez la bonne URL :

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://VOTRE-VRAIE-URL.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "votre-anon-key"
      }
    }
  }
}
```

### 4. Rebuilder l'APK

```bash
eas build --platform android --profile preview
```

---

## 📊 Scénarios possibles

### Scénario A : Projet supprimé (40%)

**Si le projet n'existe plus** :
1. Créer un nouveau projet Supabase
2. Migrer la base de données (si backup disponible)
3. Mettre à jour eas.json avec la nouvelle URL

### Scénario B : Projet en pause (30%)

**Plan gratuit Supabase** : Les projets inactifs sont mis en pause après 7 jours.

**Solution** :
1. Dashboard → Votre projet
2. Cliquer sur "Resume project"
3. Attendre 2-3 minutes
4. Récupérer l'URL

### Scénario C : URL incorrecte (20%)

**Si vous avez fait une faute de frappe** :
1. Vérifier la vraie URL dans le Dashboard
2. Corriger dans eas.json
3. Rebuilder

### Scénario D : Projet migré (10%)

**Si Supabase a migré votre projet** :
1. Vérifier les emails de Supabase
2. Nouvelle URL dans le Dashboard
3. Mettre à jour

---

## 🔬 Tests de validation

### Une fois la bonne URL obtenue :

```powershell
# Remplacer XXXXX par votre vraie URL
nslookup XXXXX.supabase.co

# Devrait afficher une adresse IP, pas "Non-existent domain"
```

### Test depuis le téléphone :

```powershell
adb shell ping -c 2 XXXXX.supabase.co

# Devrait afficher : 2 packets transmitted, 2 received
```

---

## 💡 Pourquoi ça ne marchait pas

### Séquence d'erreurs :

1. L'app essaie de contacter `kvwzbofifqqytyfertkhh.supabase.co`
2. Le DNS répond "domaine inexistant"
3. Aucune connexion possible
4. → Status 0, Network request failed

### Ce n'était PAS :
- ❌ Un problème de permissions Android
- ❌ Un problème de firewall
- ❌ Un problème de DNS local
- ❌ Un problème de code

### C'était :
- ✅ **L'URL Supabase elle-même n'existe pas**

---

## 📋 Checklist de correction

- [ ] Se connecter au Dashboard Supabase
- [ ] Vérifier que le projet existe
- [ ] Si en pause → Réactiver
- [ ] Copier la vraie URL du projet
- [ ] Copier la vraie ANON_KEY
- [ ] Mettre à jour eas.json
- [ ] Tester l'URL avec nslookup
- [ ] Rebuilder l'APK
- [ ] Tester sur le téléphone

---

## 🆘 Si le projet n'existe plus

### Créer un nouveau projet Supabase :

1. **Dashboard** → **New Project**
2. Nom : Thomas V2
3. Database Password : (noter quelque part)
4. Region : Europe (Paris recommandé)
5. **Create project**

### Récupérer les credentials :

1. **Settings** → **API**
2. Copier **Project URL**
3. Copier **anon public key**

### Migrer la base de données :

Si vous avez un backup :
```bash
# Restaurer depuis un dump SQL
psql -h NOUVELLE-URL -U postgres -d postgres < backup.sql
```

Si vous n'avez pas de backup :
- Relancer les migrations dans `supabase/Migrations/`

---

## 🎯 RÉPONDEZ-MOI

### Question 1 : Le projet existe-t-il dans le Dashboard ?

- [ ] Oui, il existe et est actif
- [ ] Oui, mais il est en pause
- [ ] Non, il n'existe plus
- [ ] Je ne sais pas me connecter au Dashboard

### Question 2 : Si le projet existe, quelle est la vraie URL ?

```
https://_________________.supabase.co
```

### Question 3 : Avez-vous accès au Dashboard Supabase ?

- [ ] Oui, je suis connecté
- [ ] Non, j'ai perdu les identifiants
- [ ] Non, ce n'est pas mon projet

---

**Priorité** : 🔴 CRITIQUE  
**Cause** : URL Supabase invalide/inexistante  
**Solution** : Obtenir la vraie URL depuis le Dashboard  
**Temps estimé** : 5 min (si projet existe) ou 30 min (si nouveau projet)

