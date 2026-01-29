# 🚨 URGENT : Récupérer la VRAIE ANON_KEY

## 🔴 Problème

Après le rebuild, les mêmes erreurs persistent. Cela signifie que l'ANON_KEY est toujours incorrecte.

---

## 🔑 SOLUTION : Copier la clé DIRECTEMENT depuis Supabase

### Étape 1 : Aller sur le Dashboard

**URL** : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh/settings/api

### Étape 2 : Copier la clé ANON

Dans la section **Project API keys** :

1. Cherchez la ligne **`anon`** **`public`**
2. Cliquez sur l'icône 👁️ pour révéler la clé
3. Cliquez sur l'icône 📋 pour copier

**Format attendu** :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3pib2ZpZnFxeXR5ZmVydGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTQ0NzQsImV4cCI6MjA1MTEzMDQ3NH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                                                                                                                                                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                                                                                                                            Cette partie doit être DIFFÉRENTE
```

---

## 🔬 Vérification de la clé actuelle

La clé dans votre .env semble suspecte. Un JWT valide a 3 parties :
1. **Header** (algorithme)
2. **Payload** (données)
3. **Signature** (validation)

**Format normal** : `header.payload.signature`

---

## 🎯 Actions immédiates

### 1. Ouvrir le Dashboard Supabase

Cliquez ici : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh/settings/api

### 2. Copier la clé "anon public"

**⚠️ IMPORTANT** : Copiez TOUTE la clé, elle est très longue !

### 3. Coller la clé ici

```
[Coller la clé complète ici]
```

### 4. Je vais :
- Mettre à jour eas.json
- Mettre à jour .env
- Vous dire de rebuilder

---

## 🔍 Diagnostic possible

### Si l'erreur persiste après avoir copié la bonne clé :

**Vérifiez** :
1. La clé copiée est bien la **`anon`** (pas `service_role`)
2. La clé est complète (très longue, ~300+ caractères)
3. Pas d'espaces au début/fin
4. Le projet Supabase est bien actif (pas en pause)

---

## ⏰ Timeline après correction

1. Copier la vraie clé : **30 secondes**
2. Je mets à jour les fichiers : **30 secondes**
3. Rebuild APK : **20-30 minutes**
4. Test : **1 minute**
5. **✅ Connexion fonctionne !**

---

**➡️ COPIEZ LA CLÉ DEPUIS LE DASHBOARD ET COLLEZ-LA ICI** 🔑

