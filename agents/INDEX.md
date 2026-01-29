# 🗂️ INDEX RAPIDE - AGENTS THOMAS V2

## 🚀 **ACCÈS RAPIDE**

### **📖 Commencer Ici**
- **[README.md](./README.md)** - Guide complet d'utilisation

### **🤖 Les 7 Agents**
| Agent | Emoji | Domaine | Quand l'utiliser |
|-------|-------|---------|------------------|
| [POLISHING_MASTER](./01_POLISHING_MASTER.md) | 🎯 | Coordination | Planification, priorisation, coordination |
| [UI_UX_SPECIALIST](./02_UI_UX_SPECIALIST.md) | 🎨 | Design & UX | Problèmes visuels, layout, responsive |
| [CHAT_AI_SPECIALIST](./03_CHAT_AI_SPECIALIST.md) | 🤖 | Agent IA | Thomas Agent v2.0, matching, prompts |
| [MONETIZATION](./04_MONETIZATION.md) | 💰 | Monétisation | Abonnements, crédits, billing, pricing |
| [DATA_FLOW](./05_DATA_FLOW.md) | 🔄 | Base de Données | Supabase, RLS, cache, offline |
| [TESTING_QA](./06_TESTING_QA.md) | 🧪 | Tests & Qualité | Tests E2E, bugs, validation |
| [PUBLISHER_DEPLOYMENT](./07_PUBLISHER_DEPLOYMENT.md) | 🚀 | Build & Deploy | Expo build, Google Play, App Store |

---

## 🎯 **QUEL AGENT POUR MON PROBLÈME ?**

### **Problèmes Visuels** 🎨
```
Symptômes:
- Layout cassé
- Couleurs incorrectes
- Spacing problématique
- Responsive ne fonctionne pas
- Design incohérent

→ Agent: UI_UX_SPECIALIST
→ Fichier: 02_UI_UX_SPECIALIST.md
```

### **Agent IA Ne Répond Pas** 🤖
```
Symptômes:
- Chat timeout
- Intent mal détecté
- Actions incorrectes
- Matching imprécis
- Performance lente (>5s)

→ Agent: CHAT_AI_SPECIALIST
→ Fichier: 03_CHAT_AI_SPECIALIST.md
```

### **Problèmes Monétisation** 💰
```
Symptômes:
- Abonnement ne fonctionne pas
- Crédits non déduits
- Payment Stripe échoue
- Coûts mal calculés
- Limites plan non respectées

→ Agent: MONETIZATION
→ Fichier: 04_MONETIZATION.md
```

### **Problèmes Base de Données** 🔄
```
Symptômes:
- Requêtes lentes
- RLS bloque accès
- Données autres fermes visibles
- Offline sync échoue
- Cache inefficace

→ Agent: DATA_FLOW
→ Fichier: 05_DATA_FLOW.md
```

### **Besoin Tests/Validation** 🧪
```
Symptômes:
- Nouveau bug trouvé
- Feature à valider
- Performance à mesurer
- Scénario E2E à tester

→ Agent: TESTING_QA
→ Fichier: 06_TESTING_QA.md
```

### **Problèmes Build/Déploiement** 🚀
```
Symptômes:
- Build Expo échoue
- Erreur Gradle/Xcode
- Problème Google Play Console
- Rejection App Store
- Certificat expiré
- Bundle trop gros

→ Agent: PUBLISHER_DEPLOYMENT
→ Fichier: 07_PUBLISHER_DEPLOYMENT.md
```

### **Coordination/Priorisation** 🎯
```
Symptômes:
- Plusieurs domaines impactés
- Besoin prioriser tâches
- Planification nécessaire
- Rapport à générer

→ Agent: POLISHING_MASTER
→ Fichier: 01_POLISHING_MASTER.md
```

---

## 📅 **ROADMAP PAR SEMAINE**

### **Semaine 1 (6-12 janv) : UI/UX** 🎨
**Agent** : [UI_UX_SPECIALIST](./02_UI_UX_SPECIALIST.md)
- Audit 29 écrans
- Fix problèmes visuels P0/P1
- Validation responsive

### **Semaine 2 (13-19 janv) : Chat IA** 🤖
**Agent** : [CHAT_AI_SPECIALIST](./03_CHAT_AI_SPECIALIST.md)
- Tests pipeline 50+ messages
- Optimisation matching >90%
- Performance <3s P95

### **Semaine 3 (20-26 janv) : Business** 💼
**Agent** : [BUSINESS_LOGIC](./04_BUSINESS_LOGIC.md)
- Validation soft delete
- Tests règles métier
- Edge cases

### **Semaine 4 (27 janv - 2 fév) : Data & QA** 🔄🧪
**Agents** : [DATA_FLOW](./05_DATA_FLOW.md) + [TESTING_QA](./06_TESTING_QA.md)
- Optimisation DB
- Tests E2E complets
- Production-ready

---

## 💡 **COMMANDES QUICK START**

### **Analyse Complète Projet**
```
@agents/01_POLISHING_MASTER.md
Analyse l'état de Thomas V2 et identifie les 5 bugs P0
```

### **Audit UI Rapide**
```
@agents/02_UI_UX_SPECIALIST.md
Audit UI de [ÉCRAN] et liste problèmes
```

### **Test Agent IA**
```
@agents/03_CHAT_AI_SPECIALIST.md
Teste le pipeline avec : "[MESSAGE]"
```

### **Vérifier Service**
```
@agents/04_BUSINESS_LOGIC.md
Vérifie la conformité soft delete de [SERVICE]
```

### **Analyse Performance DB**
```
@agents/05_DATA_FLOW.md
Analyse les performances des requêtes dans [ÉCRAN]
```

### **Plan de Tests**
```
@agents/06_TESTING_QA.md
Crée un plan de tests E2E pour [FEATURE]
```

### **6. Préparer Build Production**
```
@agents/07_PUBLISHER_DEPLOYMENT.md
Prépare la config pour le premier build production Android + iOS
```

---

## 📊 **SCOPE PAR AGENT**

### **UI_UX_SPECIALIST** 🎨
```
src/design-system/          ← Design tokens, composants
src/screens/                ← Les 29 écrans
src/navigation/             ← Navigation
src/constants/index.ts      ← Tokens design
```

### **CHAT_AI_SPECIALIST** 🤖
```
src/services/agent/         ← Thomas Agent v2.0 complet
src/screens/ChatScreen.tsx  ← UI Chat
supabase/functions/         ← Edge functions
```

### **MONETIZATION** 💰
```
src/services/
  ├── SubscriptionService.ts    ← Abonnements
  ├── CreditsService.ts         ← Système crédits
  ├── BillingService.ts         ← Paiements Stripe
  └── UsageTrackingService.ts   ← Tracking usage
supabase/migrations/
  └── XXX_monetization_tables.sql
```

### **DATA_FLOW** 🔄
```
src/contexts/               ← State management
src/services/supabaseService.ts
supabase/migrations/        ← Schéma DB
supabase/functions/         ← Edge functions
```

### **TESTING_QA** 🧪
```
Toute l'app                ← Tests cross-functional
src/**/__tests__/          ← Tests unitaires
```

### **PUBLISHER_DEPLOYMENT** 🚀
```
eas.json                   ← Config EAS Build
app.json                   ← Config Expo
package.json               ← Dépendances
android/, ios/             ← Projets natifs (si eject)
assets/                    ← Icons, splash screens
```

---

## 🎯 **PRIORITÉS BUGS**

### **P0 - Bloquant** 🔴
- App crash
- Perte données
- Faille sécurité
- Feature majeure cassée

**Action** : Fix immédiat, bloquer tout le reste

### **P1 - Critique** 🟠
- Feature importante cassée
- UX très dégradée
- Performance inacceptable

**Action** : Fix sous 24-48h

### **P2 - Important** 🟡
- Feature secondaire cassée
- UX dégradée
- Layout cassé

**Action** : Fix avant production si temps

### **P3 - Cosmétique** 🟢
- Problème visuel mineur
- Typo
- Animation manquante

**Action** : Nice to have, peut attendre

---

## ✅ **CHECKLIST PRODUCTION**

```
📱 Fonctionnel
  ✅ 0 bugs P0
  ✅ < 5 bugs P1
  ✅ Tous flows critiques testés

🎨 UI/UX
  ✅ Design cohérent
  ✅ Responsive OK
  ✅ Accessibilité WCAG AA

🤖 Agent IA
  ✅ >85% taux succès
  ✅ >90% matching précision
  ✅ <3s P95 performance

💼 Business
  ✅ Soft delete partout
  ✅ Règles métier validées
  ✅ Conversions correctes

🔄 Data
  ✅ RLS sécurisée
  ✅ Performance optimisée
  ✅ Offline fonctionne

🧪 Tests
  ✅ E2E critiques passent
  ✅ Non-régression validée
  ✅ Performance benchmarkée
```

---

## 📞 **AIDE RAPIDE**

### **Je ne sais pas quel agent utiliser**
→ Commencer par [POLISHING_MASTER](./01_POLISHING_MASTER.md) qui orientera

### **Problème multi-domaines**
→ [POLISHING_MASTER](./01_POLISHING_MASTER.md) coordonnera les agents

### **Premier bug trouvé**
→ [TESTING_QA](./06_TESTING_QA.md) pour documenter avec template

### **Besoin overview complet**
→ Lire [README.md](./README.md) d'abord

---

## 🔗 **LIENS UTILES**

### **Documentation Projet**
- [Thomas Agent v2.0 Complete](../docs/THOMAS_AGENT_V2_COMPLETE.md)
- [Production Checklist](../docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Quick Test Guide](../docs/QUICK_TEST_GUIDE.md)

### **Configuration**
- [package.json](../package.json)
- [tsconfig.json](../tsconfig.json)
- [App.tsx](../App.tsx)

---

**Dernière mise à jour** : 5 janvier 2026  
**Version Agents** : 1.0  
**Status** : ✅ Opérationnel

