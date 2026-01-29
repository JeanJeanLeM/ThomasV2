/**
 * Script pour vider la table phytosanitary_usages
 * À utiliser avant de réimporter les données corrigées
 * 
 * Usage: node scripts/clear-phyto-usages.js
 */

const path = require('path');

// Charger les variables d'environnement depuis .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialiser le client Supabase
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🗑️  Suppression des données de phytosanitary_usages...\n');
  
  try {
    // Compter les lignes avant suppression
    const { count: countBefore } = await supabase
      .from('phytosanitary_usages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Lignes actuelles: ${countBefore}`);
    
    // Supprimer toutes les lignes
    const { error } = await supabase
      .from('phytosanitary_usages')
      .delete()
      .neq('id', 0); // Supprime tout sauf id=0 (qui n'existe pas, donc tout)
    
    if (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      process.exit(1);
    }
    
    // Vérifier que la table est vide
    const { count: countAfter } = await supabase
      .from('phytosanitary_usages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Suppression terminée`);
    console.log(`📊 Lignes restantes: ${countAfter}`);
    console.log('\n💡 Vous pouvez maintenant relancer: node scripts/import-ephy-data.js');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

main();
