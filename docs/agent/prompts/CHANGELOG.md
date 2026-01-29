# 📝 Changelog des Prompts Thomas Agent

**Objectif** : Traçabilité complète des modifications des prompts IA

---

## 🔄 **Version 2.3** - 07/01/2026

### **🚜 Agricultural Actions Classification Fix**

**Problème résolu** :
- L'IA classifiait "J'ai passé la herse étrie pendant 2 heures" comme `help` au lieu de `task_done`

**Modifications** :
- ✅ Ajout section "Actions Agricoles avec Outils"
- ✅ Liste des verbes agricoles : passer, utiliser, faire, travailler, effectuer
- ✅ Liste complète d'outils agricoles (herse, tracteur, charrue, etc.)
- ✅ Exemples de discrimination help vs task_done
- ✅ Cas particuliers gérés (tentatives, futur)

**Migration** : `025_fix_agricultural_actions_classification.sql`

**Tests** :
```
✅ "J'ai passé la herse étrie pendant 2 heures" → task_done
❌ "Comment utiliser la herse étrie ?" → help
```

---

## 🔄 **Version 2.2** - 06/01/2026

### **🐛 Issue Extraction Fix**

**Problème résolu** :
- L'IA n'extrayait pas les problèmes spécifiques dans le champ "issue" pour les observations

**Modifications** :
- ✅ Section dédiée "Extraction de Problèmes pour Observations"
- ✅ Règle absolue : extraire TOUJOURS le problème spécifique
- ✅ Exemples concrets : "pucerons", "dégâts de mineuse", "jaunissement"
- ✅ Format JSON obligatoire avec champ "issue"

**Migration** : `024_fix_issue_extraction.sql`

---

## 🔄 **Version 2.1** - 05/01/2026

### **⏰ Temporal Context Fix**

**Problème résolu** :
- L'IA utilisait une date fixe (2024-12-16) au lieu de la date actuelle
- Mauvaise interprétation des dates relatives ("hier", "demain")

**Modifications** :
- ✅ Section "Gestion Temporelle CRITIQUE"
- ✅ Instructions explicites pour dates relatives
- ✅ Format ISO obligatoire (YYYY-MM-DD)
- ✅ Contexte temporel fourni par l'Edge Function

**Migration** : `023_fix_temporal_context.sql`

### **🔍 Observation vs Task Discrimination**

**Problème résolu** :
- Confusion entre "observation" (constat) et "task done" (action d'observer)

**Modifications** :
- ✅ Mise à jour `intent_classification` prompt v2.1
- ✅ Règles explicites de discrimination
- ✅ Exemples concrets d'observation vs tâche

**Migration** : `022_fix_observation_discrimination.sql`

---

## 📊 **Statistiques**

### **Corrections Appliquées**
- ✅ **Contexte temporel** : Dates relatives correctes
- ✅ **Extraction problèmes** : Champ "issue" obligatoire
- ✅ **Actions agricoles** : Classification correcte des outils
- ✅ **Discrimination** : Observation vs tâche

### **Versions Actives**
- `thomas_agent_system` : v2.3 ✅
- `intent_classification` : v2.1 ✅
- `tool_selection` : v1.0 ✅

### **Métriques de Succès**
- "J'ai observé des pucerons" → observation avec issue="pucerons" ✅
- "J'ai passé la herse" → task_done ✅
- "Hier j'ai fait cela" → date=hier calculée ✅

---

## 🎯 **Prochaines Améliorations**

### **En Cours**
- [ ] Script d'export automatisé des prompts
- [ ] Connexion service role key Supabase
- [ ] Monitoring des versions actives

### **Planifié**
- [ ] Validation automatique des prompts
- [ ] Tests de régression
- [ ] Dashboard des métriques IA

---

**📁 Structure** : `docs/agent/prompts/`  
**🔄 Sync** : Manuel → Automatisé (en cours)  
**✅ Statut** : Système de versioning opérationnel
