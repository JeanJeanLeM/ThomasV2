#!/usr/bin/env node

/**
 * Script de Validation des Icônes Ionicons
 * 
 * Valide que toutes les icônes Ionicons utilisées dans le projet
 * existent bien dans la bibliothèque @expo/vector-icons.
 */

const fs = require('fs');
const path = require('path');

// Import des icônes disponibles depuis @expo/vector-icons
let availableIcons;
try {
  // Charger les icônes Ionicons disponibles via une approche plus robuste
  const { Ionicons } = require('@expo/vector-icons');
  availableIcons = Object.keys(Ionicons.glyphMap || Ionicons.font || {});
  
  // Fallback avec une liste d'icônes communes si l'import échoue
  if (!availableIcons || availableIcons.length === 0) {
    console.log('ℹ️  Utilisation de la liste d\'icônes de fallback...');
    availableIcons = [
      'person-outline', 'people-outline', 'business-outline', 'log-out-outline',
      'settings-outline', 'help-circle-outline', 'notifications-outline', 'home-outline',
      'map-outline', 'construct-outline', 'clipboard-outline', 'mic-outline',
      'add-outline', 'car-outline', 'trash-outline', 'swap-horizontal-outline',
      'calculator-outline', 'create-outline', 'chevron-forward-outline', 
      'document-text-outline', 'bar-chart-outline', 'grid-outline', 'list-outline',
      'person-circle-outline', 'hammer-outline', 'chatbubbles-outline', 'chatbubble-outline',
      'send-outline', 'archive-outline', 'search-outline', 'chevron-back-outline',
      'camera-outline', 'send', 'mic', 'add', 'ellipse-outline'
    ];
  }
} catch (error) {
  console.log('ℹ️  @expo/vector-icons non disponible, validation basique uniquement');
  // Liste minimale d'icônes pour validation basique
  availableIcons = [
    'person-outline', 'people-outline', 'business-outline', 'log-out-outline',
    'settings-outline', 'help-circle-outline', 'notifications-outline', 'home-outline',
    'map-outline', 'construct-outline', 'clipboard-outline', 'mic-outline',
    'add-outline', 'car-outline', 'trash-outline', 'swap-horizontal-outline',
    'calculator-outline', 'create-outline', 'chevron-forward-outline', 
    'document-text-outline', 'bar-chart-outline', 'grid-outline', 'list-outline',
    'person-circle-outline', 'hammer-outline', 'chatbubbles-outline', 'chatbubble-outline',
    'send-outline', 'archive-outline', 'search-outline', 'chevron-back-outline',
    'camera-outline', 'send', 'mic', 'add', 'ellipse-outline'
  ];
}

// Configuration des dossiers à analyser
const DIRECTORIES_TO_SCAN = [
  'src/components',
  'src/screens', 
  'src/design-system',
  'src/navigation'
];

// Expressions régulières pour détecter les icônes
const ICON_PATTERNS = [
  // <Ionicons name="icon-name" ... />
  /name\s*=\s*["'`]([a-zA-Z0-9-_]+)["'`]/g,
  // 'icon-name' as IconName
  /["'`]([a-zA-Z0-9-_]+)["'`]\s*as\s+IconName/g,
  // Mappings d'icônes
  /:\s*["'`]([a-zA-Z0-9-_]+)["'`]\s*as\s+IconName/g
];

let totalFiles = 0;
let totalIconsFound = 0;
let invalidIcons = [];
let validationResults = [];

/**
 * Recherche récursive des fichiers TypeScript/JavaScript
 */
function findTSFiles(dir) {
  let results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findTSFiles(filePath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      results.push(filePath);
    }
  }
  
  return results;
}

/**
 * Valide les icônes dans un fichier
 */
function validateIconsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const foundIcons = new Set();
  const fileInvalidIcons = [];
  
  // Rechercher les icônes avec chaque pattern
  for (const pattern of ICON_PATTERNS) {
    let match;
    const regex = new RegExp(pattern);
    
    while ((match = regex.exec(content)) !== null) {
      const iconName = match[1];
      foundIcons.add(iconName);
      
      // Vérifier si l'icône existe
      if (!availableIcons.includes(iconName)) {
        fileInvalidIcons.push(iconName);
        invalidIcons.push({
          file: filePath,
          icon: iconName
        });
      }
    }
  }
  
  if (foundIcons.size > 0) {
    validationResults.push({
      file: filePath,
      iconsCount: foundIcons.size,
      invalidCount: fileInvalidIcons.length,
      icons: Array.from(foundIcons),
      invalidIcons: fileInvalidIcons
    });
  }
  
  return foundIcons.size;
}

/**
 * Fonction principale de validation
 */
function validateIcons() {
  console.log('🔍 Validation des icônes Ionicons...\n');
  
  // Scanner tous les dossiers
  for (const directory of DIRECTORIES_TO_SCAN) {
    const files = findTSFiles(directory);
    
    for (const file of files) {
      totalFiles++;
      const iconsInFile = validateIconsInFile(file);
      totalIconsFound += iconsInFile;
    }
  }
  
  // Afficher les résultats
  console.log('📊 Résultats de la validation:\n');
  
  if (validationResults.length === 0) {
    console.log('ℹ️  Aucune icône Ionicons trouvée dans le projet.');
    return;
  }
  
  // Afficher les fichiers avec icônes valides
  const validFiles = validationResults.filter(result => result.invalidCount === 0);
  
  if (validFiles.length > 0) {
    console.log('✅ Fichiers avec icônes valides:');
    for (const result of validFiles) {
      console.log(`✅ ${result.file}: ${result.iconsCount} icône(s) valide(s)`);
    }
    console.log();
  }
  
  // Afficher les erreurs s'il y en a
  if (invalidIcons.length > 0) {
    console.log('❌ Icônes invalides trouvées:');
    
    const errorsByFile = {};
    for (const error of invalidIcons) {
      if (!errorsByFile[error.file]) {
        errorsByFile[error.file] = [];
      }
      errorsByFile[error.file].push(error.icon);
    }
    
    for (const [file, icons] of Object.entries(errorsByFile)) {
      console.log(`❌ ${file}:`);
      for (const icon of icons) {
        console.log(`   - "${icon}" (n'existe pas dans Ionicons)`);
      }
    }
    
    console.log(`\n💡 Consultez https://ionic.io/ionicons pour voir les icônes disponibles.`);
    console.log(`\n❌ Échec: ${invalidIcons.length} icône(s) invalide(s) trouvée(s).`);
    
    process.exit(1);
  } else {
    console.log(`🎉 Toutes les icônes Ionicons sont valides !`);
    console.log(`\n📈 Statistiques:`);
    console.log(`   - Fichiers analysés: ${totalFiles}`);
    console.log(`   - Fichiers avec icônes: ${validationResults.length}`);
    console.log(`   - Icônes totales trouvées: ${totalIconsFound}`);
    console.log(`   - Icônes disponibles dans Ionicons: ${availableIcons.length}`);
  }
}

// Lancer la validation
if (require.main === module) {
  validateIcons();
}

module.exports = { validateIcons };