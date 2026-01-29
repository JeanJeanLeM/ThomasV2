# 📋 Stratégie de Gestion des Prompts Thomas Agent

## 🚨 Problème Identifié
- **Risque de régression** : Les mises à jour de prompts peuvent supprimer des corrections précédentes
- **Manque de visibilité** : Pas d'accès direct au contenu des prompts en DB
- **Conflits de versions** : Plusieurs prompts actifs simultanément

## ✅ Solutions Mises en Place

### 1. **Export et Sauvegarde**
```sql
-- Utiliser export_all_prompts.sql pour sauvegarder avant modifications
SELECT name, version, is_active, content FROM chat_prompts 
WHERE name = 'thomas_agent_system' ORDER BY version DESC;
```

### 2. **Stratégie de Versioning**
- **v2.1** : Fix discrimination observation/tâche + contexte temporel
- **v2.2** : + Fix extraction problèmes spécifiques (champ "issue")
- **v7.0** : Version inconnue (à analyser)

### 3. **Checklist Avant Mise à Jour**
Avant chaque nouveau prompt, vérifier que les corrections suivantes sont présentes :

#### ✅ **Contexte Temporel** (Fix v2.1)
```
IMPORTANT: Utilise TOUJOURS la date actuelle comme référence pour interpréter les expressions temporelles:
- "hier" = [date calculée]
- "aujourd'hui" = [date actuelle]  
- "demain" = [date calculée]
```

#### ✅ **Extraction Problèmes** (Fix v2.2)
```
### 3. **Extraction de Problèmes pour Observations**
**RÈGLE ABSOLUE**: Pour chaque observation, identifie et extrais le problème spécifique :
- "j'ai observé des **pucerons**" → "issue": "pucerons"
```

#### ✅ **Format JSON Obligatoire**
```json
{
  "action_type": "observation",
  "extracted_data": {
    "issue": "problème_spécifique_observé"
  }
}
```

### 4. **Procédure de Mise à Jour Sécurisée**

1. **Export du prompt actuel**
   ```sql
   -- Sauvegarder le contenu actuel
   SELECT content FROM chat_prompts WHERE name = 'thomas_agent_system' AND is_active = true;
   ```

2. **Analyse des corrections existantes**
   - Vérifier présence du contexte temporel
   - Vérifier instructions extraction "issue"
   - Vérifier autres corrections spécifiques

3. **Intégration dans le nouveau prompt**
   - Copier toutes les corrections existantes
   - Ajouter les nouvelles corrections
   - Incrémenter la version

4. **Test et validation**
   - Désactiver l'ancien prompt
   - Activer le nouveau
   - Tester les cas d'usage critiques

### 5. **Cas d'Usage Critiques à Tester**

#### Test Contexte Temporel
- "J'ai fait cela hier" → date = hier calculée
- "Je vais faire demain" → date = demain calculée

#### Test Extraction Problèmes
- "J'ai observé des pucerons" → "issue": "pucerons"
- "Dégâts de mineuse" → "issue": "dégâts de mineuse"

#### Test Discrimination Observation/Tâche
- "J'ai observé des pucerons" → observation
- "J'ai inspecté les serres" → tâche

## 🔧 Actions Immédiates

### 1. Analyser la Version 7.0
```sql
-- Récupérer le contenu de la version 7.0 pour voir ce qu'elle contient
SELECT content FROM chat_prompts 
WHERE name = 'thomas_agent_system' AND version = '7.0';
```

### 2. Créer un Prompt Consolidé
- Prendre le meilleur des versions 2.2 et 7.0
- S'assurer que TOUTES les corrections sont présentes
- Version 2.3 avec tout intégré

### 3. Documentation des Corrections
Maintenir une liste des corrections critiques :
- ✅ Contexte temporel (dates relatives)
- ✅ Extraction problèmes spécifiques
- ✅ Discrimination observation/tâche
- ⚠️ Autres corrections à identifier dans v7.0

## 📝 Template de Prompt Consolidé

Chaque nouveau prompt doit contenir au minimum :

```
## 2. **Gestion Temporelle CRITIQUE**
[Instructions contexte temporel]

## 3. **Extraction de Problèmes pour Observations**  
[Instructions extraction "issue"]

## 📊 Format JSON OBLIGATOIRE pour Observations
[Format avec champ "issue" obligatoire]
```

## 🎯 Objectif
Éviter toute régression et s'assurer que chaque nouvelle version de prompt conserve TOUTES les corrections précédentes.
