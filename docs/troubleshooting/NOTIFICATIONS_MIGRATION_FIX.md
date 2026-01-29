# Fix pour l'erreur de migration des notifications

## Problème rencontré

```
ERROR: 23503: insert or update on table "notifications" violates foreign key constraint "notifications_user_id_fkey" 
DETAIL: Key (user_id)=(70ae2dc9-7d0e-49ae-9864-092da1851000) is not present in table "users".
```

## Cause

La migration originale `021_create_notifications_system.sql` essaie de créer des notifications par défaut pour tous les propriétaires de fermes, mais certains `owner_id` dans la table `farms` ne correspondent pas à des utilisateurs existants dans `auth.users`.

## Solution

### Option 1: Migration sécurisée (Recommandée)

Utilisez la migration sécurisée qui ne crée pas de notifications par défaut :

```bash
# Exécuter la migration sécurisée
psql -f supabase/Migrations/021_create_notifications_system_safe.sql

# Optionnel: Créer les notifications par défaut avec le script
node scripts/create_default_notifications.js
```

### Option 2: Correction de la migration originale

Si vous voulez utiliser la migration originale, elle a été corrigée pour vérifier l'existence des utilisateurs :

```sql
-- La requête a été modifiée pour inclure cette vérification :
WHERE f.is_active = true 
  AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = f.owner_id
  );
```

## Avantages de la solution

### Migration sécurisée
✅ Aucun risque d'erreur de clé étrangère  
✅ Migration toujours réussie  
✅ Notifications créées à la demande  
✅ Meilleure gestion d'erreurs  

### Création automatique
✅ Notifications créées lors du premier accès  
✅ Vérification des doublons  
✅ Gestion d'erreurs silencieuse  
✅ Ne bloque pas l'interface utilisateur  

## Script utilitaire

Le script `scripts/create_default_notifications.js` permet de :
- Créer les notifications par défaut pour toutes les fermes
- Vérifier l'existence des propriétaires
- Éviter les doublons
- Fournir un rapport détaillé

```bash
# Prérequis: Variables d'environnement
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Exécution
node scripts/create_default_notifications.js
```

## Résultat

Après application de la solution :
- ✅ Tables `notifications` et `notification_logs` créées
- ✅ Index et RLS configurés
- ✅ Notifications par défaut créées de manière sécurisée
- ✅ Interface utilisateur fonctionnelle
- ✅ Pas d'erreurs de migration

## Fichiers modifiés

1. `supabase/Migrations/021_create_notifications_system_safe.sql` - Migration sécurisée
2. `src/services/NotificationService.ts` - Création automatique des notifications
3. `scripts/create_default_notifications.js` - Script utilitaire
4. `docs/NOTIFICATIONS_SYSTEM_GUIDE.md` - Documentation mise à jour













