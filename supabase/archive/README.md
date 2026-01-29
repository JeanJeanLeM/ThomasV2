# 📦 Archive - Scripts SQL Historiques

**Emplacement** : `supabase/archive/`

## 🎯 **Objectif**

Ce dossier contient les **scripts SQL historiques** qui ont été :
- ✅ Déjà appliqués à la base de données
- ✅ Remplacés par des migrations officielles
- ✅ Utilisés pour des fixes ponctuels (déjà résolus)
- ✅ Scripts de debug temporaires

## ⚠️ **IMPORTANT**

**Ces scripts sont ARCHIVÉS** et ne doivent **PAS être exécutés** sur une base de données en production.

Ils sont conservés uniquement pour :
- 📚 Référence historique
- 🔍 Compréhension des changements passés
- 📖 Documentation des fixes appliqués

## 📋 **Contenu**

### **Migrations Appliquées**
- `APPLY_ALL_FIXES.sql`
- `APPLY_ALL_QUANTITY_MIGRATIONS.sql`
- `APPLY_QUANTITY_IMPROVEMENTS.sql`
- `APPLY_MIGRATION_028.md`

### **Fixes Appliqués**
- `FIX_*.sql` - Tous les fixes appliqués
- `fix_*.sql` - Fixes mineurs
- `CLEANUP_*.sql` - Nettoyages appliqués
- `QUICK_FIX_*.sql` - Fixes rapides appliqués

### **Scripts de Debug**
- `SUPABASE_*.sql` - Scripts de debug Supabase
- `*llm_matching.sql` - Scripts de matching LLM (anciens)

### **Mises à Jour**
- `UPDATE_PROMPT_V2.9.sql` - Mise à jour prompts (déjà appliquée)

## 🚫 **Ne PAS Exécuter**

Ces scripts ont été **déjà appliqués** ou **remplacés** par des migrations officielles dans `Migrations/`.

Pour appliquer des changements, utilisez les **migrations officielles** dans `Migrations/`.

## 📚 **Référence**

Pour les migrations actives, voir :
- `Migrations/` - Migrations officielles versionnées
- `MIGRATION_GUIDE.md` - Guide de migration

---

**📁 Structure** :
- `archive/` - Scripts historiques (ne pas exécuter)
- `scripts/` - Scripts utilitaires (lecture, export, test)
- `Migrations/` - Migrations officielles (versionnées)
