# 🎯 AUDIT COMPLET DES CARTES - HARMONISATION REQUISE

## 📊 ÉTAT ACTUEL

### ✅ CARTES UTILISÉES EN PRODUCTION
- **`TaskCardStandard`** - TasksScreen.tsx (grandes cartes)
- **`ObservationCardStandard`** - TasksScreen.tsx (grandes cartes)
- **`ChatCardMinimal`** - ChatList.tsx (liste des chats)
- **`ActionCard`** - Chat AI (format de référence ⭐)

### ❌ CARTES OBSOLÈTES (Legacy à supprimer)
- **`TaskCardMinimal`** - Remplacée par TaskCardStandard
- **`TaskCardDetailed`** - Jamais utilisée
- **`ObservationCardMinimal`** - Remplacée par ObservationCardStandard  
- **`ObservationCardDetailed`** - Jamais utilisée
- **`TaskCard`** - Carte de base obsolète
- **`ObservationCard`** - Carte de base obsolète
- **`SkeletonCard`** - Utilisée uniquement dans SkeletonText/SkeletonList

### 🔧 CARTES SPÉCIALISÉES (À garder)
- **`MaterialCardStandard`** - Paramètres matériel
- **`PlotCardStandard`** - Paramètres parcelles
- **`FarmCardDetailed`** - Écran fermes
- **`MemberCard`** - Gestion membres
- **`InvitationCard`** - Invitations
- **`ConversionCardMinimal`** - Conversions

## 🎯 PROBLÈME IDENTIFIÉ

**INCOHÉRENCE** entre les cartes du chat et de TasksScreen :
- **Chat** : Format `ActionCard` avec tags, icônes, informations détaillées
- **TasksScreen** : Format `TaskCardStandard` plus basique, moins d'infos

## 🚀 PLAN D'HARMONISATION

### Phase 1 : Créer les cartes unifiées
1. **`UnifiedTaskCard`** - Basée sur le format ActionCard
2. **`UnifiedObservationCard`** - Même format unifié

### Phase 2 : Remplacer dans TasksScreen
1. Remplacer `TaskCardStandard` → `UnifiedTaskCard`
2. Remplacer `ObservationCardStandard` → `UnifiedObservationCard`

### Phase 3 : Nettoyage
1. Supprimer les 6 cartes obsolètes
2. Mettre à jour `index.ts`
3. Nettoyer les imports

## 📋 FORMAT DE RÉFÉRENCE (ActionCard)

```tsx
// Structure idéale à reproduire :
- En-tête : Icône + Type + Badge confiance
- Titre principal : Action/Titre
- Tags informatifs : Catégorie, Quantité, Parcelles, Matériel
- Date : Format français
- Actions : Boutons (éditer, supprimer)
```

## 🎨 AVANTAGES DE L'HARMONISATION

1. **Cohérence visuelle** entre chat et TasksScreen
2. **Plus d'informations** affichées (tags, catégories)
3. **Meilleure UX** avec format unifié
4. **Code plus maintenable** (moins de variantes)
5. **Design system simplifié**

## 📁 FICHIERS À SUPPRIMER

```
src/design-system/components/cards/
├── TaskCardMinimal.tsx ❌
├── TaskCardDetailed.tsx ❌
├── ObservationCardMinimal.tsx ❌
├── ObservationCardDetailed.tsx ❌
├── TaskCard.tsx ❌
└── ObservationCard.tsx ❌
```

## 🔄 FICHIERS À CRÉER

```
src/design-system/components/cards/
├── UnifiedTaskCard.tsx ✨
└── UnifiedObservationCard.tsx ✨
```

---

**Objectif** : Une seule carte par type, format unifié, cohérence totale chat ↔ TasksScreen
