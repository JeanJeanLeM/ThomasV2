# Guide du Système de Contenants - Thomas V2

## Vue d'ensemble

Le système de contenants de Thomas V2 permet de standardiser les contenants utilisés pour les conversions d'unités, avec un système de recherche intelligent basé sur des slugs.

## 🗄️ **Base de Données**

### Table `containers`
- **25+ contenants prédéfinis** : Caisses, paniers, sacs, seaux, bidons, brouettes, etc.
- **Catégories** : `recolte` (pour les produits récoltés) ou `intrant` (pour les intrants agricoles)
- **Types** : caisse, panier, sac, seau, bidon, brouette, pulverisateur, epandeur
- **Matériaux** : plastique, bois, métal, carton, jute, osier, papier
- **Capacités** : Poids typique (kg) et volume typique (L)
- **Slugs** : Mots-clés pour la recherche (synonymes, variantes)

### Exemples de Contenants Prédéfinis

#### 📦 **Contenants Récolte**
```sql
-- Caisses
'Caisse plastique standard' (15kg, 20L) - ['caisse', 'bac', 'cagette', 'plastique']
'Caisse bois petite' (5kg, 8L) - ['caisse', 'cagette', 'bois', 'petite', 'fruits']
'Caisse bois grande' (25kg, 35L) - ['caisse', 'cagette', 'bois', 'grande', 'légumes']

-- Paniers
'Panier osier petit' (2kg, 4L) - ['panier', 'osier', 'petit', 'traditionnel']
'Panier osier grand' (8kg, 15L) - ['panier', 'osier', 'grand', 'récolte']

-- Sacs
'Sac jute petit' (10kg) - ['sac', 'jute', 'toile', 'petit', 'naturel']
'Sac filet' (5kg) - ['sac', 'filet', 'maille', 'légumes', 'oignons']
```

#### 🚜 **Contenants Intrants**
```sql
-- Sacs intrants
'Sac engrais 25kg' (25kg) - ['sac', 'engrais', '25kg', 'fertilisant']
'Sac engrais 50kg' (50kg) - ['sac', 'engrais', '50kg', 'fertilisant', 'grand']

-- Bidons
'Bidon plastique 5L' (5L) - ['bidon', 'plastique', '5L', 'liquide', 'produit']
'Bidon plastique 20L' (20L) - ['bidon', 'plastique', '20L', 'liquide', 'jerrycan']

-- Équipements
'Brouette standard' (100kg, 80L) - ['brouette', 'transport', 'standard', 'chantier']
'Pulvérisateur à dos 15L' (15L) - ['pulvérisateur', 'dos', '15L', 'traitement']
```

## 🎨 **Interface Utilisateur**

### `ContainerDropdownSelector`
Dropdown intelligent pour sélectionner des contenants :
- **Filtrage par type** : Caisses 📦, Paniers 🧺, Sacs 🎒, Seaux 🪣, etc.
- **Filtrage par catégorie** : Récolte vs Intrant
- **Recherche avec slugs** : Trouve "cagette" quand on tape "caisse"
- **Affichage riche** : Icônes, capacités, matériaux
- **Ajout personnalisé** intégré

### `ContainerModal`
Modal pour créer/modifier des contenants :
- **Sélection du type** avec icônes
- **Choix du matériau**
- **Capacités typiques** (kg et L)
- **Dimensions** (optionnel)
- **Génération automatique de slugs**

## 🔄 **Nouveau Workflow de Conversion**

### 1. **Catégorie d'abord** 
L'utilisateur choisit d'abord la catégorie (Récolte/Intrant) qui filtre automatiquement les contenants appropriés.

### 2. **Sélection du contenant**
Dropdown filtré par catégorie avec recherche intelligente :
```typescript
// Recherche "cagette" trouve aussi "Caisse plastique standard"
// grâce aux slugs ['caisse', 'bac', 'cagette', 'plastique']
```

### 3. **Sélection de la culture**
Dropdown des cultures avec variétés spécifiques.

### 4. **Génération automatique du nom**
```typescript
// Génère automatiquement : "Caisse plastique standard de Tomate cerise"
const name = `${container.name} de ${culture.name}`;
```

## 🔍 **Système de Slugs Intelligent**

### Génération Automatique
```typescript
// Pour "Caisse plastique standard"
const slugs = [
  'caisse plastique standard',  // nom complet
  'caisse', 'plastique', 'standard',  // mots individuels
  'bac', 'cagette', 'boite',  // synonymes du type
  // + matériau et autres variantes
];
```

### Recherche Intelligente
- **Synonymes** : "cagette" trouve les caisses
- **Variantes** : "jerrycan" trouve les bidons 20L
- **Matériaux** : "bois" trouve toutes les caisses en bois
- **Capacités** : "25kg" trouve les sacs d'engrais 25kg

## 📊 **Exemples d'Usage**

### Conversion Récolte
```typescript
{
  category: 'recolte',
  container: 'Caisse plastique standard',
  culture: 'Tomate cerise',
  name: 'Caisse plastique standard de Tomate cerise',
  factor: 4, // 4kg par caisse
  toUnit: 'kg'
}
```

### Conversion Intrant
```typescript
{
  category: 'intrant', 
  container: 'Sac engrais 25kg',
  culture: 'Engrais NPK', // ou contenant générique
  name: 'Sac engrais 25kg',
  factor: 25,
  toUnit: 'kg'
}
```

## 🤖 **Intégration IA**

L'IA Thomas peut maintenant :

### Reconnaissance Avancée
```
Utilisateur: "J'ai utilisé 3 cagettes de tomates cerises"
Thomas: "3 caisses de tomates cerises = 12kg (basé sur votre conversion de 4kg/caisse)"

Utilisateur: "Combien de bidons de 20L pour traiter 2 hectares ?"
Thomas: "Pour 2 hectares, il vous faut environ 4 bidons de 20L (basé sur 10L/hectare)"
```

### Suggestions Intelligentes
- Propose des contenants similaires
- Suggère des conversions basées sur l'historique
- Optimise les recommandations par type de culture

## 🚀 **Migration et Déploiement**

### Fichier de Migration
```sql
-- Exécuter la migration
\i supabase/Migrations/008_containers_system.sql

-- Vérifier les données
SELECT COUNT(*) FROM containers; -- Devrait retourner 25+
SELECT category, COUNT(*) FROM containers GROUP BY category;
```

### Données Créées
- **25+ contenants prédéfinis**
- **Slugs automatiques** pour la recherche
- **Politiques RLS** pour la sécurité
- **Index optimisés** pour les performances

## 🔧 **API du Service**

### `ContainerService`
```typescript
// Récupérer par catégorie
await containerService.getContainersByCategory('recolte', farmId);

// Recherche avec slugs
await containerService.searchContainers('cagette plastique', farmId);

// Créer personnalisé
await containerService.createContainer({
  name: 'Ma caisse spéciale',
  category: 'recolte',
  type: 'caisse',
  typicalCapacityKg: 15,
  slugs: ['caisse', 'spéciale', 'personnalisée'],
  farmId: 1
});

// Générer slugs automatiquement
const slugs = containerService.generateSlugs('Caisse bois', 'caisse', 'bois');
// Retourne: ['caisse bois', 'caisse', 'bois', 'bac', 'cagette', 'boite']
```

## ✅ **Avantages du Système**

### Pour les Utilisateurs
- **Sélection rapide** avec recherche intelligente
- **Standardisation** des contenants
- **Génération automatique** des noms de conversion
- **Filtrage intelligent** par usage (récolte/intrant)

### Pour l'IA
- **Reconnaissance améliorée** grâce aux slugs
- **Suggestions pertinentes** basées sur le contexte
- **Calculs automatiques** avec les capacités typiques

### Pour les Développeurs
- **Base de données structurée** avec 25+ contenants
- **Recherche optimisée** avec index GIN sur les slugs
- **Extensibilité** pour ajouter de nouveaux types
- **Sécurité** avec RLS par ferme

---

*Le système de contenants transforme la gestion des conversions en une expérience fluide et intelligente, adaptée aux besoins réels des agriculteurs.*



