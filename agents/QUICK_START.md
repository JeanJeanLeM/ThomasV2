# ⚡ QUICK START - Agents Thomas V2

## 🎯 **3 ÉTAPES POUR DÉMARRER**

### **1️⃣ Première Commande (Maintenant)**
Copiez-collez ceci dans Cursor Chat :

```
@agents/01_POLISHING_MASTER.md

Bonjour ! C'est ma première utilisation des agents Thomas V2.

Donne-moi :
1. Un résumé de l'état actuel du projet
2. Les 5 bugs P0 les plus critiques à fixer en priorité
3. Le plan d'action pour la semaine 1 (UI/UX Pass)
4. La première tâche concrète à effectuer aujourd'hui
```

---

### **2️⃣ Tester l'Agent IA (Feature Phare)**
```
@agents/03_CHAT_AI_SPECIALIST.md

Teste Thomas Agent v2.0 avec ces messages français :

1. "Salut Thomas, j'ai observé des pucerons sur mes tomates dans la serre 1"
2. "J'ai récolté 3 caisses de courgettes hier dans le tunnel nord"
3. "Je prévois de faire un traitement anti-pucerons demain matin à 8h"
4. "Comment je peux créer une nouvelle parcelle ?"

Pour chaque message, documente :
- Intent détecté
- Tool(s) sélectionné(s)
- Action(s) créée(s)
- Précision matching
- Temps de réponse

Donne un rapport final avec taux de succès global.
```

---

### **3️⃣ Audit UI Complet (5 Écrans Critiques)**
```
@agents/02_UI_UX_SPECIALIST.md

Effectue un audit UI/UX des 5 écrans les plus critiques :
1. ChatScreen (feature phare)
2. DashboardScreen (écran principal)
3. TasksScreen (feature core)
4. AuthScreens (première impression)
5. DocumentsScreen (upload photos)

Pour chaque écran, identifie :
- Problèmes P0/P1 (bloquants/critiques)
- Problèmes responsive (Web vs Mobile)
- Problèmes accessibilité
- Améliorations UX prioritaires

Génère une checklist priorisée de fixes.
```

---

## 📋 **COMMANDES PAR CAS D'USAGE**

### **J'ai trouvé un bug**
```
@agents/06_TESTING_QA.md

Bug trouvé dans [ÉCRAN/FEATURE] :

Reproduction :
1. [Étape 1]
2. [Étape 2]
3. [Comportement observé]

Comportement attendu : [Décrire]

Crée un bug report complet avec :
- Sévérité (P0/P1/P2/P3)
- Template documentation
- Hypothèse cause
- Solution proposée
```

---

### **Performance Lente**
```
@agents/05_DATA_FLOW.md

La [FEATURE] est lente (>5s).

Analyse :
1. Les requêtes Supabase dans [FICHIER]
2. Le cache actuel
3. Les optimisations possibles

Propose un plan d'optimisation concret.
```

---

### **Monétisation & Crédits**
```
@agents/04_MONETIZATION.md

Je veux implémenter le système de monétisation :
1. Système d'abonnement par ferme
2. Système de crédits avec tracking
3. Calcul des coûts (OpenAI, Supabase)
4. Intégration Stripe

Donne-moi l'architecture complète et le code.
```

---

### **Coordonner Plusieurs Domaines**
```
@agents/01_POLISHING_MASTER.md

J'ai un problème complexe dans [FEATURE] qui touche :
- UI : [Problème visuel]
- Logic : [Problème métier]
- Data : [Problème DB]

Analyse, priorise et coordonne les agents spécialisés pour résoudre.
```

---

### **Préparer Build Production**
```
@agents/07_PUBLISHER_DEPLOYMENT.md

Je veux préparer le premier build production de Thomas V2.

Donne-moi :
1. Checklist pré-build (Android + iOS)
2. Configuration eas.json optimale
3. Variables d'environnement à définir
4. Commandes build à exécuter
5. Checklist post-build validation

Prépare tout pour publication stores.
```

---

### **Erreur Build Expo**
```
@agents/07_PUBLISHER_DEPLOYMENT.md

Mon build Expo échoue avec cette erreur :
[COPIER L'ERREUR COMPLÈTE]

Platform: Android / iOS
Profile: production

Analyse l'erreur et propose une solution détaillée.
```

---

## 🎯 **WORKFLOW TYPE JOURNÉE POLISHING**

### **Matin (9h-12h) : Discovery & Fix P0**
```bash
1. @agents/01_POLISHING_MASTER.md
   "Génère le plan de la journée avec priorités"

2. @agents/06_TESTING_QA.md
   "Tests rapides des flows critiques"
   
3. Fix bugs P0 trouvés avec agent spécialisé
```

### **Après-midi (14h-17h) : Fix P1 + Tests**
```bash
4. Agent spécialisé selon domaine
   "Fix bugs P1 priorisés le matin"
   
5. @agents/06_TESTING_QA.md
   "Validation fixes + non-régression"
   
6. @agents/01_POLISHING_MASTER.md
   "Documentation avancement + rapport journée"
```

---

## 📊 **MÉTRIQUES À SUIVRE**

### **Quotidien**
```
✅ Bugs P0 fixés : X
✅ Bugs P1 fixés : Y
✅ Tests E2E passés : Z/Total
✅ Temps moyen fix : Xmin
```

### **Hebdomadaire**
```
✅ Objectif semaine atteint : Oui/Non
✅ Bugs nouveaux trouvés : X
✅ Bugs résolus : Y
✅ Performance amélioration : +X%
✅ Code quality : Score/100
```

---

## 🔥 **TOP 5 COMMANDES PLUS UTILISÉES**

### **1. État Projet**
```
@agents/01_POLISHING_MASTER.md
Quel est l'état actuel du projet ? Bugs ouverts, priorités ?
```

### **2. Test Agent IA**
```
@agents/03_CHAT_AI_SPECIALIST.md
Teste le pipeline avec : "[MESSAGE AGRICULTEUR]"
```

### **3. Audit Écran**
```
@agents/02_UI_UX_SPECIALIST.md
Audit complet de [ÉCRAN] avec problèmes P0/P1
```

### **4. Monétisation**
```
@agents/04_MONETIZATION.md
Implémente le système de crédits et d'abonnements
```

### **5. Bug Report**
```
@agents/06_TESTING_QA.md
Documente le bug : [DESCRIPTION]
```

### **6. Build Production**
```
@agents/07_PUBLISHER_DEPLOYMENT.md
Prépare le build production et la publication stores
```

---

## 💡 **TIPS PRO**

### **Combiner Agents avec Documentation**
```
@agents/03_CHAT_AI_SPECIALIST.md
@docs/THOMAS_AGENT_V2_COMPLETE.md

Analyse pourquoi le matching parcelles est imprécis (<70%)
en utilisant l'architecture complète comme référence.
```

### **Utiliser les Templates Fournis**
Chaque agent contient des templates prêts à l'emploi :
- Bug report (TESTING_QA)
- Rapport hebdomadaire (POLISHING_MASTER)
- Nouveau service (BUSINESS_LOGIC)
- Test session (TESTING_QA)

### **Mode Composer pour Tâches Longues**
```
Cmd+I (Mac) / Ctrl+I (Windows)
@agents/02_UI_UX_SPECIALIST.md
[Instruction longue avec modifications multiples]
```

---

## 🎊 **VOUS ÊTES PRÊT !**

Commencez par la **Première Commande** en haut de ce document.

Les agents vont vous guider étape par étape ! 🚀

---

**Questions ?** Voir [README.md](./README.md) ou [INDEX.md](./INDEX.md)

