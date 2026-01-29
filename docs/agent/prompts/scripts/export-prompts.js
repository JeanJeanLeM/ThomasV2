#!/usr/bin/env node

/**
 * Script d'export des prompts Supabase
 * Date: 07/01/2026
 * Usage: node export-prompts.js
 */

const fs = require('fs');
const path = require('path');

// Fonction pour créer un client Supabase simple avec fetch
async function createSupabaseClient() {
  // Essayer différentes variables d'environnement possibles
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('❌ Variables d\'environnement manquantes: EXPO_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  }
  
  console.log('🔗 Connexion à Supabase...');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Service Role Key:', serviceRoleKey.substring(0, 20) + '...');
  
  return {
    url: supabaseUrl,
    key: serviceRoleKey
  };
}

// Fonction pour faire une requête à l'API Supabase
async function supabaseQuery(client, table, query = '') {
  const url = `${client.url}/rest/v1/${table}${query}`;
  
  console.log('🌐 Requête:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': client.key,
      'Authorization': `Bearer ${client.key}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`❌ Erreur API Supabase (${response.status}): ${error}`);
  }
  
  return await response.json();
}

// Fonction pour exporter tous les prompts
async function exportAllPrompts() {
  try {
    console.log('🚀 Démarrage export des prompts...\n');
    
    // Créer client Supabase
    const client = await createSupabaseClient();
    
    // Récupérer tous les prompts
    console.log('📥 Récupération des prompts...');
    const prompts = await supabaseQuery(client, 'chat_prompts', '?order=created_at.desc');
    
    console.log(`✅ ${prompts.length} prompts trouvés\n`);
    
    // Créer les dossiers si nécessaire
    const currentDir = path.join(__dirname, '..', 'current');
    const historyDir = path.join(__dirname, '..', 'history');
    
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
    
    // Traiter chaque prompt
    const activePrompts = [];
    const inactivePrompts = [];
    
    prompts.forEach(prompt => {
      if (prompt.is_active) {
        activePrompts.push(prompt);
      } else {
        inactivePrompts.push(prompt);
      }
    });
    
    console.log('📊 Statistiques:');
    console.log(`   • Prompts actifs: ${activePrompts.length}`);
    console.log(`   • Prompts inactifs: ${inactivePrompts.length}\n`);
    
    // Exporter prompts actifs dans current/
    console.log('📁 Export des prompts actifs...');
    activePrompts.forEach(prompt => {
      const filename = `${prompt.name}_v${prompt.version}.md`;
      const filepath = path.join(currentDir, filename);
      const content = generateMarkdownPrompt(prompt, true);
      
      fs.writeFileSync(filepath, content);
      console.log(`   ✅ ${filename}`);
    });
    
    // Exporter prompts inactifs dans history/
    console.log('\n📁 Export des prompts historiques...');
    inactivePrompts.slice(0, 10).forEach(prompt => { // Limiter à 10 pour éviter trop de fichiers
      const filename = `${prompt.name}_v${prompt.version}.md`;
      const filepath = path.join(historyDir, filename);
      const content = generateMarkdownPrompt(prompt, false);
      
      fs.writeFileSync(filepath, content);
      console.log(`   ✅ ${filename}`);
    });
    
    // Mettre à jour le CHANGELOG
    console.log('\n📝 Mise à jour du CHANGELOG...');
    updateChangelog(activePrompts);
    
    console.log('\n🎉 Export terminé avec succès !');
    console.log(`📁 Prompts actifs: docs/agent/prompts/current/`);
    console.log(`📁 Historique: docs/agent/prompts/history/`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error.message);
    console.log('\n💡 Solutions possibles:');
    console.log('   • Vérifier les variables d\'environnement (.env)');
    console.log('   • Vérifier la connexion réseau');
    console.log('   • Utiliser les copies locales existantes');
    process.exit(1);
  }
}

// Fonction pour générer le contenu Markdown d'un prompt
function generateMarkdownPrompt(prompt, isActive) {
  const status = isActive ? '✅ Actif' : '❌ Inactif';
  const date = new Date(prompt.created_at).toLocaleDateString('fr-FR');
  
  return `# 🤖 ${prompt.name} v${prompt.version}

**Version** : ${prompt.version}  
**Statut** : ${status}  
**Date** : ${date}  
**Longueur** : ${prompt.content.length} caractères

---

## 📋 **Contenu du Prompt**

${prompt.content}

---

## 📊 **Métadonnées**

- **ID** : ${prompt.id}
- **Créé le** : ${prompt.created_at}
- **Mis à jour le** : ${prompt.updated_at || 'N/A'}
- **Exemples** : ${prompt.examples ? 'Oui' : 'Non'}
- **Metadata** : ${prompt.metadata ? JSON.stringify(prompt.metadata, null, 2) : 'N/A'}

---

**📁 Emplacement** : \`docs/agent/prompts/${isActive ? 'current' : 'history'}/\`  
**🔄 Export** : ${new Date().toLocaleString('fr-FR')}  
**📊 Statut** : ${status}`;
}

// Fonction pour mettre à jour le CHANGELOG
function updateChangelog(activePrompts) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    console.log('⚠️  CHANGELOG.md non trouvé, création...');
    fs.writeFileSync(changelogPath, '# 📝 Changelog des Prompts Thomas Agent\n\n');
  }
  
  // Ajouter section avec export actuel
  const exportSection = `
## 🔄 **Export Automatique** - ${new Date().toLocaleDateString('fr-FR')}

### **📊 Prompts Actifs Exportés**
${activePrompts.map(p => `- \`${p.name}\` v${p.version} (${p.content.length} chars)`).join('\n')}

**🔧 Export via** : Script automatisé  
**📁 Emplacement** : \`docs/agent/prompts/current/\`

---
`;
  
  // Lire le contenu actuel et ajouter la nouvelle section
  let content = fs.readFileSync(changelogPath, 'utf8');
  
  // Insérer après le titre principal
  const lines = content.split('\n');
  const titleIndex = lines.findIndex(line => line.startsWith('# 📝 Changelog'));
  
  if (titleIndex !== -1) {
    lines.splice(titleIndex + 3, 0, exportSection);
    fs.writeFileSync(changelogPath, lines.join('\n'));
    console.log('   ✅ CHANGELOG.md mis à jour');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  exportAllPrompts();
}

module.exports = { exportAllPrompts };
