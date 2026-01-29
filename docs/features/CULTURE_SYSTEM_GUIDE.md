# Guide du Système de Cultures - Thomas V2

## Vue d'ensemble

Le système de cultures de Thomas V2 permet de gérer de manière standardisée les cultures et leurs variétés, avec un système de conversion intelligent pour les unités personnalisées.

## Architecture

### 🗄️ **Base de Données**

#### Table `cultures`
- **Cultures globales** : Disponibles pour toutes les fermes
- **Cultures personnalisées** : Spécifiques à une ferme
- **Types** : legume_fruit, legume_feuille, legume_racine, cereale, fleur, fruit, legumineuse, aromate
- **Catégories** : recolte, intrant

#### Table `culture_varieties`
- **Variétés globales** : Disponibles pour toutes les fermes
- **Variétés personnalisées** : Spécifiques à une ferme
- **Données typiques** : Poids et volume moyens pour les conversions

### 🎨 **Composants UI**

#### `CultureDropdownSelector`
Dropdown intelligent pour sélectionner cultures et variétés :
- **Filtrage par type** : Légumes fruits, feuilles, racines, etc.
- **Recherche en temps réel**
- **Affichage des variétés** optionnel
- **Ajout de nouvelles cultures** intégré

#### `CultureModal` & `VarietyModal`
Modals pour créer/modifier :
- **Cultures** avec type, catégorie, couleur
- **Variétés** avec poids/volume typiques

## Utilisation

### 🌱 **Cultures Prédéfinies**

Le système inclut 20+ cultures communes :

**Légumes fruits** : Tomate, Courgette, Aubergine, Poivron, Concombre
**Légumes feuilles** : Salade, Épinard, Chou, Blette
**Légumes racines** : Carotte, Radis, Betterave, Navet
**Céréales** : Blé, Orge, Avoine
**Légumineuses** : Haricot vert, Petit pois, Fève
**Aromates** : Basilic, Persil, Thym
**Fruits** : Pomme, Poire, Fraise
**Fleurs** : Tournesol, Œillet

### 🎯 **Variétés Prédéfinies**

Exemples pour les tomates :
- **Tomate cerise** : 15g, 20mL
- **Tomate grappe** : 80g, 90mL
- **Tomate beefsteak** : 200g, 180mL
- **Tomate Roma** : 60g, 70mL

### 🔄 **Système de Conversion**

#### Nouvelles Catégories
- **Récolte** : Pour les produits récoltés (tomates, carottes, etc.)
- **Intrant** : Pour les intrants agricoles (engrais, compost, etc.)
- **Personnalisé** : Pour les conversions spécifiques

#### Exemple d'utilisation
```typescript
// Sélection d'une culture
const selectedCulture = {
  id: 'variety-1',
  label: 'Tomate - Tomate cerise',
  type: 'variety',
  variety: {
    name: 'Tomate cerise',
    typicalWeightKg: 0.015
  }
};

// Création d'une conversion
const conversion = {
  name: 'Caisse tomate cerise',
  category: 'recolte',
  fromUnit: 'Tomate cerise',
  toUnit: 'kg',
  factor: 4, // 4kg par caisse
};
```

## Intégration avec l'IA

### 🤖 **Reconnaissance Intelligente**

L'IA Thomas peut maintenant :
1. **Identifier les cultures** mentionnées dans les messages
2. **Chercher les conversions** appropriées
3. **Calculer automatiquement** les équivalences

### 💬 **Exemples de Messages**

```
Utilisateur: "J'ai récolté 10 caisses de tomates cerises"
Thomas: "10 caisses de tomates cerises = 40kg (basé sur votre conversion de 4kg/caisse)"

Utilisateur: "Combien de brouettes d'engrais pour 2 hectares ?"
Thomas: "Pour 2 hectares, il vous faut environ 8 brouettes d'engrais (basé sur 50kg/brouette)"
```

## API du Service

### `CultureService`

```typescript
// Récupérer les cultures
await cultureService.getCultures(farmId);
await cultureService.getCulturesByType('legume_fruit', farmId);

// Rechercher
await cultureService.searchCultures('tomate', farmId);

// Créer
await cultureService.createCulture({
  name: 'Ma culture',
  type: 'legume_fruit',
  category: 'recolte',
  isCustom: true,
  farmId: 1
});

// Variétés
await cultureService.getCultureVarieties(cultureId, farmId);
await cultureService.createVariety({
  cultureId: 1,
  name: 'Ma variété',
  typicalWeightKg: 0.1,
  farmId: 1
});
```

## Sécurité (RLS)

### 🔒 **Politiques de Sécurité**

- **Cultures globales** : Visibles par tous
- **Cultures personnalisées** : Visibles uniquement par les membres de la ferme
- **Création** : Seuls les membres actifs peuvent créer des cultures personnalisées
- **Modification** : Seuls les membres de la ferme propriétaire

## Migration

### 📦 **Fichier de Migration**

Le fichier `007_cultures_table.sql` contient :
- Création des tables
- Données de base (cultures communes)
- Index pour les performances
- Politiques RLS
- Triggers pour `updated_at`

### 🚀 **Déploiement**

```sql
-- Exécuter la migration
\i supabase/Migrations/007_cultures_table.sql

-- Vérifier les données
SELECT COUNT(*) FROM cultures; -- Devrait retourner 20+
SELECT COUNT(*) FROM culture_varieties; -- Devrait retourner 10+
```

## Bonnes Pratiques

### ✅ **Recommandations**

1. **Utilisez les cultures globales** quand possible
2. **Créez des variétés spécifiques** pour vos besoins
3. **Documentez les conversions** avec des descriptions claires
4. **Testez les conversions** avec le calculateur intégré
5. **Organisez par catégorie** (récolte vs intrant)

### ⚠️ **À éviter**

1. **Ne dupliquez pas** les cultures existantes
2. **N'utilisez pas** de noms trop génériques
3. **Ne négligez pas** les poids/volumes typiques
4. **N'oubliez pas** de tester les conversions

## Évolutions Futures

### 🔮 **Fonctionnalités Prévues**

- **Import/Export** de cultures entre fermes
- **Suggestions automatiques** de variétés
- **Historique des conversions** utilisées
- **Optimisation IA** des facteurs de conversion
- **Intégration météo** pour ajuster les rendements

---

*Ce guide sera mis à jour au fur et à mesure des évolutions du système.*



