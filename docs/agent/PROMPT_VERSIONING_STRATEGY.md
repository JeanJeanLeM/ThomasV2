# 🔄 Stratégie de Versioning et Accès aux Prompts

**Date** : 07/01/2026  
**Agent** : Chat AI Specialist  
**Contexte** : Besoin d'accès et traçabilité des prompts actifs  
**Statut** : 🔄 Analyse des options

---

## 🚨 **Problème Actuel**

### **Limitations**
- ❌ **Pas d'accès direct** aux prompts en DB depuis l'agent
- ❌ **Pas de visibilité** sur les versions actives
- ❌ **Risque de régression** lors des mises à jour
- ❌ **Pas de traçabilité** des modifications

### **Impact**
- Corrections perdues lors des updates
- Impossibilité de vérifier l'état actuel
- Debugging difficile
- Pas de rollback possible

---

## 💡 **Options Proposées**

### **Option 1: Dossier Local avec Copies des Prompts** ⭐⭐⭐

#### **Structure Proposée**
```
docs/agent/prompts/
├── current/                    # Versions actuellement actives
│   ├── thomas_agent_system_v2.3.md
│   ├── intent_classification_v2.1.md
│   └── tool_selection_v1.0.md
├── history/                    # Historique des versions
│   ├── thomas_agent_system_v2.2.md
│   ├── thomas_agent_system_v2.1.md
│   └── thomas_agent_system_v2.0.md
└── CHANGELOG.md               # Journal des modifications
```

#### **Avantages**
- ✅ **Accès immédiat** aux prompts actuels
- ✅ **Historique complet** des versions
- ✅ **Traçabilité** des modifications
- ✅ **Rollback facile** en cas de problème
- ✅ **Pas de dépendance** réseau/API
- ✅ **Versionning Git** automatique

#### **Inconvénients**
- ❌ **Synchronisation manuelle** requise
- ❌ **Risque de désynchronisation** avec la DB
- ❌ **Maintenance** supplémentaire

#### **Workflow**
```
1. Créer migration → Copier prompt dans docs/agent/prompts/current/
2. Appliquer migration → Archiver ancienne version dans history/
3. Mettre à jour CHANGELOG.md
4. Commit Git pour traçabilité
```

---

### **Option 2: Connexion Directe via Service Role Key** ⭐⭐⭐⭐

#### **Implémentation**
```javascript
// docs/agent/scripts/prompt-manager.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getCurrentPrompts() {
  const { data, error } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('is_active', true);
  
  return data;
}
```

#### **Avantages**
- ✅ **Accès temps réel** aux prompts
- ✅ **Synchronisation automatique**
- ✅ **Pas de maintenance manuelle**
- ✅ **Données toujours à jour**
- ✅ **Possibilité d'automatisation**

#### **Inconvénients**
- ❌ **Dépendance réseau** (comme vu avec db push)
- ❌ **Changements API Supabase** (récents)
- ❌ **Sécurité** (service role key)
- ❌ **Complexité** d'implémentation

#### **Risques Identifiés**
- Changements récents des clés API Supabase
- Problèmes de connexion réseau
- Gestion des erreurs/timeouts

---

### **Option 3: Système Hybride** ⭐⭐⭐⭐⭐ (Recommandé)

#### **Combinaison des Deux**
1. **Script automatisé** qui exporte les prompts via service role
2. **Sauvegarde locale** dans docs/agent/prompts/
3. **Fallback** sur les copies locales si connexion échoue

#### **Script d'Export Automatisé**
```bash
# scripts/sync-prompts.sh
#!/bin/bash
echo "🔄 Synchronisation des prompts..."

# Tenter export via Supabase
if npx supabase db dump --data-only --table=chat_prompts > temp_prompts.sql; then
    echo "✅ Export Supabase réussi"
    # Convertir en fichiers markdown dans docs/agent/prompts/current/
    node scripts/convert-prompts.js
else
    echo "❌ Export Supabase échoué - utilisation des copies locales"
fi
```

#### **Avantages**
- ✅ **Meilleur des deux mondes**
- ✅ **Résilience** aux pannes réseau
- ✅ **Automatisation** quand possible
- ✅ **Fallback** fiable

---

### **Option 4: Webhook de Synchronisation** ⭐⭐⭐

#### **Principe**
- Trigger DB sur modification de `chat_prompts`
- Webhook vers endpoint qui met à jour les fichiers locaux
- Commit automatique sur Git

#### **Avantages**
- ✅ **Synchronisation automatique**
- ✅ **Temps réel**
- ✅ **Pas d'intervention manuelle**

#### **Inconvénients**
- ❌ **Complexité élevée**
- ❌ **Infrastructure supplémentaire**
- ❌ **Points de défaillance multiples**

---

## 🎯 **Recommandation : Option 3 (Hybride)**

### **Implémentation Immédiate**

#### **Phase 1: Structure de Base**
```
docs/agent/prompts/
├── current/
├── history/
├── CHANGELOG.md
└── scripts/
    ├── export-prompts.js
    └── sync-prompts.sh
```

#### **Phase 2: Script d'Export**
```javascript
// docs/agent/prompts/scripts/export-prompts.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function exportCurrentPrompts() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('chat_prompts')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Sauvegarder chaque prompt actif
    data.forEach(prompt => {
      const filename = `${prompt.name}_v${prompt.version}.md`;
      const content = generateMarkdownPrompt(prompt);
      fs.writeFileSync(`../current/${filename}`, content);
    });
    
    console.log('✅ Prompts exportés avec succès');
  } catch (error) {
    console.error('❌ Erreur export:', error.message);
    console.log('💡 Utiliser les copies locales existantes');
  }
}
```

#### **Phase 3: Automatisation**
```bash
# Ajouter au package.json
"scripts": {
  "sync-prompts": "node docs/agent/prompts/scripts/export-prompts.js",
  "backup-prompts": "cp docs/agent/prompts/current/* docs/agent/prompts/history/"
}
```

---

## 📋 **Plan d'Action**

### **Étape 1: Mise en Place Immédiate**
1. ✅ Créer structure `docs/agent/prompts/`
2. ✅ Copier manuellement les prompts actuels
3. ✅ Créer CHANGELOG.md initial

### **Étape 2: Script d'Export**
1. ⏳ Développer script export automatisé
2. ⏳ Tester avec service role key
3. ⏳ Gérer les cas d'erreur

### **Étape 3: Intégration Workflow**
1. ⏳ Automatiser lors des migrations
2. ⏳ Intégrer dans le processus de développement
3. ⏳ Documentation du workflow

---

## 🔧 **Autres Options Innovantes**

### **Option 5: Git Hooks**
- Hook pre-commit qui vérifie la sync des prompts
- Hook post-merge qui met à jour les copies locales

### **Option 6: Monitoring des Prompts**
- Script qui compare versions locales vs DB
- Alerte en cas de désynchronisation
- Dashboard simple des versions actives

### **Option 7: Prompt as Code**
- Prompts définis en code (TypeScript)
- Génération automatique des versions DB
- Type safety et validation

---

## ✅ **Conclusion**

**Recommandation** : **Option 3 (Hybride)** avec implémentation progressive

**Priorité immédiate** :
1. Structure de dossiers
2. Copies manuelles actuelles  
3. Script d'export automatisé

**Bénéfices attendus** :
- ✅ Visibilité complète des prompts
- ✅ Traçabilité des modifications
- ✅ Rollback facile
- ✅ Résilience aux pannes réseau

---

**Liens utiles** :
- [Guide Organisation](../GUIDE_ORGANISATION_AGENTS.md)
- [Agricultural Actions Fix](./AGRICULTURAL_ACTIONS_CLASSIFICATION_FIX.md)
