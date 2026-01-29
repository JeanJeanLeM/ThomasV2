/**
 * Script d'import des données E-Phy - Anses
 * Importe les produits phytosanitaires et leurs usages depuis les CSV
 * 
 * Source: https://ephy.anses.fr/
 * Attribution obligatoire: "Données E-Phy - Anses" avec date de mise à jour
 * 
 * Usage: node scripts/import-ephy-data.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env (dossier parent du script)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data', 'Ephy');
const BATCH_SIZE = 100;

// Initialiser le client Supabase
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes: SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY');
  console.error('Debug - Variables trouvées:');
  console.error(`  - EXPO_PUBLIC_SUPABASE_URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? '✓' : '✗'}`);
  console.error(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗'}`);
  console.error(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗'}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Parse une ligne CSV en tenant compte des guillemets et points-virgules
 */
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Ajouter le dernier champ
  fields.push(currentField.trim());
  
  return fields;
}

/**
 * Lit un fichier CSV encodé en Windows-1252
 */
function readCSV(filename) {
  const filePath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable: ${filePath}`);
    return null;
  }
  
  console.log(`📖 Lecture de ${filename}...`);
  
  // Lire le fichier en Windows-1252 (latin1)
  const content = fs.readFileSync(filePath, 'latin1');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    console.error(`❌ Fichier vide: ${filename}`);
    return null;
  }
  
  // Parser l'entête
  const headers = parseCSVLine(lines[0]);
  
  // Parser les lignes de données
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = fields[index] || '';
    });
    
    rows.push(row);
  }
  
  console.log(`✅ ${rows.length} lignes lues depuis ${filename}`);
  return rows;
}

/**
 * Parse le champ "identifiant usage lib court" pour extraire culture, partie traitée et bioagresseur
 * Format: "Culture*Partie traitée*Bioagresseur"
 * Exemple: "Tomate - Aubergine*Trt Part.Aer.*Chenilles phytophages"
 */
function parseUsageLibShort(usageLibShort) {
  if (!usageLibShort) {
    return {
      target_culture: '',
      treated_part: '',
      target_pest: ''
    };
  }
  
  const parts = usageLibShort.split('*');
  return {
    target_culture: parts[0]?.trim() || '',
    treated_part: parts[1]?.trim() || '',
    target_pest: parts[2]?.trim() || ''
  };
}

/**
 * Convertit une date DD/MM/YYYY en format ISO
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Parse un nombre décimal (remplace virgule par point)
 */
function parseNumber(numStr) {
  if (!numStr || numStr.trim() === '') return null;
  const cleaned = numStr.replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Importe les produits depuis produits_Windows-1252.csv
 */
async function importProducts() {
  console.log('\n📦 Import des produits phytosanitaires...');
  
  const rows = readCSV('produits_Windows-1252.csv');
  if (!rows) return 0;
  
  const products = [];
  const processedAmms = new Set();
  
  for (const row of rows) {
    const amm = row['numero AMM'];
    
    // Éviter les doublons
    if (!amm || processedAmms.has(amm)) continue;
    processedAmms.add(amm);
    
    products.push({
      amm,
      name: row['nom produit'] || '',
      type_produit: row['type produit'] || '',
      secondary_names: row['seconds noms commerciaux'] || '',
      holder: row['titulaire'] || '',
      commercial_type: row['type commercial'] || '',
      usage_range: row['gamme usage'] || '',
      authorized_mentions: row['mentions autorisees'] || '',
      usage_restrictions: row['restrictions usage'] || '',
      usage_restrictions_label: row['restrictions usage libelle'] || '',
      active_substances: row['Substances actives'] || '',
      functions: row['fonctions'] || '',
      formulations: row['formulations'] || '',
      authorization_state: row['Etat dautorisation'] || '',
      withdrawal_date: parseDate(row['Date de retrait du produit']),
      first_authorization_date: parseDate(row['Date de premiθre autorisation']),
      reference_amm: row['Numιro AMM du produit de rιfιrence'] || null,
      reference_product_name: row['Nom du produit de rιfιrence'] || null,
      is_custom: false
    });
  }
  
  console.log(`📊 ${products.length} produits uniques à importer`);
  
  // Importer par batches
  let imported = 0;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('phytosanitary_products')
      .upsert(batch, { onConflict: 'amm' });
    
    if (error) {
      console.error(`❌ Erreur batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      imported += batch.length;
      console.log(`✅ Batch ${i / BATCH_SIZE + 1}: ${batch.length} produits importés (total: ${imported}/${products.length})`);
    }
  }
  
  return imported;
}

/**
 * Importe les usages depuis usages_des_produits_autorises_Windows-1252.csv
 */
async function importUsages() {
  console.log('\n📝 Import des usages des produits...');
  
  const rows = readCSV('usages_des_produits_autorises_Windows-1252.csv');
  if (!rows) return 0;
  
  const usages = [];
  
  for (const row of rows) {
    const amm = row['numero AMM'];
    if (!amm) continue;
    
    // ATTENTION: Les noms de colonnes E-Phy sont inversés !
    // "identifiant usage" contient le libellé à parser (Culture*Partie*Bioagresseur)
    // "identifiant usage lib court" contient l'ID numérique
    const usageLibelle = row['identifiant usage'] || '';
    const parsed = parseUsageLibShort(usageLibelle);
    
    usages.push({
      amm,
      usage_id: row['identifiant usage lib court'] || '',
      usage_lib_short: usageLibelle,
      target_culture: parsed.target_culture,
      treated_part: parsed.treated_part,
      target_pest: parsed.target_pest,
      decision_date: parseDate(row['date decision']),
      cultural_stage_min: row['stade cultural min (BBCH)'] || null,
      cultural_stage_max: row['stade cultural max (BBCH)'] || null,
      usage_state: row['etat usage'] || '',
      retained_dose: parseNumber(row['dose retenue']),
      retained_dose_unit: row['dose retenue unite'] || null,
      harvest_delay_days: parseInt(row['delai avant recolte jour']) || null,
      harvest_delay_bbch: row['delai avant recolte bbch'] || null,
      max_applications: parseInt(row['nombre max d\'application']) || null,
      end_distribution_date: parseDate(row['date fin distribution']),
      end_use_date: parseDate(row['date fin utilisation']),
      employment_condition: row['condition emploi'] || null,
      znt_aquatic_m: parseNumber(row['ZNT aquatique (en m)']),
      znt_arthropods_m: parseNumber(row['ZNT arthropodes non cibles (en m)']),
      znt_plants_m: parseNumber(row['ZNT plantes non cibles (en m)']),
      authorized_mentions: row['mentions autorisees'] || null,
      min_interval_days: parseInt(row['intervalle minimum entre applications (jour)']) || null
    });
  }
  
  console.log(`📊 ${usages.length} usages à importer`);
  
  // Importer par batches
  let imported = 0;
  for (let i = 0; i < usages.length; i += BATCH_SIZE) {
    const batch = usages.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('phytosanitary_usages')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Erreur batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      imported += batch.length;
      console.log(`✅ Batch ${i / BATCH_SIZE + 1}: ${batch.length} usages importés (total: ${imported}/${usages.length})`);
    }
  }
  
  return imported;
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Import des données E-Phy - Anses');
  console.log('=====================================\n');
  console.log(`📁 Dossier de données: ${DATA_DIR}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);
  
  const startTime = Date.now();
  
  try {
    // 1. Importer les produits
    const productsImported = await importProducts();
    
    // 2. Importer les usages
    const usagesImported = await importUsages();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n✅ Import terminé !');
    console.log('=====================================');
    console.log(`📦 Produits importés: ${productsImported}`);
    console.log(`📝 Usages importés: ${usagesImported}`);
    console.log(`⏱️  Durée: ${duration}s`);
    console.log('\n📌 Attribution: Données E-Phy - Anses');
    console.log(`📅 Date d'import: ${new Date().toISOString().split('T')[0]}`);
    
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error);
    process.exit(1);
  }
}

// Exécuter le script
main();
