#!/usr/bin/env node

/**
 * Script d'application des migrations SQL via API Supabase
 * Date: 07/01/2026
 * Usage: node apply-migrations.js
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

// Fonction pour exécuter du SQL via l'API Supabase
async function executeSQL(url, serviceKey, sql) {
  // L'API REST de Supabase ne permet pas d'exécuter du SQL arbitraire
  // On doit utiliser l'API RPC ou une fonction edge
  
  // Pour contourner, on va directement mettre à jour via l'API REST
  return null; // Cette approche ne fonctionnera pas pour les migrations complexes
}

// Fonction pour appliquer une migration via UPDATE direct
async function applyMigrationDirect(url, serviceKey, migrationContent) {
  console.log('📝 Analyse du contenu de la migration...');
  
  // Parser le SQL pour extraire les opérations
  // C'est complexe, donc on va afficher les instructions pour l'utilisateur
  
  console.log('\n⚠️  LIMITATION: L\'API REST de Supabase ne permet pas d\'exécuter du SQL arbitraire.');
  console.log('Les migrations doivent être appliquées via :');
  console.log('1. Dashboard Supabase → SQL Editor');
  console.log('2. CLI Supabase (npx supabase db push)');
  console.log('3. Connexion PostgreSQL directe');
  
  return false;
}

// Fonction principale
async function applyMigrations() {
  try {
    console.log('🚀 Application des migrations...\n');
    
    // Charger les variables d'environnement
    const envVars = loadEnvFile();
    const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
    const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('❌ Variables Supabase manquantes dans .env');
    }
    
    console.log('🔗 Connexion à Supabase...');
    console.log('📍 URL:', supabaseUrl);
    
    // Lister les migrations à appliquer
    const migrationsToApply = [
      {
        name: 'fix_intent_classification_conflict',
        path: path.join(__dirname, '..', '..', '..', '..', 'supabase', 'fix_intent_classification_conflict.sql'),
        description: 'Fix conflit intent_classification (2 prompts actifs)'
      },
      {
        name: '026_fix_harvest_classification_and_logging',
        path: path.join(__dirname, '..', '..', '..', '..', 'supabase', 'Migrations', '026_fix_harvest_classification_and_logging.sql'),
        description: 'Fix classification récoltes + Amélioration logs'
      }
    ];
    
    console.log('\n📋 Migrations à appliquer:');
    migrationsToApply.forEach((m, i) => {
      const exists = fs.existsSync(m.path);
      const status = exists ? '✅' : '❌';
      console.log(`   ${i + 1}. ${status} ${m.name}`);
      console.log(`      ${m.description}`);
      if (exists) {
        const content = fs.readFileSync(m.path, 'utf8');
        console.log(`      Taille: ${content.length} chars`);
      }
    });
    
    console.log('\n⚠️  LIMITATION TECHNIQUE:');
    console.log('L\'API REST de Supabase ne permet pas d\'exécuter du SQL arbitraire.');
    console.log('');
    console.log('📌 SOLUTION RECOMMANDÉE:');
    console.log('1. Ouvrir Dashboard Supabase: https://supabase.com/dashboard');
    console.log('2. Aller dans "SQL Editor"');
    console.log('3. Copier-coller le contenu des fichiers SQL suivants:');
    console.log('');
    
    migrationsToApply.forEach((m, i) => {
      if (fs.existsSync(m.path)) {
        console.log(`   ${i + 1}. ${m.name}`);
        console.log(`      Fichier: ${m.path}`);
        console.log('');
      }
    });
    
    console.log('💡 ALTERNATIVE:');
    console.log('Si la connexion réseau est stable, réessayer:');
    console.log('   npx supabase db push');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter
if (require.main === module) {
  applyMigrations();
}

module.exports = { applyMigrations };
