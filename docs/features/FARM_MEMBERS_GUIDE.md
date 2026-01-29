# Guide de Gestion des Membres de Ferme

## Vue d'ensemble

L'écran de gestion des membres permet aux propriétaires et gestionnaires de fermes de :
- Visualiser tous les membres actifs de la ferme
- Inviter de nouveaux membres par email
- Gérer les rôles et permissions
- Suivre les invitations en attente
- Supprimer des membres si nécessaire

## Architecture

### Composants principaux

1. **FarmMembersScreen** - Écran principal de gestion
2. **MemberCard** - Carte d'affichage d'un membre avec actions
3. **InvitationCard** - Carte d'affichage d'une invitation en attente
4. **InviteMemberModal** - Modal pour inviter un nouveau membre
5. **FarmMemberService** - Service de gestion des données

### Types de données

```typescript
// Rôles disponibles
type UserRole = 'owner' | 'manager' | 'employee' | 'advisor' | 'viewer';

// Statuts d'invitation
type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

// Permissions par rôle
interface MemberPermissions {
  can_edit_farm: boolean;
  can_export_data: boolean;
  can_manage_tasks: boolean;
  can_invite_members: boolean;
  can_view_analytics: boolean;
}
```

## Système de Rôles et Permissions

### Hiérarchie des rôles

1. **Owner (Propriétaire)**
   - Toutes les permissions
   - Peut nommer des gestionnaires
   - Ne peut pas être supprimé
   - Rôle automatiquement attribué au créateur de la ferme

2. **Manager (Gestionnaire)**
   - Peut gérer la ferme et les tâches
   - Peut inviter des employés, conseillers et observateurs
   - Peut exporter les données et voir les analytics
   - Ne peut pas nommer d'autres gestionnaires (seul le propriétaire le peut)

3. **Employee (Employé)**
   - Peut créer et gérer les tâches
   - Peut ajouter des observations
   - Accès en lecture/écriture aux données de base

4. **Advisor (Conseiller)**
   - Accès en lecture à toutes les données
   - Peut exporter les données et voir les analytics
   - Peut ajouter des observations et conseils
   - Idéal pour les consultants externes

5. **Viewer (Observateur)**
   - Accès en lecture seule
   - Peut consulter les tâches et observations
   - Aucune permission de modification

### Matrice des permissions

| Permission | Owner | Manager | Employee | Advisor | Viewer |
|------------|-------|---------|----------|---------|--------|
| Modifier ferme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Exporter données | ✅ | ✅ | ❌ | ✅ | ❌ |
| Gérer tâches | ✅ | ✅ | ✅ | ❌ | ❌ |
| Inviter membres | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir analytics | ✅ | ✅ | ❌ | ✅ | ❌ |

## Utilisation

### Navigation vers l'écran

```typescript
// Depuis l'écran des fermes
navigation.navigate('FarmMembers', {
  farmId: farm.id,
  farmName: farm.name
});
```

### Intégration dans la navigation

```typescript
// Stack Navigator
const Stack = createStackNavigator<FarmStackParamList>();

<Stack.Screen 
  name="FarmMembers" 
  component={FarmMembersScreen}
  options={{ title: 'Gestion des membres' }}
/>
```

### Utilisation du service

```typescript
import { FarmMemberService } from '../services/FarmMemberService';
import { useFarm } from '../contexts/FarmContext';

function FarmMembersComponent() {
  const { activeFarm } = useFarm();

  // Récupérer les membres
  const members = await FarmMemberService.getFarmMembers(activeFarm.farm_id);

  // Inviter un membre
  await FarmMemberService.inviteMember(activeFarm.farm_id, {
    email: 'nouveau@membre.com',
    role: 'employee',
    message: 'Bienvenue dans notre équipe !'
  });

  // Modifier un rôle
  await FarmMemberService.updateMemberRole(activeFarm.farm_id, memberId, 'manager');

  // Supprimer un membre
  await FarmMemberService.removeMember(activeFarm.farm_id, memberId);
}
```

## Fonctionnalités

### 1. Visualisation des membres

- Liste des membres actifs avec leurs informations
- Affichage du rôle et des permissions
- Date d'adhésion et statut
- Avatar et informations de contact

### 2. Système d'invitation

- Invitation par email avec message personnalisé
- Génération automatique de token sécurisé
- Expiration automatique après 7 jours
- Possibilité de renvoyer ou annuler une invitation

### 3. Gestion des rôles

- Modification des rôles selon les permissions
- Respect de la hiérarchie (manager ne peut pas nommer de manager)
- Mise à jour automatique des permissions

### 4. Sécurité

- Vérification des permissions avant chaque action
- Protection contre la suppression du propriétaire
- Validation des emails et des rôles
- Tokens d'invitation sécurisés

## Interface utilisateur

### Écran principal

- **En-tête** : Titre avec nom de la ferme et bouton d'invitation
- **Statistiques** : Nombre de membres actifs et invitations en cours
- **Section invitations** : Cartes des invitations en attente
- **Section membres** : Cartes des membres actifs
- **Actions** : Pull-to-refresh pour actualiser les données

### Carte membre

- **Informations** : Avatar, nom, email, rôle
- **Permissions** : Résumé des permissions actives
- **Actions** : Modifier le rôle, supprimer (selon permissions)
- **Métadonnées** : Date d'adhésion, statut

### Carte invitation

- **Informations** : Email, rôle demandé, date d'envoi
- **Statut** : Temps restant avant expiration
- **Actions** : Renvoyer, annuler
- **Message** : Affichage du message personnalisé

### Modal d'invitation

- **Formulaire** : Email, rôle, message optionnel
- **Validation** : Vérification email et permissions
- **Aperçu** : Permissions du rôle sélectionné
- **Actions** : Annuler, envoyer l'invitation

## Gestion des erreurs

### Erreurs communes

1. **Email déjà membre** : Vérification avant envoi d'invitation
2. **Invitation existante** : Détection des invitations en cours
3. **Permissions insuffisantes** : Validation des droits utilisateur
4. **Suppression du propriétaire** : Protection contre cette action
5. **Expiration d'invitation** : Gestion automatique du statut

### Messages d'erreur

- Messages en français contextuels
- Suggestions d'actions correctives
- Gestion gracieuse des erreurs réseau

## Configuration requise

### Base de données

Tables nécessaires :
- `farm_members` : Membres actifs de la ferme
- `farm_invitations` : Invitations en attente
- `profiles` : Profils utilisateurs (pour les jointures)

### Permissions Supabase

RLS (Row Level Security) configuré pour :
- Accès aux membres selon l'appartenance à la ferme
- Gestion des invitations selon les permissions
- Protection des données sensibles

### Services externes

- **Email** : Service d'envoi d'emails pour les invitations
- **Authentification** : Système d'auth pour identifier l'utilisateur actuel

## Exemples d'intégration

### Dans l'écran des fermes

```typescript
// Ajout d'un bouton "Gérer les membres" sur chaque carte de ferme
<TouchableOpacity
  onPress={() => navigation.navigate('FarmMembers', {
    farmId: farm.id,
    farmName: farm.name
  })}
>
  <Text>Gérer les membres ({farm.membersCount})</Text>
</TouchableOpacity>
```

### Dans les paramètres

```typescript
// Section de gestion de la ferme dans les paramètres
<SettingsSection title="Gestion de la ferme">
  <SettingsItem
    title="Membres et permissions"
    onPress={() => navigation.navigate('FarmMembers', {
      farmId: currentFarm.id,
      farmName: currentFarm.name
    })}
  />
</SettingsSection>
```

## Tests recommandés

### Tests unitaires

- Service de gestion des membres
- Validation des permissions
- Logique de gestion des rôles

### Tests d'intégration

- Flow complet d'invitation
- Modification des rôles
- Suppression de membres

### Tests E2E

- Navigation vers l'écran
- Invitation d'un nouveau membre
- Gestion des permissions selon le rôle

## Roadmap

### Fonctionnalités futures

1. **Notifications push** : Alertes pour les nouvelles invitations
2. **Historique des actions** : Log des modifications de membres
3. **Permissions granulaires** : Personnalisation fine des permissions
4. **Groupes de membres** : Organisation en équipes
5. **Intégration calendrier** : Partage des disponibilités

### Améliorations UX

1. **Recherche et filtres** : Trouver rapidement un membre
2. **Actions en lot** : Modifier plusieurs membres à la fois
3. **Templates d'invitation** : Messages prédéfinis
4. **Aperçu avant envoi** : Prévisualisation de l'email d'invitation
