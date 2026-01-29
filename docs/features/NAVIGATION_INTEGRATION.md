# Intégration Navigation - Gestion des Membres

## Vue d'ensemble

Le raccourci "Gérer les membres" dans l'écran de profil est maintenant connecté à l'écran de gestion des membres que nous avons créé.

## Architecture de Navigation

### Structure actuelle

```
SimpleNavigator (Navigation principale)
├── Chat (Écran d'accueil)
├── Dashboard
├── Tâches
├── Profil
│   ├── Paramètres
│   │   ├── Parcelles
│   │   ├── Matériel
│   │   └── Conversions
│   └── Gestion des membres ← NOUVEAU
└── Autres onglets
```

### Flux de navigation

1. **Utilisateur clique sur "Gérer les membres"** dans l'écran Profil
2. **Navigation vers FarmMembersScreen** avec les paramètres de la ferme
3. **Bouton retour** ramène vers l'écran Profil

## Modifications apportées

### 1. SimpleNavigator.tsx

**Ajouts :**
- Import de `FarmMembersScreen`
- Ajout de `'FarmMembers'` au type `ScreenName`
- Nouvelle fonction `handleFarmMembersPress()`
- Gestion du retour depuis l'écran FarmMembers
- Titre d'écran "Gestion des membres"

**Code clé :**
```typescript
// Nouvelle fonction de navigation
const handleFarmMembersPress = () => {
  setCurrentScreen('FarmMembers');
};

// Rendu conditionnel de l'écran
currentScreen === 'FarmMembers' ? (
  <FarmMembersScreen 
    navigation={{ goBack: handleBack }}
    route={{ params: { farmId: 1, farmName: 'Ma ferme du coin' } }}
  />
) : // ...autres écrans
```

### 2. ProfileScreen.tsx

**Ajouts :**
- Nouvelle prop `onFarmMembersPress?: () => void`
- Connexion du raccourci "Gérer les membres" à la fonction de navigation

**Code clé :**
```typescript
interface ProfileScreenProps {
  onSettingsPress?: () => void;
  onFarmMembersPress?: () => void; // ← NOUVEAU
}

// Dans menuItems
{
  icon: <UsersIcon color={colors.semantic.success} size={24} />,
  title: 'Gérer les membres',
  subtitle: 'Inviter et gérer les membres de vos fermes',
  onPress: onFarmMembersPress || (() => console.log('Gérer membres')) // ← CONNECTÉ
}
```

## Paramètres passés à FarmMembersScreen

Actuellement, des paramètres de test sont utilisés :
- `farmId: 1` - ID de la ferme (à remplacer par la vraie ferme sélectionnée)
- `farmName: 'Ma ferme du coin'` - Nom de la ferme (à remplacer par le vrai nom)

### TODO : Intégration avec le contexte de ferme

Pour une intégration complète, il faudra :

1. **Créer un contexte de ferme** pour gérer la ferme actuellement sélectionnée
2. **Récupérer la ferme active** depuis le contexte
3. **Passer les vrais paramètres** à FarmMembersScreen

```typescript
// Exemple d'amélioration future
const { currentFarm } = useFarmContext();

<FarmMembersScreen 
  navigation={{ goBack: handleBack }}
  route={{ 
    params: { 
      farmId: currentFarm?.id || 1, 
      farmName: currentFarm?.name || 'Ma ferme' 
    } 
  }}
/>
```

## Test de la fonctionnalité

### Étapes de test

1. **Lancer l'application**
2. **Naviguer vers l'onglet Profil**
3. **Faire défiler jusqu'au raccourci "Gérer les membres"**
4. **Cliquer sur le raccourci**
5. **Vérifier** que l'écran de gestion des membres s'affiche
6. **Tester le bouton retour** pour revenir au profil

### Comportement attendu

- ✅ Navigation fluide vers l'écran de gestion des membres
- ✅ Titre d'écran "Gestion des membres" dans le header
- ✅ Bouton retour fonctionnel
- ✅ Affichage des membres et invitations (avec données de test)
- ✅ Toutes les fonctionnalités de l'écran disponibles

## Améliorations futures

### 1. Sélecteur de ferme

Permettre à l'utilisateur de choisir quelle ferme gérer si il en a plusieurs :

```typescript
// Modal de sélection de ferme avant d'accéder aux membres
const handleFarmMembersPress = () => {
  if (userFarms.length > 1) {
    setShowFarmSelector(true);
  } else {
    navigateToMembers(userFarms[0]);
  }
};
```

### 2. Notifications en temps réel

Afficher des badges sur le raccourci pour indiquer :
- Nouvelles invitations reçues
- Invitations en attente d'acceptation
- Nouveaux membres rejoints

### 3. Raccourcis rapides

Ajouter des actions rapides depuis le profil :
- "Inviter un membre" (modal directe)
- "Voir mes invitations" (filtrage spécifique)

## Notes techniques

### Gestion des props

Le pattern utilisé permet une navigation flexible :
- Les fonctions de navigation sont passées comme props
- Chaque écran reste indépendant
- Facilite les tests unitaires

### Performance

- Pas de re-render inutile des composants
- Navigation instantanée (pas de chargement réseau)
- Gestion mémoire optimisée avec les hooks React

### Accessibilité

- Navigation au clavier supportée
- Labels appropriés pour les lecteurs d'écran
- Contraste des couleurs respecté
