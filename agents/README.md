# 🤖 AGENTS THOMAS V2 - Guide d'Utilisation

## 📋 **VUE D'ENSEMBLE**

Ce dossier contient **6 agents spécialisés** pour la phase de polishing de Thomas V2 (Janvier 2025).

Chaque agent est un expert dans son domaine avec :
- ✅ Documentation contexte complète
- ✅ Responsabilités claires et limitées
- ✅ Checklists et templates prêts à l'emploi
- ✅ Commandes et outils spécifiques

---

## 🎯 **LES 7 AGENTS**

### **1️⃣ [POLISHING_MASTER](./01_POLISHING_MASTER.md)** 🎯
**Rôle** : Coordinateur principal de la phase polishing

**Utiliser pour** :
- Planifier les tests de janvier
- Prioriser bugs et améliorations (P0/P1/P2/P3)
- Coordonner les autres agents
- Générer rapports hebdomadaires
- Valider la production-readiness

**Commandes exemples** :
```
"Crée la checklist de polishing semaine 1"
"Analyse l'état actuel et identifie les P0"
"Génère le rapport hebdomadaire"
```

---

### **2️⃣ [UI_UX_SPECIALIST](./02_UI_UX_SPECIALIST.md)** 🎨
**Rôle** : Expert design system et expérience utilisateur

**Utiliser pour** :
- Corriger problèmes visuels et layout
- Valider cohérence design system
- Améliorer UX et accessibilité
- Tester responsive Web/Mobile
- Optimiser composants UI

**Commandes exemples** :
```
"Analyse l'écran TasksScreen et identifie problèmes UI"
"Vérifie la cohérence du design system"
"Crée un empty state pour DocumentsScreen"
```

**Scope** : `src/design-system/`, `src/screens/`, `src/navigation/`

---

### **3️⃣ [CHAT_AI_SPECIALIST](./03_CHAT_AI_SPECIALIST.md)** 🤖
**Rôle** : Expert Thomas Agent v2.0 (feature phare IA)

**Utiliser pour** :
- Optimiser pipeline Agent IA
- Améliorer matching parcelles/matériels
- Tester et améliorer les 6 outils agricoles
- Optimiser prompts contextuels
- Debug edge function thomas-agent-v2
- Améliorer performance (<3s P95)

**Commandes exemples** :
```
"Teste le pipeline avec : 'J'ai observé des pucerons serre 1'"
"Optimise le matching parcelles"
"Améliore le prompt intent detection"
```

**Scope** : `src/services/agent/`, `src/screens/ChatScreen.tsx`, `supabase/functions/thomas-agent-v2/`

---

### **4️⃣ [MONETIZATION](./04_MONETIZATION.md)** 💰
**Rôle** : Expert monétisation, abonnements et business model

**Utiliser pour** :
- Implémenter système d'abonnement (Stripe)
- Gérer système de crédits par ferme
- Calculer coûts requêtes (OpenAI, Supabase)
- Tracking usage et consommation
- Créer plans tarifaires et limites
- Gérer paiements et factures

**Commandes exemples** :
```
"Implémente le système de crédits"
"Calcule le coût réel vs prix facturé pour chat message"
"Crée la migration SQL pour les tables monétisation"
"Intègre Stripe pour les abonnements"
```

**Scope** : Abonnements, crédits, billing, pricing, analytics business

---

### **5️⃣ [DATA_FLOW](./05_DATA_FLOW.md)** 🔄
**Rôle** : Expert flux de données et Supabase

**Utiliser pour** :
- Optimiser requêtes Supabase
- Valider RLS policies sécurité
- Tester système offline + sync
- Optimiser cache et performance
- Debug edge functions
- Valider state management (Contexts)

**Commandes exemples** :
```
"Analyse les performances des requêtes dans DashboardScreen"
"Vérifie les RLS policies de la table tasks"
"Debug le problème offline sync"
```

**Scope** : `src/contexts/`, `src/services/supabaseService.ts`, `supabase/migrations/`, `supabase/functions/`

---

### **6️⃣ [TESTING_QA](./06_TESTING_QA.md)** 🧪
**Rôle** : Expert tests et assurance qualité

**Utiliser pour** :
- Créer plans de tests E2E
- Exécuter scénarios tests complets
- Documenter bugs (template fourni)
- Valider performance et accessibilité
- Générer rapports de tests
- Validation finale pré-production

**Commandes exemples** :
```
"Crée un plan de tests pour le chat agent"
"Teste le scénario 'Nouvel Agriculteur Onboarding'"
"Génère le rapport de tests pré-production"
```

**Scope** : Toute l'app (tests cross-functional)

---

### **7️⃣ [PUBLISHER_DEPLOYMENT](./07_PUBLISHER_DEPLOYMENT.md)** 🚀
**Rôle** : Expert build, déploiement et publication stores

**Utiliser pour** :
- Préparer builds Expo (EAS Build)
- Résoudre erreurs build Android/iOS
- Publier sur Google Play Console
- Publier sur Apple App Store Connect
- Gérer versions et releases
- Optimiser taille bundle
- Configuration certificats et signing

**Commandes exemples** :
```
"Prépare le premier build production"
"Debug l'erreur build Gradle"
"Crée la description store optimisée"
"Génère les release notes v1.0.1"
```

**Scope** : `eas.json`, `app.json`, builds, stores

---

## 🚀 **COMMENT UTILISER CES AGENTS**

### **Méthode 1 : Chat Direct avec un Agent**
1. Ouvrir le fichier agent correspondant (ex: `02_UI_UX_SPECIALIST.md`)
2. Lire le contexte et responsabilités
3. Dans votre chat Cursor, référencer l'agent :
   ```
   @agents/02_UI_UX_SPECIALIST.md Analyse l'écran TasksScreen
   ```

### **Méthode 2 : Mode Composer avec Agent**
1. Ouvrir Composer (Cmd+I / Ctrl+I)
2. Attacher fichier agent : `@agents/03_CHAT_AI_SPECIALIST.md`
3. Donner instruction spécifique à cet agent
4. L'agent agit selon son expertise et contexte

### **Méthode 3 : Coordination via POLISHING_MASTER**
1. Parler au POLISHING_MASTER pour tâche complexe
2. Il délègue automatiquement aux agents spécialisés :
   ```
   @agents/01_POLISHING_MASTER.md 
   "J'ai trouvé un bug dans le chat, le matching parcelles est imprécis"
   
   → POLISHING_MASTER délègue à CHAT_AI_SPECIALIST
   ```

---

## 📅 **WORKFLOW POLISHING JANVIER 2025**

### **Semaine 1 (6-12 janvier) : UI/UX Pass** 🎨
**Agent principal** : `UI_UX_SPECIALIST`
**Objectif** : Interface parfaite pour tests utilisateurs

**Actions** :
1. Tester tous les 29 écrans (Web + Mobile)
2. Corriger problèmes visuels P0/P1
3. Valider responsive design
4. Améliorer accessibilité
5. Documenter patterns améliorés

---

### **Semaine 2 (13-19 janvier) : Chat AI Pass** 🤖
**Agent principal** : `CHAT_AI_SPECIALIST`
**Objectif** : Thomas Agent v2.0 performant et fiable

**Actions** :
1. Tester pipeline avec 50+ messages variés
2. Optimiser matching (>90% précision)
3. Améliorer prompts si nécessaire
4. Valider les 6 outils agricoles
5. Performance <3s P95

---

### **Semaine 3 (20-26 janvier) : Business Logic Pass** 💼
**Agent principal** : `BUSINESS_LOGIC`
**Objectif** : Logique métier robuste et validée

**Actions** :
1. Valider soft delete partout
2. Tester règles métier agricoles
3. Vérifier conversions et calculs
4. Valider edge cases
5. Tests unitaires si temps

---

### **Semaine 4 (27 janvier - 2 février) : Data & Performance Pass** 🔄🧪
**Agents principaux** : `DATA_FLOW` + `TESTING_QA`
**Objectif** : Données fiables et performance optimale

**Actions** :
1. Optimiser requêtes Supabase
2. Valider RLS et sécurité
3. Tester système offline complet
4. Benchmarks performance
5. Tests E2E finaux (TESTING_QA)
6. Rapport final production-readiness

---

## 🎯 **TEMPLATES UTILES**

### **Template Rapport Hebdomadaire**
Voir dans `01_POLISHING_MASTER.md` → Section Templates

### **Template Bug Report**
Voir dans `06_TESTING_QA.md` → Section Template Bug Report

### **Template Test Session**
Voir dans `06_TESTING_QA.md` → Section Manual Testing Checklist

---

## 📊 **CRITÈRES DE SUCCÈS GLOBAL**

### **Ready for Production** ✅
```
✅ 0 bugs P0
✅ < 5 bugs P1 documentés et trackés
✅ Build production réussi (Android + iOS)
✅ 100% écrans testés Web + Mobile
✅ Performance : P95 < 3s responses
✅ Agent IA : >85% taux succès
✅ Matching : >90% précision
✅ Accessibilité : WCAG AA
✅ Sécurité : RLS validée
✅ Offline : Sync fonctionne
✅ Tests E2E : Scénarios critiques passent
```

---

## 🔄 **FLUX DE TRAVAIL RECOMMANDÉ**

### **Pour une Feature Complète**
```
1. POLISHING_MASTER
   → Analyse et priorise

2. Agent Spécialisé
   → Fix le problème
   
3. TESTING_QA
   → Valide le fix + non-régression
   
4. POLISHING_MASTER
   → Valide et documente
```

### **Pour un Bug Simple**
```
1. Identifier domaine (UI/Logic/Data/Agent)

2. Agent Spécialisé directement
   → Analyse et fix
   
3. Test rapide validation
```

---

## 💡 **TIPS**

### **✅ Bonnes Pratiques**
- Toujours attacher l'agent pertinent avec `@agents/XX_NAME.md`
- Donner contexte spécifique (fichier, ligne, comportement observé)
- Utiliser les commandes exemples dans chaque agent
- Demander checklists et templates (fournis dans agents)
- Coordonner via POLISHING_MASTER pour tâches multi-domaines

### **❌ À Éviter**
- Ne pas mélanger plusieurs agents en même temps (confusion)
- Ne pas ignorer la priorisation (P0 d'abord !)
- Ne pas skipper TESTING_QA après un fix
- Ne pas modifier l'architecture en phase polishing
- Ne pas ajouter nouvelles features (polish uniquement)

---

## 📞 **QUESTIONS FRÉQUENTES**

### **Q: Quel agent pour mon problème ?**
```
Problème visuel/layout          → UI_UX_SPECIALIST
Agent IA ne répond pas          → CHAT_AI_SPECIALIST
Abonnement/Crédits/Billing      → MONETIZATION
Requête DB lente/RLS            → DATA_FLOW
Bug à tester/documenter         → TESTING_QA
Build/Déploiement/Stores        → PUBLISHER_DEPLOYMENT
Coordination/Priorisation       → POLISHING_MASTER
```

### **Q: Plusieurs agents nécessaires ?**
Passer par **POLISHING_MASTER** qui coordonnera les autres agents.

### **Q: Comment tester un fix ?**
Utiliser **TESTING_QA** avec les scénarios de tests fournis dans son fichier.

### **Q: Où documenter les bugs ?**
Utiliser template bug report dans **TESTING_QA**, puis tracker via **POLISHING_MASTER**.

---

## 🎊 **PRÊT À POLISHER !**

Vous avez maintenant une **équipe de 6 experts spécialisés** pour transformer Thomas V2 en produit production-ready !

**Commencez par** :
```
@agents/01_POLISHING_MASTER.md
"Crée la checklist de polishing pour janvier et identifie les 5 priorités P0"
```

**Bon polishing !** 🚀✨🌾

