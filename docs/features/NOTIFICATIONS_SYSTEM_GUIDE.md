# Guide du Système de Notifications

## Vue d'ensemble

Le système de notifications permet aux utilisateurs de créer des rappels personnalisés avec des horaires et des jours spécifiques. Il inclut également des notifications système par défaut comme le rappel quotidien pour ajouter les tâches réalisées via le chat.

## Architecture

### Base de données

#### Table `notifications`
- **id**: UUID unique de la notification
- **farm_id**: ID de la ferme associée
- **user_id**: ID de l'utilisateur créateur
- **title**: Titre de la notification (2-200 caractères)
- **message**: Message de la notification (1-1000 caractères)
- **reminder_time**: Heure de rappel (format TIME)
- **selected_days**: Tableau des jours de la semaine (0=Dimanche, 1=Lundi, etc.)
- **is_active**: Statut actif/inactif
- **notification_type**: Type ('custom', 'system', 'task_reminder')
- **metadata**: Données additionnelles (JSONB)

#### Table `notification_logs`
- **id**: UUID unique du log
- **notification_id**: Référence vers la notification
- **user_id**: ID de l'utilisateur
- **sent_at**: Timestamp d'envoi
- **status**: Statut ('sent', 'failed', 'read')
- **error_message**: Message d'erreur éventuel
- **metadata**: Données additionnelles (JSONB)

### Services

#### NotificationService
Service principal pour la gestion des notifications :

```typescript
// Récupérer les notifications d'un utilisateur
const notifications = await NotificationService.getUserNotifications(farmId);

// Créer une nouvelle notification
const newNotification = await NotificationService.createNotification({
  title: "Rappel quotidien",
  message: "N'oubliez pas vos tâches !",
  reminder_time: "18:00:00",
  selected_days: [1, 2, 3, 4, 5], // Lundi à Vendredi
  farm_id: currentFarm.id
});

// Modifier une notification
await NotificationService.updateNotification(id, {
  title: "Nouveau titre",
  is_active: false
});

// Supprimer une notification
await NotificationService.deleteNotification(id);

// Obtenir les statistiques
const stats = await NotificationService.getNotificationStats(farmId);
```

### Écrans

#### NotificationsScreen
Écran principal de gestion des notifications :
- Affichage de la liste des notifications
- Statistiques (actives, total, personnalisées)
- Activation/désactivation rapide
- Actions de modification/suppression

#### CreateNotificationScreen
Écran de création/édition de notifications :
- Formulaire avec validation
- Sélection des jours avec presets rapides
- Sélecteur d'heure personnalisé
- Aperçu en temps réel

## Fonctionnalités

### Types de notifications

1. **Custom** (`custom`)
   - Créées par l'utilisateur
   - Entièrement personnalisables
   - Peuvent être supprimées

2. **System** (`system`)
   - Notifications système générales
   - Non supprimables
   - Modifiables partiellement

3. **Task Reminder** (`task_reminder`)
   - Rappels pour les tâches
   - Créées automatiquement
   - Badge spécial dans l'interface

### Sélection des jours

#### Presets rapides
- **Jours de semaine** : Lundi à Vendredi
- **Week-end** : Samedi et Dimanche  
- **Tous les jours** : 7 jours/7

#### Sélection individuelle
Boutons pour chaque jour de la semaine avec état visuel.

### Validation

#### Côté client
- Titre : 2-200 caractères obligatoire
- Message : 1-1000 caractères obligatoire
- Jours : Au moins un jour sélectionné
- Heure : Format valide

#### Côté serveur
- Contraintes de base de données
- Vérification des permissions (RLS)
- Validation des jours (0-6)

## Sécurité

### Row Level Security (RLS)
- Les utilisateurs ne voient que leurs notifications
- Vérification des permissions de ferme
- Isolation des données par utilisateur

### Permissions
- **SELECT** : Notifications des fermes de l'utilisateur
- **INSERT** : Avec vérification de la ferme
- **UPDATE/DELETE** : Seulement ses propres notifications

## Notifications par défaut

### Rappel tâches quotidiennes
Créée automatiquement lors du premier accès au système de notifications :
- **Titre** : "Rappel tâches quotidiennes"
- **Message** : "N'oubliez pas d'ajouter vos tâches réalisées via le chat Thomas !"
- **Heure** : 18:00
- **Jours** : Lundi à Vendredi
- **Type** : `task_reminder`

### Création automatique
La notification par défaut est créée de manière sécurisée :
1. **Lors du premier accès** : Quand l'utilisateur ouvre l'écran notifications
2. **Vérification préalable** : Évite les doublons
3. **Gestion d'erreurs** : N'interrompt pas le flux principal en cas d'échec

### Script utilitaire
Un script est disponible pour créer les notifications par défaut manuellement :
```bash
node scripts/create_default_notifications.js
```

Ce script :
- Traite toutes les fermes actives
- Vérifie l'existence des propriétaires
- Évite les doublons
- Fournit un rapport détaillé

## Utilisation

### Navigation
```typescript
// Depuis SettingsScreen ou autre
onNavigate('Notifications')

// Création d'une nouvelle notification
onNavigate('CreateNotification')

// Édition d'une notification existante
onNavigate('EditNotification', { notification })
```

### Intégration dans l'app
1. Ajouter les écrans au navigateur
2. Importer le service dans les composants
3. Utiliser le contexte FarmContext pour la ferme active

## Composants du Design System

### Nouveaux composants créés
- **TimePicker** : Sélecteur d'heure personnalisé
- **Switch** : Interrupteur stylisé
- **LoadingSpinner** : Indicateur de chargement

### Utilisation
```typescript
import { TimePicker, Switch, LoadingSpinner } from '../design-system/components';

// TimePicker
<TimePicker
  value="18:00:00"
  onChange={(time) => setTime(time)}
/>

// Switch
<Switch
  value={isActive}
  onValueChange={setIsActive}
/>

// LoadingSpinner
<LoadingSpinner size="large" />
```

## Migration

### Fichiers de migration

#### Version sécurisée (recommandée)
`supabase/Migrations/021_create_notifications_system_safe.sql`
- Crée les tables et index
- Configure RLS
- **Ne crée PAS** de notifications par défaut (évite les erreurs de clés étrangères)

#### Version originale
`supabase/Migrations/021_create_notifications_system.sql`
- Inclut la création de notifications par défaut
- Peut échouer si des `owner_id` n'existent pas dans `auth.users`

### Exécution recommandée
```sql
-- 1. Exécuter la migration sécurisée
\i supabase/Migrations/021_create_notifications_system_safe.sql

-- 2. Optionnel: Créer les notifications par défaut avec le script
node scripts/create_default_notifications.js
```

## Développements futurs

### Fonctionnalités potentielles
1. **Push notifications** : Intégration avec Expo Notifications
2. **Notifications récurrentes** : Répétition automatique
3. **Templates** : Modèles prédéfinis
4. **Groupes de notifications** : Organisation par catégories
5. **Historique détaillé** : Suivi des envois
6. **Notifications conditionnelles** : Basées sur des événements

### Améliorations techniques
1. **Service worker** : Pour les notifications web
2. **Queue system** : Gestion des envois en masse
3. **Analytics** : Statistiques d'engagement
4. **A/B testing** : Optimisation des messages

## Dépannage

### Problèmes courants

#### Notifications non créées
- Vérifier les permissions de ferme
- Contrôler la validation des données
- Examiner les logs d'erreur

#### Erreurs de validation
- Respecter les limites de caractères
- Sélectionner au moins un jour
- Format d'heure valide

#### Problèmes d'affichage
- Vérifier l'import des composants
- Contrôler les styles
- Tester sur différentes plateformes

### Debug
```typescript
// Activer les logs détaillés
console.log('🔔 [DEBUG] Notification data:', notificationData);

// Vérifier les permissions
const { data: user } = await supabase.auth.getUser();
console.log('👤 [DEBUG] Current user:', user);

// Tester les requêtes
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('farm_id', farmId);
```

## Conclusion

Le système de notifications offre une base solide pour les rappels personnalisés. Il est extensible, sécurisé et intégré au design system de l'application. Les notifications par défaut assurent une expérience utilisateur cohérente dès l'installation.
