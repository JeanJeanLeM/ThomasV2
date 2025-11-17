# 🔗 MATRICE DES DÉPENDANCES - THOMAS V2

## 📊 Vue d'Ensemble des Dépendances

### Légende:

- 🔴 **Bloquant**: Étape impossible sans cette dépendance
- 🟠 **Critique**: Forte dépendance, risque de retard
- 🟡 **Important**: Dépendance modérée, adaptation possible
- 🟢 **Optionnel**: Amélioration mais pas bloquant

---

## 🔄 MATRICE COMPLÈTE DES DÉPENDANCES

| Étape | Nom                 | Dépend de | Type | Impact Retard            |
| ----- | ------------------- | --------- | ---- | ------------------------ |
| 1.1   | Config Projet Base  | -         | -    | 🔴 Bloque tout           |
| 1.2   | Config Supabase     | 1.1       | 🔴   | 🔴 Bloque auth/data      |
| 1.3   | Design System       | 1.1       | 🔴   | 🟠 Bloque UI             |
| 2.1   | Auth Service        | 1.2       | 🔴   | 🔴 Bloque utilisateurs   |
| 2.2   | Auth UI             | 2.1, 1.3  | 🔴   | 🔴 Bloque connexion      |
| 3.1   | DB Fermes           | 1.2       | 🔴   | 🔴 Bloque multi-tenant   |
| 3.2   | Services Fermes     | 3.1       | 🔴   | 🟠 Bloque gestion fermes |
| 3.3   | Interface Fermes    | 3.2, 1.3  | 🔴   | 🟡 UX dégradée           |
| 4.1   | DB Parcelles        | 3.1       | 🔴   | 🔴 Bloque agricole       |
| 4.2   | Services Parcelles  | 4.1       | 🔴   | 🔴 Bloque LLM matching   |
| 4.3   | Interface Parcelles | 4.2, 1.3  | 🔴   | 🟠 Config manuelle       |
| 5.1   | IA Service          | 4.2       | 🔴   | 🔴 Bloque Thomas         |
| 5.2   | Analyse Tâches      | 5.1       | 🔴   | 🔴 Cœur fonctionnalité   |
| 5.3   | Chat Thomas         | 5.2, 1.3  | 🔴   | 🔴 Interface principale  |
| 6.1   | Navigation          | 1.3       | 🔴   | 🟠 UX fragmentée         |
| 6.2   | Calendrier          | 6.1, 5.3  | 🔴   | 🟠 Hub central manque    |
| 6.3   | Profil              | 6.1, 3.3  | 🟠   | 🟡 Config externe        |
| 7.1   | Observations        | 5.1       | 🟡   | 🟢 Fonctionnalité bonus  |
| 7.2   | Planning            | 5.1       | 🟡   | 🟢 Manuel possible       |
| 7.3   | Statistiques        | 6.1       | 🟡   | 🟢 Export basique        |
| 8.1   | Offline             | 5.3       | 🟠   | 🟡 Online uniquement     |
| 8.2   | Deploy              | Toutes    | 🔴   | 🔴 Pas de livraison      |

---

## 🎯 CHEMINS CRITIQUES IDENTIFIÉS

### Chemin Critique Principal (21 jours):

```
1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 3.2 → 4.1 → 4.2 → 5.1 → 5.2 → 5.3 → 6.2 → 8.2
```

**Risque**: Tout retard sur ce chemin retarde la livraison finale

### Chemin Critique Secondaire (19 jours):

```
1.1 → 1.3 → 2.2 → 4.3 → 5.3 → 6.1 → 6.2
```

**Risque**: Retard sur l'interface utilisateur

### Chemin Critique IA (15 jours):

```
4.1 → 4.2 → 5.1 → 5.2 → 5.3
```

**Risque**: Thomas non fonctionnel = échec produit

---

## 👥 RÉPARTITION DES RESSOURCES

### 🧑‍💻 **Développeur Backend/DevOps** (21 jours)

| Semaine | Étapes Assignées        | Charge |
| ------- | ----------------------- | ------ |
| S1      | 1.1, 1.2, 2.1, 3.1      | 100%   |
| S2      | 3.2, 4.1, 4.2, 5.1      | 100%   |
| S3      | 5.2, 7.1, 7.2, 8.1, 8.2 | 100%   |

**Compétences requises**: Node.js, PostgreSQL, Supabase, OpenAI API

### 🎨 **Développeur Frontend/Mobile** (21 jours)

| Semaine | Étapes Assignées        | Charge |
| ------- | ----------------------- | ------ |
| S1      | 1.3, 2.2, 3.3           | 100%   |
| S2      | 4.3, 5.3, 6.1           | 100%   |
| S3      | 6.2, 6.3, 7.3, 8.1, 8.2 | 100%   |

**Compétences requises**: React Native, Expo, TypeScript, NativeWind

### 🤖 **Spécialiste IA** (10 jours ponctuels)

| Période | Étapes Assignées | Charge |
| ------- | ---------------- | ------ |
| J9-J11  | 5.1, 5.2         | 100%   |
| J14-J15 | 7.1, 7.2         | 50%    |
| J16     | 8.1 (fallback)   | 25%    |

**Compétences requises**: Prompt engineering, GPT-4, NLP français

---

## ⚠️ ANALYSE DES RISQUES PAR ÉTAPE

### 🔴 **RISQUES CRITIQUES**

#### Étape 1.2 - Configuration Supabase

**Probabilité**: Moyenne | **Impact**: Critique

- **Risque**: Problèmes OAuth providers
- **Mitigation**: Tester providers dès J1, backup auth email
- **Plan B**: Auth email uniquement temporaire

#### Étape 5.1 - Service IA

**Probabilité**: Moyenne | **Impact**: Critique

- **Risque**: Limite rate OpenAI, coûts dépassés
- **Mitigation**: Budget OpenAI prédéfini, cache agressif
- **Plan B**: Pattern matching local temporaire

#### Étape 5.2 - Analyse Tâches

**Probabilité**: Élevée | **Impact**: Critique

- **Risque**: Prompts français pas assez précis
- **Mitigation**: Tests intensifs avec données réelles
- **Plan B**: Formulaires assistés par IA

### 🟠 **RISQUES IMPORTANTS**

#### Étape 4.2 - Services Parcelles

**Probabilité**: Moyenne | **Impact**: Important

- **Risque**: Complexité matching LLM sous-estimée
- **Mitigation**: Algorithmes fuzzy matching backup
- **Plan B**: Search simple + suggestions manuelles

#### Étape 6.2 - Calendrier

**Probabilité**: Faible | **Impact**: Important

- **Risque**: Performance avec gros volumes données
- **Mitigation**: Pagination + lazy loading
- **Plan B**: Vue simplifiée temporaire

### 🟡 **RISQUES MODÉRÉS**

#### Étape 8.1 - Offline

**Probabilité**: Élevée | **Impact**: Modéré

- **Risque**: Complexité sync offline/online
- **Mitigation**: MVP sync simple first
- **Plan B**: Mode online requis v1

---

## 📋 STRATÉGIES DE PARALLÉLISATION

### **Développement Parallèle Possible**

#### Semaine 1:

- **Parallèle**: 1.3 (Frontend) pendant 1.2 (Backend)
- **Gain**: -0.5 jour sur planning
- **Risque**: Faible, composants indépendants

#### Semaine 2:

- **Parallèle**: 4.3 (Interface) pendant 5.1 (IA Service)
- **Gain**: -0.5 jour sur planning
- **Risque**: Modéré, besoin coordination

#### Semaine 3:

- **Parallèle**: 7.1-7.2 (Features) pendant 6.3 (Interface)
- **Gain**: -1 jour sur planning
- **Risque**: Faible, fonctionnalités bonus

### **Optimisations Timeline**

```
Timeline Optimiste: 19 jours (gain 2 jours)
Timeline Réaliste: 21 jours (planning initial)
Timeline Pessimiste: 25 jours (buffer 4 jours)
```

---

## 🔄 POINTS DE SYNCHRONISATION OBLIGATOIRES

### **Daily Standups** (15min)

- Avancement vs planning
- Blockers identifiés
- Coordination dépendances

### **Weekly Reviews** (1h)

- Validation livrables semaine
- Ajustement planning semaine suivante
- Risk assessment mise à jour

### **Technical Sync Points**

| Jour | Point Sync            | Objectif                          |
| ---- | --------------------- | --------------------------------- |
| J3   | Auth Review           | Validation architecture auth      |
| J7   | Data Model Review     | Validation schéma BDD             |
| J11  | IA Integration Review | Validation Thomas fonctionnel     |
| J15  | UI/UX Review          | Validation expérience utilisateur |
| J17  | Final Review          | Go/No-go déploiement              |

---

## 📈 MÉTRIQUES DE SUIVI

### **Métriques Avancement**

- % Étapes complétées vs planning
- Nombre de blockers actifs
- Vélocité équipe (étapes/jour)

### **Métriques Qualité**

- Coverage tests par module
- Nombre bugs critiques ouverts
- Performance benchmarks

### **Métriques Produit**

- Fonctionnalités core validées
- UX flows testés avec succès
- Critères acceptation MVP atteints

---

## 🎯 PLAN DE CONTINGENCE

### **Si Retard 1-2 jours**:

1. Augmenter parallélisation semaine 3
2. Reporter fonctionnalités bonus (7.1, 7.2)
3. Simplifier interface statistiques (7.3)

### **Si Retard 3-5 jours**:

1. MVP réduit: Pas d'observations automatiques
2. Offline basique (cache uniquement)
3. Interface mobile iOS prioritaire

### **Si Retard >5 jours**:

1. MVP minimal: Auth + Fermes + Parcelles + Chat Thomas basique
2. Pas d'offline
3. Web app temporaire en attendant mobile

**📞 Escalation**: Décision produit requise si retard >3 jours détecté

---

**🎯 SUCCESS METRICS**: 90% étapes livrées dans les délais + 0 blockers critiques non résolus sous 24h
