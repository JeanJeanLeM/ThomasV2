# Fix: Filtres par défaut "Actif"

## Problème identifié
Point 13 du test 261126.md : Les filtres de statut (conversion, matériel, parcelle) avaient "Tous" comme valeur par défaut au lieu de "Actif".

## Solution appliquée
Modification des états initiaux des filtres de statut dans 3 écrans :

### Fichiers modifiés
1. **MaterialsSettingsScreen.tsx** (ligne 59)
   - `useState('all')` → `useState('active')`

2. **PlotsSettingsScreen.tsx** (ligne 138) 
   - `useState('all')` → `useState('active')`

3. **ConversionsSettingsScreen.tsx** (ligne 77)
   - `useState('all')` → `useState('active')`

## Impact
- Les utilisateurs voient maintenant par défaut les éléments actifs
- Améliore l'UX en affichant le contenu le plus pertinent
- Cohérence entre tous les écrans de paramètres

## Test
Vérifier que lors de l'ouverture des écrans Matériel, Parcelles et Conversions, le filtre "Actif" est sélectionné par défaut.
