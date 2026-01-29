# 📂 Guide d'Organisation Documentation - Pour Agents IA

**Destinataires** : Agents IA travaillant sur le projet Thomas V2  
**Objectif** : Maintenir une documentation organisée et accessible  
**Règle d'or** : ⚠️ **JAMAIS de fichiers .md ou .sql à la racine du projet !**

---

## 🎯 **RÈGLE PRINCIPALE**

### ⚠️ **INTERDICTION ABSOLUE**

**NE JAMAIS créer de fichiers .md ou .sql directement à la racine du projet !**

```
❌ INTERDIT :
MobileV2Thomas/
├── MON_NOUVEAU_DOC.md        ← NON !
├── FIX_QUELQUECHOSE.md        ← NON !
├── mon_script.sql             ← NON !
└── RAPPORT_AGENT.md           ← NON !

✅ CORRECT :
MobileV2Thomas/
├── docs/                      ← Tous les .md vont ici
│   ├── [sous-dossier]/
│   │   └── MON_DOC.md         ← OUI !
└── supabase/                  ← Tous les .sql vont ici
    └── mon_script.sql         ← OUI !
```

---

## 📁 **Structure d'Organisation**

### **Racine Projet (MobileV2Thomas/)**

**Uniquement autorisé** :
- `README.md` (seul .md autorisé à la racine)
- Fichiers de configuration (package.json, tsconfig.json, etc.)
- Fichiers de code (App.tsx, etc.)
- Dossiers organisés (docs/, src/, agents/, supabase/, etc.)

---

## 📚 **Organisation docs/**

### **Structure des Dossiers**

```
docs/
├── 📚 Documents racine (7 fichiers essentiels seulement)
│   ├── INDEX.md
│   ├── README.md
│   ├── QUICK_NAVIGATION.md
│   ├── INITIALIZATION_GUIDE.md
│   ├── THOMAS_AGENT_V2_COMPLETE.md
│   └── STRUCTURE_FINALE.md
│
└── 📁 13 Sous-dossiers thématiques :
    ├── testing/           # Tests, QA, validations
    ├── chat/              # Système chat
    ├── agent/             # Agent IA, outils, prompts
    ├── design/            # Design system, UI/UX
    ├── forms/             # Formulaires
    ├── deployment/        # Build, déploiement, stores
    ├── troubleshooting/   # Debug, fixes, résolution
    ├── architecture/      # Architecture, spécifications
    ├── features/          # Features, systèmes core
    ├── documents-feature/ # Feature gestion documents
    ├── supabase-docs/     # Configuration Supabase
    ├── observations/      # Corrections observations
    └── archive/           # Documents historiques
```

---

## 🗂️ **Où Placer Chaque Type de Document ?**

### **1. Tests & QA → `docs/testing/`**

**Placer ici** :
- ✅ Guides de tests (web, mobile, E2E)
- ✅ Checklists de validation
- ✅ Rapports de tests
- ✅ Résultats de compatibilité
- ✅ Tests de régression

**Exemples** :
```
docs/testing/
├── WEB_TEST_GUIDE.md
├── MOBILE_TEST_GUIDE.md
├── APK_TEST_CHECKLIST.md
└── TEST_RESULTS_2026_01_XX.md     ← Nouveau rapport de test
```

---

### **2. Chat & Agent IA → `docs/chat/` ou `docs/agent/`**

**`docs/chat/`** - Système de chat :
- ✅ Architecture chat
- ✅ Intégration UI
- ✅ Déploiement chat
- ✅ Troubleshooting chat

**`docs/agent/`** - Agent IA :
- ✅ Outils agent
- ✅ Prompts et stratégies
- ✅ Roadmap agent
- ✅ Pipeline développement

**Exemples** :
```
docs/chat/
└── CHAT_NEW_FEATURE.md             ← Nouvelle feature chat

docs/agent/
└── NEW_AGENT_TOOL.md               ← Nouvel outil agent
```

---

### **3. Design & UI → `docs/design/`**

**Placer ici** :
- ✅ Design system
- ✅ Composants UI
- ✅ Audits UI/UX
- ✅ Guides de style
- ✅ Patterns UI

**Exemples** :
```
docs/design/
├── DESIGN_SYSTEM_COMPLETE.md
├── NEW_COMPONENT_GUIDE.md          ← Nouveau composant
└── UI_AUDIT_2026_01_XX.md          ← Nouvel audit
```

---

### **4. Formulaires → `docs/forms/`**

**Placer ici** :
- ✅ Migration formulaires
- ✅ Guides formulaires
- ✅ Standards validation
- ✅ Unification styles

**Exemples** :
```
docs/forms/
└── NEW_FORM_COMPONENT.md           ← Nouveau formulaire
```

---

### **5. Déploiement & Build → `docs/deployment/`**

**Placer ici** :
- ✅ Guides build (EAS, Expo)
- ✅ Configuration stores (Play, App Store)
- ✅ Checklists production
- ✅ Edge functions deployment
- ✅ Status déploiements

**Exemples** :
```
docs/deployment/
├── BUILD_STATUS_2026_01_XX.md      ← Status build
└── NEW_DEPLOYMENT_GUIDE.md         ← Nouveau guide
```

---

### **6. Debug & Fixes → `docs/troubleshooting/`**

**Placer ici** :
- ✅ Guides de debug
- ✅ Corrections de bugs (FIX_*.md)
- ✅ Diagnostics
- ✅ Résolution erreurs
- ✅ Troubleshooting guides

**Exemples** :
```
docs/troubleshooting/
├── FIX_NEW_BUG.md                  ← Nouveau fix
├── DEBUG_NETWORK_ISSUE.md          ← Debug réseau
└── DIAGNOSTIC_CRASH_APP.md         ← Diagnostic crash
```

**⚠️ IMPORTANT** : Tous les fichiers `FIX_*.md`, `DEBUG_*.md`, `DIAGNOSTIC_*.md` vont TOUJOURS dans `troubleshooting/` !

---

### **7. Architecture & Spécifications → `docs/architecture/`**

**Placer ici** :
- ✅ Architecture système
- ✅ Spécifications techniques
- ✅ Roadmap projet
- ✅ Diagrammes (Mermaid, etc.)
- ✅ Matrices de dépendances

**Exemples** :
```
docs/architecture/
├── ARCHITECTURE_COMPLETE.md
├── NEW_ARCHITECTURE_DECISION.md    ← Décision architecture
└── SYSTEM_DIAGRAM.md               ← Nouveau diagramme
```

---

### **8. Features & Systèmes → `docs/features/`**

**Placer ici** :
- ✅ Systèmes core (fermes, cultures, etc.)
- ✅ Guides features
- ✅ Système de cache
- ✅ Permissions
- ✅ Notifications
- ✅ Offline mode
- ✅ Filtres

**Exemples** :
```
docs/features/
├── FARM_CONTEXT_USAGE.md
├── NEW_FEATURE_SYSTEM.md           ← Nouveau système
└── CULTURE_UPDATE_GUIDE.md         ← Update culture
```

---

### **9. Feature Documents → `docs/documents-feature/`**

**Placer ici** :
- ✅ Système gestion documents
- ✅ UI documents
- ✅ Filtres documents
- ✅ Migration documents
- ✅ Debug spécifique documents

**Exemples** :
```
docs/documents-feature/
└── DOCUMENTS_NEW_FILTER.md         ← Nouveau filtre
```

---

### **10. Supabase → `docs/supabase-docs/`**

**Placer ici** :
- ✅ Configuration Supabase
- ✅ Setup bucket storage
- ✅ Diagnostics Supabase
- ✅ Policies RLS
- ✅ Edge functions (guides)

**Exemples** :
```
docs/supabase-docs/
└── SUPABASE_NEW_CONFIG.md          ← Nouvelle config
```

**⚠️ Fichiers SQL** : Les fichiers .sql vont dans `supabase/`, PAS dans `docs/` !

---

### **11. Observations → `docs/observations/`**

**Placer ici** :
- ✅ Corrections système observations
- ✅ Fix titres observations
- ✅ Migration observations/tâches

**Exemples** :
```
docs/observations/
└── OBSERVATION_NEW_FIX.md          ← Nouveau fix observations
```

---

### **12. Archive → `docs/archive/`**

**Placer ici** :
- ✅ Documents obsolètes
- ✅ Anciennes versions
- ✅ Rapports historiques
- ✅ Documents remplacés

**⚠️ Important** : Ajouter mention "OBSOLETE" en début de fichier avant d'archiver.

**Exemples** :
```
docs/archive/
└── OLD_IMPLEMENTATION_SUMMARY.md   ← Ancien rapport
```

---

## 🗄️ **Fichiers SQL → `supabase/`**

### **Organisation Supabase**

```
supabase/
├── Migrations/               # Migrations SQL
│   └── 025_ma_migration.sql  ← Nouvelle migration
├── functions/                # Edge functions
├── seeds/                    # Seeds données
└── *.sql                     # Scripts utilitaires
    ├── check_*.sql
    ├── fix_*.sql
    └── export_*.sql
```

**Règles** :
- ✅ Migrations → `supabase/Migrations/`
- ✅ Scripts debug → `supabase/` (racine)
- ✅ Seeds → `supabase/seeds/`
- ❌ **JAMAIS** à la racine du projet

---

## 🎯 **Workflow de Décision : Où Placer Mon Document ?**

### **Arbre de Décision**

```
1. Mon document est-il un fichier SQL ?
   └─ OUI → supabase/
   └─ NON → Continuer

2. Est-ce un document sur les tests ?
   └─ OUI → docs/testing/
   └─ NON → Continuer

3. Est-ce un fix/debug/diagnostic ?
   └─ OUI → docs/troubleshooting/
   └─ NON → Continuer

4. Est-ce sur le chat ou l'agent IA ?
   └─ Chat → docs/chat/
   └─ Agent → docs/agent/
   └─ NON → Continuer

5. Est-ce sur le design/UI/UX ?
   └─ OUI → docs/design/
   └─ NON → Continuer

6. Est-ce sur le déploiement/build ?
   └─ OUI → docs/deployment/
   └─ NON → Continuer

7. Est-ce sur l'architecture ?
   └─ OUI → docs/architecture/
   └─ NON → Continuer

8. Est-ce sur une feature/système ?
   └─ OUI → docs/features/
   └─ NON → Continuer

9. Est-ce sur les formulaires ?
   └─ OUI → docs/forms/
   └─ NON → Continuer

10. Est-ce sur les observations ?
    └─ OUI → docs/observations/
    └─ NON → Continuer

11. Est-ce sur les documents (feature) ?
    └─ OUI → docs/documents-feature/
    └─ NON → Continuer

12. Est-ce sur Supabase (config/setup) ?
    └─ OUI → docs/supabase-docs/
    └─ NON → Continuer

13. Document obsolète ?
    └─ OUI → docs/archive/
    └─ NON → Demander conseil ou docs/archive/
```

---

## 📝 **Conventions de Nommage**

### **Noms de Fichiers**

**Format** : `MAJUSCULES_AVEC_UNDERSCORES.md`

**Préfixes recommandés** :
- `FIX_*` - Corrections de bugs
- `DEBUG_*` - Guides de debug
- `GUIDE_*` - Guides complets
- `TEST_*` - Documents de tests
- `AUDIT_*` - Audits
- `REPORT_*` ou `RAPPORT_*` - Rapports
- `QUICK_*` - Références rapides
- `STATUS_*` - Status/état

**Exemples** :
```
✅ BON :
- FIX_NETWORK_ANDROID.md
- GUIDE_DEPLOYMENT_PRODUCTION.md
- TEST_RESULTS_2026_01_06.md
- AUDIT_UI_MOBILE_FIRST.md

❌ MAUVAIS :
- fix.md                    (trop vague)
- mon-doc.md               (minuscules + tirets)
- NewFeature.md            (camelCase)
- document sans nom.md     (espaces)
```

### **Contenu du Fichier**

**Structure recommandée** :
```markdown
# 🎯 Titre du Document

**Date** : JJ/MM/AAAA  
**Auteur** : Agent [nom]  
**Contexte** : [Brief contexte]  
**Statut** : ✅ Terminé / 🔄 En cours / ⏸️ En attente

---

## 🎯 Objectif

[Description claire de l'objectif]

---

## 📋 Contenu

[Contenu principal]

---

## ✅ Résultat / Checklist

[Résultats ou actions]

---

**Liens utiles** :
- [Lien vers doc connexe 1]
- [Lien vers doc connexe 2]
```

---

## 🔗 **Créer des Liens entre Documents**

### **Syntaxe Markdown**

```markdown
<!-- Lien relatif (même dossier) -->
Voir aussi [AUTRE_DOC.md](./AUTRE_DOC.md)

<!-- Lien vers autre dossier -->
Voir [Guide Tests](../testing/WEB_TEST_GUIDE.md)

<!-- Lien vers racine docs -->
Voir [README principal](../README.md)

<!-- Lien vers dossier -->
Tous les tests : [testing/](../testing/)
```

### **Exemples**

```markdown
<!-- Dans docs/troubleshooting/FIX_NEW_BUG.md -->
Ce fix est lié à :
- Architecture : [ARCHITECTURE_COMPLETE.md](../architecture/ARCHITECTURE_COMPLETE.md)
- Tests : [WEB_TEST_GUIDE.md](../testing/WEB_TEST_GUIDE.md)
- Feature : [FARM_CONTEXT_USAGE.md](../features/FARM_CONTEXT_USAGE.md)
```

---

## 📊 **Après Avoir Créé un Document**

### **Checklist Post-Création**

1. ✅ **Vérifier l'emplacement**
   - Le fichier est dans le bon sous-dossier ?
   - PAS à la racine du projet ?
   - PAS à la racine de docs/ (sauf si document essentiel) ?

2. ✅ **Vérifier le nom**
   - Format MAJUSCULES_UNDERSCORES.md ?
   - Nom descriptif et clair ?
   - Préfixe approprié (FIX_, GUIDE_, etc.) ?

3. ✅ **Mettre à jour le README du dossier** (optionnel)
   ```markdown
   <!-- Dans docs/testing/README.md -->
   - `MON_NOUVEAU_TEST.md` - Description du test
   ```

4. ✅ **Ajouter liens dans documents connexes** (si pertinent)
   - Lier depuis documents relatifs
   - Ajouter dans guide principal si important

5. ✅ **Vérifier la structure du document**
   - Titre clair avec emoji ?
   - Sections organisées ?
   - Liens vers docs connexes ?

---

## 🚨 **Erreurs Courantes à Éviter**

### **❌ NE JAMAIS FAIRE**

1. **Créer un .md à la racine du projet**
   ```
   ❌ MobileV2Thomas/MON_DOC.md
   ✅ MobileV2Thomas/docs/[dossier]/MON_DOC.md
   ```

2. **Créer un .sql à la racine du projet**
   ```
   ❌ MobileV2Thomas/mon_script.sql
   ✅ MobileV2Thomas/supabase/mon_script.sql
   ```

3. **Encombrer la racine de docs/**
   ```
   ❌ docs/MON_DOC.md (sauf si vraiment essentiel)
   ✅ docs/[dossier]/MON_DOC.md
   ```

4. **Utiliser des noms vagues**
   ```
   ❌ fix.md, doc.md, notes.md
   ✅ FIX_NETWORK_ANDROID.md, GUIDE_DEPLOYMENT.md
   ```

5. **Oublier la date et le contexte**
   ```
   ❌ Pas de date/contexte
   ✅ **Date** : 06/01/2026, **Contexte** : Fix bug réseau
   ```

---

## 📚 **Documents de Référence**

### **À Consulter Avant de Créer un Document**

1. **INDEX.md** - Index complet de tous les documents
2. **QUICK_NAVIGATION.md** - Navigation rapide
3. **README.md** de chaque dossier - Contexte du dossier
4. **STRUCTURE_FINALE.md** - Vue d'ensemble structure

### **Où Trouver des Exemples**

Chaque dossier contient des exemples de documents bien structurés :

- **Tests** : `docs/testing/WEB_TEST_GUIDE.md`
- **Debug** : `docs/troubleshooting/DEBUG_CRASH_GUIDE.md`
- **Architecture** : `docs/architecture/ARCHITECTURE_COMPLETE.md`
- **Features** : `docs/features/FARM_CONTEXT_USAGE.md`
- **Deployment** : `docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`

---

## 💡 **Conseils pour Agents IA**

### **Best Practices**

1. **Toujours vérifier l'existence** avant de créer
   ```
   Est-ce qu'un document similaire existe déjà ?
   → Consulter INDEX.md ou README du dossier
   ```

2. **Privilégier la mise à jour** à la création
   ```
   Un doc existe déjà sur ce sujet ?
   → Mettre à jour plutôt que créer un doublon
   ```

3. **Utiliser des noms descriptifs**
   ```
   ❌ FIX_BUG.md
   ✅ FIX_NETWORK_TIMEOUT_ANDROID.md
   ```

4. **Ajouter du contexte**
   ```markdown
   **Date** : 06/01/2026
   **Agent** : UI/UX Specialist
   **Contexte** : Fix bouton submit formulaire
   **Issue** : #123
   ```

5. **Créer des liens**
   ```markdown
   Voir aussi :
   - [Guide principal](../README.md)
   - [Document connexe](./AUTRE_DOC.md)
   ```

### **Workflow Recommandé**

```
1. Identifier le type de document
   ↓
2. Consulter l'arbre de décision
   ↓
3. Choisir le dossier approprié
   ↓
4. Vérifier s'il existe un doc similaire
   ↓
5. Créer avec nom descriptif
   ↓
6. Structurer avec sections claires
   ↓
7. Ajouter liens vers docs connexes
   ↓
8. Optionnel : Mettre à jour README du dossier
```

---

## 🎯 **Exemples Concrets**

### **Exemple 1 : Rapport de Test**

```markdown
# 🧪 Test Results - Mobile App v2.1.0

**Date** : 06/01/2026  
**Agent** : Testing QA  
**Device** : Android 13, iOS 17  
**Statut** : ✅ Tests passés

[... contenu ...]
```

**Placement** : `docs/testing/TEST_RESULTS_2026_01_06.md`

---

### **Exemple 2 : Fix Bug**

```markdown
# 🔧 Fix - Network Timeout Android

**Date** : 06/01/2026  
**Agent** : Troubleshooting Specialist  
**Issue** : Timeout réseau sur Android 13+  
**Statut** : ✅ Résolu

[... contenu ...]

Voir aussi :
- [Debug Network Guide](./DEBUG_NETWORK_GUIDE.md)
- [Android Network Fix](./ANDROID_NETWORK_FIX.md)
```

**Placement** : `docs/troubleshooting/FIX_NETWORK_TIMEOUT_ANDROID_2026_01_06.md`

---

### **Exemple 3 : Nouvelle Feature**

```markdown
# ⚙️ Système de Notifications Push

**Date** : 06/01/2026  
**Agent** : Features Specialist  
**Feature** : Notifications push natives  
**Statut** : 🔄 En cours

[... contenu ...]

Voir aussi :
- [Notifications System](./NOTIFICATIONS_SYSTEM_GUIDE.md)
- [Architecture](../architecture/ARCHITECTURE_COMPLETE.md)
```

**Placement** : `docs/features/PUSH_NOTIFICATIONS_SYSTEM.md`

---

### **Exemple 4 : Script SQL**

```sql
-- Fix prompt conflict
-- Date : 06/01/2026
-- Context : Resolution conflit prompts duplicates

DELETE FROM mcp_prompts.prompts
WHERE version = 'old'
AND id IN (SELECT ...);
```

**Placement** : `supabase/fix_prompt_conflict.sql`

---

## ✅ **Checklist Finale Avant de Créer**

Avant de créer un document, vérifier :

- [ ] J'ai identifié le type de document (test, fix, guide, etc.)
- [ ] J'ai consulté l'arbre de décision
- [ ] J'ai choisi le bon dossier (`docs/[dossier]/`)
- [ ] Je n'ai PAS créé à la racine du projet
- [ ] Le nom est en MAJUSCULES_UNDERSCORES.md
- [ ] Le nom est descriptif et clair
- [ ] J'ai ajouté date, contexte, statut en en-tête
- [ ] J'ai structuré le document avec sections
- [ ] J'ai ajouté des liens vers docs connexes
- [ ] J'ai vérifié qu'un doc similaire n'existe pas déjà

---

## 🆘 **En Cas de Doute**

### **Que Faire ?**

1. **Consulter INDEX.md**
   - Voir tous les documents existants
   - Trouver des exemples similaires

2. **Regarder le README du dossier**
   - Chaque dossier a un README expliquant son contenu

3. **Chercher un document similaire**
   - Y a-t-il déjà un doc sur ce sujet ?
   - Puis-je mettre à jour un doc existant ?

4. **En dernier recours : archive/**
   - Si vraiment aucun dossier ne correspond
   - Mettre dans `docs/archive/`
   - Mentionner dans le document qu'il faudrait le reclasser

---

## 📞 **Contact & Questions**

Si un agent a besoin de clarifications sur l'organisation :

1. Consulter **docs/INDEX.md**
2. Consulter **docs/STRUCTURE_FINALE.md**
3. Consulter ce guide (**docs/GUIDE_ORGANISATION_AGENTS.md**)

---

## 🎉 **Résumé Ultra-Rapide**

```
✅ À FAIRE :
- Créer dans docs/[dossier]/ (pas à la racine)
- Nom MAJUSCULES_UNDERSCORES.md
- Ajouter date, contexte, statut
- Structurer avec sections
- Ajouter liens connexes

❌ À NE JAMAIS FAIRE :
- Créer .md à la racine projet
- Créer .sql à la racine projet
- Encombrer racine docs/
- Noms vagues (fix.md, doc.md)
- Oublier date et contexte
```

---

**📊 Organisation** : 13 dossiers thématiques + 1 archive  
**🎯 Objectif** : Documentation organisée, accessible, maintenable  
**✅ Statut** : Guide complet et prêt à l'emploi

**🚀 Bonne organisation de la documentation !**




