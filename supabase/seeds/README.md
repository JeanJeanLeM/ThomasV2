# Seeds de Test - Thomas V2

## ⚠️ IMPORTANT - Limitation RLS

Les seeds créent des données de test avec des UUIDs générés, mais **ces UUIDs ne correspondent pas à de vrais utilisateurs dans `auth.users`**.

### 🔒 Problème RLS (Row Level Security)

Les policies RLS utilisent `auth.uid()` qui retourne `NULL` si l'utilisateur n'est pas authentifié via Supabase Auth. Cela signifie que :

- ✅ **Les données sont créées** (tables, relations)
- ❌ **Les données ne sont pas visibles** via les policies RLS
- ❌ **Les requêtes depuis l'app retournent vide**

### 🛠️ Solutions

#### Option A : Désactiver temporairement RLS pour les tests
```sql
-- Désactiver RLS temporairement
ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Réactiver après les tests
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
-- etc...
```

#### Option B : Créer de vrais utilisateurs
1. **S'inscrire via l'app** avec les emails de test :
   - `thomas.test@gmail.com`
   - `marie.martin@ferme.fr`
   - `pierre.durand@conseil.fr`

2. **Récupérer les vrais UUIDs** :
```sql
SELECT id, email FROM auth.users 
WHERE email IN (
  'thomas.test@gmail.com',
  'marie.martin@ferme.fr', 
  'pierre.durand@conseil.fr'
);
```

3. **Mettre à jour les seeds** avec les vrais UUIDs

#### Option C : Utiliser des policies de test
```sql
-- Policy temporaire pour voir toutes les fermes (DANGEREUX en prod)
CREATE POLICY "Allow all for testing" ON public.farms
  FOR ALL USING (true);
```

### 📋 Instructions d'utilisation

#### 1. Exécuter la migration
```sql
-- Dans Supabase Dashboard > SQL Editor
-- Exécuter : supabase/migrations/001_farms_multi_tenant.sql
```

#### 2. Exécuter les seeds
```sql
-- Dans Supabase Dashboard > SQL Editor  
-- Exécuter : supabase/seeds/001_test_data.sql
```

#### 3. Vérifier les données
```sql
-- Vérifier que les données sont créées
SELECT COUNT(*) FROM public.farms;
SELECT COUNT(*) FROM public.plots;
SELECT COUNT(*) FROM public.tasks;
```

#### 4. Tester l'accès RLS
```sql
-- Se connecter comme un utilisateur et tester
-- Si vide = problème RLS avec UUIDs fictifs
SELECT * FROM public.farms;
```

## 📊 Données créées

### Utilisateurs fictifs (UUIDs générés)
- **Thomas Test** - `thomas.test@gmail.com` (Propriétaire)
- **Marie Martin** - `marie.martin@ferme.fr` (Manager)  
- **Pierre Durand** - `pierre.durand@conseil.fr` (Conseiller)

### Fermes (3)
- **Ferme Bio des Collines** - Maraîchage bio (5.2 ha)
- **GAEC du Soleil Levant** - Exploitation mixte (12.8 ha)  
- **Les Jardins de Thomas** - Permaculture (2.1 ha)

### Parcelles (12)
- Serres plastique/verre
- Tunnels bâchés  
- Plein champ
- Pépinière, verger, compost

### Matériel (11)
- Tracteurs (Kubota L3301, M7040)
- Outils tracteur (rotavator, charrue, planteuse)
- Outils manuels (bêche, serfouette, grelinette)
- Matériel marketing (cagettes)

### Tâches (5)
- Production (semis, récolte, préparation sol)
- Observations (contrôle ravageurs)
- Différents statuts et priorités

### Membres & Invitations (4)
- Membres avec rôles et permissions
- Invitations en attente

## 🔧 Recommandation

Pour le développement, je recommande l'**Option B** :
1. Créer les vrais comptes utilisateurs via l'app
2. Utiliser leurs UUIDs réels dans les seeds
3. Garder RLS activé pour tester la sécurité

Cela garantit que le système fonctionne exactement comme en production.