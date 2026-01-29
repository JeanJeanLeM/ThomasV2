# 🎯 Guide Final - Setup Complet Thomas V2

## ✅ Solution Finale : Vrais Utilisateurs Auth

Cette approche crée de **vrais utilisateurs** dans `auth.users` qui fonctionnent parfaitement avec RLS et les contraintes FK.

## 📋 Ordre d'Exécution

### **1. Migration de Base**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/migrations/001_farms_multi_tenant.sql
```
✅ Crée toutes les tables, RLS, contraintes FK, fonctions

### **2. Créer les Utilisateurs de Test**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/seeds/000_create_test_users.sql
```
✅ Crée 3 vrais utilisateurs dans `auth.users` + leurs profils

### **3. Insérer les Données de Test**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/seeds/001_test_data_with_real_users.sql
```
✅ Insère toutes les données avec les vrais UUIDs

## 👥 Comptes de Test Créés

| Email | Mot de passe | Rôle | Accès |
|-------|-------------|------|-------|
| `thomas.test@gmail.com` | `password123` | Propriétaire | Toutes les fermes |
| `marie.martin@ferme.fr` | `password123` | Manager | Ferme Bio des Collines |
| `pierre.durand@conseil.fr` | `password123` | Conseiller | GAEC du Soleil Levant |

## 🎯 Avantages de cette Approche

### ✅ **Fonctionne Parfaitement**
- Vrais utilisateurs dans `auth.users`
- RLS activé et fonctionnel
- Contraintes FK respectées
- Authentification complète

### ✅ **Testable Immédiatement**
- Connexion via l'app avec les emails de test
- Données visibles selon les permissions
- Multi-tenant fonctionnel

### ✅ **Proche de la Production**
- Même structure qu'en production
- Même sécurité qu'en production
- Même comportement qu'en production

## 🧪 Tests Possibles

### **Test 1 : Connexion Thomas**
```
Email: thomas.test@gmail.com
Password: password123
Résultat attendu: Voir les 3 fermes
```

### **Test 2 : Connexion Marie**
```
Email: marie.martin@ferme.fr  
Password: password123
Résultat attendu: Voir 1 ferme (Bio des Collines) en tant que Manager
```

### **Test 3 : Connexion Pierre**
```
Email: pierre.durand@conseil.fr
Password: password123
Résultat attendu: Voir 1 ferme (GAEC) en tant que Conseiller
```

## 📊 Données Créées

### **3 Fermes**
1. **Ferme Bio des Collines** (5.2 ha, maraîchage)
2. **GAEC du Soleil Levant** (12.8 ha, mixte)  
3. **Les Jardins de Thomas** (2.1 ha, permaculture)

### **8 Parcelles**
- Serres plastique/verre
- Tunnels bâchés
- Plein champ, verger, mandala

### **8 Matériels**
- Tracteurs Kubota (L3301, M7040)
- Outils (rotavator, charrue, grelinette)
- Matériel marketing (cagettes)

### **4 Tâches**
- Assignées aux différents utilisateurs
- Différents statuts et priorités
- Liées aux parcelles et matériels

### **2 Membres**
- Marie : Manager ferme 1
- Pierre : Conseiller ferme 2

### **2 Invitations**
- En attente d'acceptation

## 🔧 Vérification

Après exécution, vérifier avec :

```sql
-- Vérifier les utilisateurs
SELECT email, created_at FROM auth.users 
WHERE email LIKE '%thomas%' OR email LIKE '%marie%' OR email LIKE '%pierre%';

-- Vérifier les données
SELECT 'Farms' as type, COUNT(*) as count FROM public.farms
UNION ALL
SELECT 'Plots', COUNT(*) FROM public.plots
UNION ALL
SELECT 'Tasks', COUNT(*) FROM public.tasks;

-- Tester RLS (en tant qu'utilisateur connecté)
SELECT f.name, fm.role 
FROM public.farms f
LEFT JOIN public.farm_members fm ON f.id = fm.farm_id AND fm.user_id = auth.uid();
```

## 🚀 Prêt pour les Services TypeScript

Une fois cette base de données configurée, tu peux :

1. **Tester l'authentification** avec les comptes de test
2. **Développer les services** TypeScript
3. **Tester le multi-tenant** avec différents utilisateurs
4. **Valider les permissions** selon les rôles

## 🧹 Nettoyage (si nécessaire)

```sql
-- Supprimer les données de test
DELETE FROM public.tasks WHERE farm_id IN (1,2,3);
DELETE FROM public.materials WHERE farm_id IN (1,2,3);
DELETE FROM public.plots WHERE farm_id IN (1,2,3);
DELETE FROM public.farm_members WHERE farm_id IN (1,2,3);
DELETE FROM public.farm_invitations WHERE farm_id IN (1,2,3);
DELETE FROM public.farms WHERE id IN (1,2,3);
DELETE FROM public.profiles WHERE email LIKE '%test%' OR email LIKE '%martin%' OR email LIKE '%durand%';
DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%martin%' OR email LIKE '%durand%';
```

Cette approche est **la plus propre et la plus réaliste** pour le développement ! 🎉
