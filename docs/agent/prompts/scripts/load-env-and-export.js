#!/usr/bin/env node

/**
 * Script d'export des prompts avec chargement du .env
 * Date: 07/01/2026
 * Usage: node load-env-and-export.js
 */

const fs = require('fs');
const path = require('path');

// Fonction pour charger le fichier .env
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '..', '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    throw new Error('❌ Fichier .env non trouvé');
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

// Fonction pour faire une requête à l'API Supabase
async function supabaseQuery(url, serviceKey, table, query = '') {
  const fullUrl = `${url}/rest/v1/${table}${query}`;
  
  console.log('🌐 Requête:', fullUrl);
  console.log('🔑 Clé utilisée:', serviceKey.substring(0, 30) + '...');
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('📊 Status:', response.status, response.statusText);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`❌ Erreur API Supabase (${response.status}): ${error}`);
  }
  
  return await response.json();
}

// Fonction principale d'export
async function exportPromptsWithEnv() {
  try {
    console.log('🚀 Démarrage export des prompts avec .env...\n');
    
    // Charger les variables d'environnement
    console.log('📁 Chargement du fichier .env...');
    const envVars = loadEnvFile();
    
    console.log('🔍 Variables trouvées:');
    Object.keys(envVars).forEach(key => {
      if (key.includes('SUPABASE')) {
        const value = envVars[key];
        console.log(`   • ${key}: ${value.substring(0, 30)}...`);
      }
    });
    
    // Identifier les bonnes variables
    const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
    const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      throw new Error('❌ EXPO_PUBLIC_SUPABASE_URL non trouvé dans .env');
    }
    
    if (!serviceKey) {
      throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvé dans .env');
    }
    
    console.log('\n🔗 Connexion à Supabase...');
    console.log('📍 URL:', supabaseUrl);
    
    // Tester la connexion avec une requête simple
    console.log('\n🧪 Test de connexion...');
    const prompts = await supabaseQuery(supabaseUrl, serviceKey, 'chat_prompts', '?select=name,version,is_active,created_at&limit=5');
    
    console.log(`✅ Connexion réussie ! ${prompts.length} prompts trouvés (échantillon)`);
    
    // Afficher les prompts trouvés
    console.log('\n📋 Prompts disponibles:');
    prompts.forEach(prompt => {
      const status = prompt.is_active ? '✅' : '❌';
      console.log(`   ${status} ${prompt.name} v${prompt.version} (${prompt.created_at})`);
    });
    
    // Récupérer tous les prompts avec le contenu complet
    console.log('\n📥 Récupération complète des prompts...');
    const allPrompts = await supabaseQuery(supabaseUrl, serviceKey, 'chat_prompts', '?order=created_at.desc');
    
    console.log(`✅ ${allPrompts.length} prompts récupérés\n`);
    
    // Créer les dossiers
    const currentDir = path.join(__dirname, '..', 'current');
    const historyDir = path.join(__dirname, '..', 'history');
    
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
    
    // Séparer actifs et inactifs
    const activePrompts = allPrompts.filter(p => p.is_active);
    const inactivePrompts = allPrompts.filter(p => !p.is_active);
    
    console.log('📊 Statistiques:');
    console.log(`   • Prompts actifs: ${activePrompts.length}`);
    console.log(`   • Prompts inactifs: ${inactivePrompts.length}\n`);
    
    // Exporter prompts actifs
    console.log('📁 Export des prompts actifs...');
    activePrompts.forEach(prompt => {
      const filename = `${prompt.name}_v${prompt.version}.md`;
      const filepath = path.join(currentDir, filename);
      const content = generateMarkdownPrompt(prompt, true);
      
      fs.writeFileSync(filepath, content);
      console.log(`   ✅ ${filename} (${prompt.content.length} chars)`);
    });
    
    console.log('\n🎉 Export terminé avec succès !');
    console.log(`📁 Prompts actifs: docs/agent/prompts/current/`);
    
    return { activePrompts, inactivePrompts };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error.message);
    console.log('\n💡 Vérifications à faire:');
    console.log('   • Le fichier .env existe-t-il ?');
    console.log('   • Les variables SUPABASE sont-elles correctes ?');
    console.log('   • La connexion réseau fonctionne-t-elle ?');
    process.exit(1);
  }
}

// Fonction pour générer le contenu Markdown
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

// Exécuter si appelé directement
if (require.main === module) {
  exportPromptsWithEnv();
}

module.exports = { exportPromptsWithEnv };
