# 📜 Scripts SQL Utilitaires

**Emplacement** : `supabase/scripts/`

## 🎯 **Objectif**

Ce dossier contient les **scripts SQL utilitaires** pour :
- ✅ Vérifier l'état de la base de données
- ✅ Exporter des données
- ✅ Tester des fonctionnalités
- ✅ Diagnostiquer des problèmes

## 📋 **Scripts Disponibles**

### **Vérification**
- `check_documents_data.sql` - Vérifier les données documents
- `check_prompt_version.sql` - Vérifier la version des prompts

### **Export**
- `export_all_prompts.sql` - Exporter tous les prompts
- `export_current_prompt.sql` - Exporter le prompt actuel

### **Tests**
- `test_current_features.sql` - Tester les fonctionnalités actuelles
- `test_migration.sql` - Tester une migration

### **Diagnostics**
- `DIAGNOSTIC_TASKS_7_JANVIER.sql` - Diagnostic tâches

## ⚠️ **Important**

Ces scripts sont **sûrs à exécuter** et ne modifient pas la structure de la base de données.

Ils servent uniquement à :
- Lire des données
- Vérifier l'état
- Exporter des informations
- Diagnostiquer des problèmes

## 🚀 **Utilisation**

```bash
# Exécuter un script
psql -h [host] -U [user] -d [database] -f scripts/check_prompt_version.sql
```

---

**📁 Structure** :
- `scripts/` - Scripts utilitaires (lecture, export, test)
- `archive/` - Scripts historiques (fixes, migrations appliquées)
- `Migrations/` - Migrations officielles (versionnées)
