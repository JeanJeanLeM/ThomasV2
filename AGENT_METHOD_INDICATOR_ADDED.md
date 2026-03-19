# ✅ Indicateur Méthode Agent Ajouté au Header

## Fonctionnalité Ajoutée

Un badge dans le header du Chat indique maintenant quelle méthode d'analyse est active:
- **🚀 Simple** - Méthode rapide (1 appel LLM, ~8-10s)
- **⚡ Pipeline** - Méthode avancée (3 appels LLM, ~18-25s)

## Fichiers Modifiés

### 1. `UnifiedHeader.tsx`
**Fichier**: `src/design-system/components/UnifiedHeader.tsx`

- ✅ Ajouté prop `agentMethod?: 'simple' | 'pipeline' | null`
- ✅ Affiche un badge sous le titre quand `agentMethod` est fourni
- ✅ Couleurs adaptées:
  - Simple: gris
  - Pipeline: vert (primary)

### 2. `NewSimpleNavigator.tsx`
**Fichier**: `src/navigation/NewSimpleNavigator.tsx`

- ✅ Importé `useFarm` et `supabase`
- ✅ Ajouté state `agentMethod`
- ✅ Charge la méthode depuis `farm_agent_config` quand on est sur Chat
- ✅ Passe `agentMethod` au `UnifiedHeader` uniquement pour l'écran Chat

## Comportement

### Chargement Automatique

L'indicateur se charge automatiquement depuis la DB:
```typescript
useEffect(() => {
  if (activeTab === 'Chat' && farm_id) {
    // Lit farm_agent_config
    // Met à jour agentMethod
  }
}, [activeTab, farm_id]);
```

### Affichage Conditionnel

L'indicateur n'apparaît **que** dans l'écran Chat:
```typescript
<UnifiedHeader
  ...
  agentMethod={activeTab === 'Chat' ? agentMethod : null}
/>
```

### Synchronisation

Quand l'utilisateur change de méthode dans `FarmSettingsScreen`:
1. La méthode est mise à jour en DB
2. Quand il retourne au Chat, `useEffect` détecte le changement
3. Le badge se met à jour automatiquement

## Styles

### Badge Simple
```
┌─────────────┐
│  🚀 Simple  │  ← Fond gris, bordure grise
└─────────────┘
```

### Badge Pipeline
```
┌──────────────┐
│ ⚡ Pipeline  │  ← Fond vert, bordure verte
└──────────────┘
```

## Position

Le badge apparaît **juste sous le titre** du header:

```
┌───────────────────────────────────┐
│  ←     Assistant IA           🏠  │
│         ⚡ Pipeline               │  ← Badge ici
└───────────────────────────────────┘
```

## Bénéfices

1. **Visibilité**: L'utilisateur sait toujours quelle méthode est active
2. **Feedback**: Confirmation visuelle après changement de méthode
3. **Transparence**: Pas de confusion entre Simple et Pipeline
4. **Rapide**: Chargé en temps réel depuis la DB

## Test

1. Ouvrez l'app
2. Allez dans **Assistant IA** (Chat)
3. Regardez le header → vous devriez voir **🚀 Simple** ou **⚡ Pipeline**
4. Allez dans **Profil → Assistant IA**
5. Changez de méthode
6. Retournez au Chat
7. Le badge devrait être mis à jour! ✅

## Logs

Dans la console navigateur:
```
🔀 [HEADER] Agent method chargée: pipeline
```

## Prochaines Améliorations Possibles

- Ajouter un indicateur de temps moyen (Simple: ~8s, Pipeline: ~20s)
- Rendre le badge cliquable pour ouvrir directement les paramètres
- Ajouter une animation de transition lors du changement de méthode

---

**Date**: 2026-02-03
**Status**: ✅ Implémenté et prêt à tester
