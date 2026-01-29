# 📂 Organisation Dossier Supabase

**Date** : 6 janvier 2026  
**Statut** : ✅ Organisé

---

## 🎯 **Structure Finale**

```
supabase/
├── DB_schema/              ← Schéma base de données
├── MIGRATION_GUIDE.md      ← Guide migration (SEUL .md à la racine)
│
├── Migrations/             ← Migrations officielles (versionnées)
│   └── 001_*.sql à 038_*.sql
│
├── scripts/                ← Scripts utilitaires (lecture, export, test)
│   ├── README.md
│   ├── check_*.sql
│   ├── export_*.sql
│   ├── test_*.sql
│   └── DIAGNOSTIC_*.sql
│
├── archive/                ← Scripts historiques (déjà appliqués)
│   ├── README.md
│   ├── APPLY_*.sql
│   ├── FIX_*.sql
│   ├── SUPABASE_*.sql
│   └── *llm_matching.sql
│
├── seeds/                  ← Seeds données de test
│   └── *.sql, *.md
│
└── functions/              ← Edge Functions
    └── *.ts
```

---

## ✅ **Racine Propre**

**Seulement 2 éléments à la racine** :
1. `DB_schema/` - Dossier schéma base de données
2. `MIGRATION_GUIDE.md` - Guide migration

**Tous les autres fichiers** sont organisés dans des sous-dossiers.

---

## 📁 **Dossiers**

### **1. Migrations/** ⭐
**Migrations officielles versionnées**

- ✅ Migrations numérotées (001_*.sql à 038_*.sql)
- ✅ Appliquées dans l'ordre
- ✅ Versionnées et documentées
- ✅ Utilisées pour la production

**Utilisation** :
```bash
# Appliquer une migration
psql -f Migrations/038_audio_files_table_and_storage.sql
```

---

### **2. scripts/** 🔧
**Scripts utilitaires (lecture, export, test)**

- ✅ Scripts sûrs (lecture seule ou export)
- ✅ Vérification état base de données
- ✅ Export de données
- ✅ Tests de fonctionnalités
- ✅ Diagnostics

**Contenu** :
- `check_*.sql` - Vérifications
- `export_*.sql` - Exports
- `test_*.sql` - Tests
- `DIAGNOSTIC_*.sql` - Diagnostics

**⚠️ Important** : Ces scripts sont **sûrs** et ne modifient pas la structure.

---

### **3. archive/** 📦
**Scripts historiques (déjà appliqués)**

- ✅ Scripts déjà appliqués à la base
- ✅ Fixes ponctuels (déjà résolus)
- ✅ Migrations remplacées par versions officielles
- ✅ Scripts de debug temporaires

**Contenu** :
- `APPLY_*.sql` - Migrations appliquées
- `FIX_*.sql` - Fixes appliqués
- `SUPABASE_*.sql` - Debug Supabase
- `*llm_matching.sql` - Anciens scripts matching

**⚠️ IMPORTANT** : **NE PAS exécuter** ces scripts sur production !

Ils sont conservés uniquement pour référence historique.

---

### **4. seeds/** 🌱
**Données de test**

- ✅ Seeds pour développement
- ✅ Données de test
- ✅ Guides de setup

---

### **5. functions/** ⚡
**Edge Functions**

- ✅ Functions TypeScript
- ✅ API endpoints
- ✅ Services backend

---

## 🚫 **Règles d'Organisation**

### **⚠️ RÈGLE #1**

**JAMAIS de fichiers SQL ou .md à la racine de supabase/ !**

```
❌ INTERDIT :
supabase/MON_SCRIPT.sql
supabase/MON_GUIDE.md

✅ CORRECT :
supabase/scripts/MON_SCRIPT.sql
supabase/archive/MON_SCRIPT.sql
supabase/Migrations/038_MON_SCRIPT.sql
```

### **📋 Où Placer un Nouveau Script ?**

| Type de Script | Dossier |
|---------------|---------|
| Migration officielle (versionnée) | `Migrations/` |
| Script utilitaire (lecture, export, test) | `scripts/` |
| Fix déjà appliqué / Script historique | `archive/` |
| Seed données test | `seeds/` |

---

## 📚 **Documentation**

### **Guides**
- `MIGRATION_GUIDE.md` - Guide migration complet
- `scripts/README.md` - Documentation scripts utilitaires
- `archive/README.md` - Documentation archive
- `ORGANISATION_SUPABASE.md` - Ce fichier

### **Structure**
- `DB_schema/` - Schéma base de données
- `Migrations/` - Migrations officielles
- `scripts/` - Scripts utilitaires
- `archive/` - Scripts historiques

---

## ✅ **Vérification**

### **Racine Propre**
```bash
# Vérifier fichiers à la racine
cd supabase
ls -la *.sql *.md

# Résultat attendu :
# - DB_schema/ (dossier)
# - MIGRATION_GUIDE.md (seul .md)
# - 0 fichiers .sql
```

### **Organisation**
- ✅ Tous les .sql dans sous-dossiers
- ✅ Seul MIGRATION_GUIDE.md à la racine
- ✅ README dans chaque dossier
- ✅ Structure claire et logique

---

## 🎊 **Résultat**

```
✅ Racine propre : 2 éléments seulement
✅ 29 fichiers SQL organisés
✅ Structure professionnelle
✅ Documentation complète
✅ Maintenance facile
```

---

**📊 Statistiques** :
- **29 fichiers SQL** organisés
- **2 dossiers** créés (scripts/, archive/)
- **2 README** créés
- **100%** organisé

**🎉 Le dossier supabase/ est PARFAITEMENT organisé !**

---

**Date** : 6 janvier 2026  
**Statut** : ✅ TERMINÉ
