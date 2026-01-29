/**
 * Script d'import des usages E-Phy uniquement (sans les produits)
 * Utile pour réimporter uniquement les usages après correction
 * 
 * Usage: node scripts/import-ephy-usages-only.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data', 'Ephy');
const BATCH_SIZE = 100;

// Initialiser le client Supabase
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Debug - Variables trouvées:');
  console.error(`  - EXPO_PUBLIC_SUPABASE_URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? '✓' : '✗'}`);
  console.error(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗'}`);
  console.error(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗'}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Parse une ligne CSV
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
  
  const content = fs.readFileSync(filePath, 'latin1');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    console.error(`❌ Fichier vide: ${filename}`);
    return null;
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = fields[index] || '';
    });
    
    rows.push(row);
  }
  
  console.log(`✅ ${rows.length} lignes lues`);
  return rows;
}

/**
 * Parse le libellé pour extraire culture, partie traitée et bioagresseur
 * Format: "Culture*Partie traitée*Bioagresseur"
 */
function parseUsageLibShort(usageLibelle) {
  if (!usageLibelle) {
    return {
      target_culture: '',
      treated_part: '',
      target_pest: ''
    };
  }
  
  const parts = usageLibelle.split('*');
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
 * Parse un nombre décimal
 */
function parseNumber(numStr) {
  if (!numStr || numStr.trim() === '') return null;
  const cleaned = numStr.replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Importe les usages
 */
async function importUsages() {
  console.log('\n📝 Import des usages...');
  
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
  console.log('🚀 Import des usages E-Phy - Anses');
  console.log('=====================================\n');
  console.log(`📁 Dossier: ${DATA_DIR}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}\n`);
  
  const startTime = Date.now();
  
  try {
    const usagesImported = await importUsages();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n✅ Import terminé !');
    console.log('=====================================');
    console.log(`📝 Usages importés: ${usagesImported}`);
    console.log(`⏱️  Durée: ${duration}s`);
    console.log('\n📌 Attribution: Données E-Phy - Anses');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

main();
