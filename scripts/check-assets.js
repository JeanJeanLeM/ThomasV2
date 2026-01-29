#!/usr/bin/env node

/**
 * Script de vérification des assets pour les stores
 * Usage: node scripts/check-assets.js
 */

const fs = require('fs');
const path = require('path');

// Vérifier si sharp est disponible (pour lire dimensions images)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('⚠️  sharp non installé. Installer avec: npm install sharp');
  console.warn('   Les dimensions des images ne seront pas vérifiées.\n');
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Assets requis
const requiredAssets = {
  android: {
    icon: {
      file: 'ThomasSmall.png',
      size: { width: 512, height: 512 },
      description: 'Icon app Android (512x512)'
    },
    adaptiveIcon: {
      file: 'Logocolorfull.png',
      size: { width: 1024, height: 1024 },
      description: 'Adaptive icon Android (1024x1024)'
    }
  },
  ios: {
    icon: {
      file: 'ThomasSmall.png',
      size: { width: 1024, height: 1024 },
      description: 'Icon app iOS (1024x1024, sans transparence)'
    }
  },
  common: {
    splash: {
      file: 'LogoFull.png',
      description: 'Splash screen'
    },
    favicon: {
      file: 'Logocolorfull.png',
      description: 'Favicon web'
    }
  }
};

// Assets manquants pour stores
const storeAssets = {
  playStore: {
    featureGraphic: {
      file: 'feature-graphic-1024x500.png',
      size: { width: 1024, height: 500 },
      description: 'Feature Graphic Google Play (1024x500)',
      required: false
    },
    screenshots: {
      description: 'Screenshots Android (2-8 images, 1080x1920 recommandé)',
      required: false
    }
  },
  appStore: {
    screenshots: {
      iphone65: {
        description: 'Screenshots iPhone 6.5" (1290x2796, min 3)',
        required: false
      },
      iphone55: {
        description: 'Screenshots iPhone 5.5" (1242x2208, min 3)',
        required: false
      },
      ipad: {
        description: 'Screenshots iPad 12.9" (2048x2732, min 3)',
        required: false
      }
    }
  }
};

async function checkImageDimensions(filePath, expectedSize) {
  if (!sharp) {
    return { valid: null, message: 'sharp non installé' };
  }

  try {
    const metadata = await sharp(filePath).metadata();
    const { width, height } = metadata;
    const { width: expectedWidth, height: expectedHeight } = expectedSize;

    const valid = width === expectedWidth && height === expectedHeight;

    return {
      valid,
      actual: `${width}x${height}`,
      expected: `${expectedWidth}x${expectedHeight}`,
      message: valid
        ? `✅ Dimensions correctes: ${width}x${height}`
        : `❌ Dimensions incorrectes: ${width}x${height} (attendu: ${expectedWidth}x${expectedHeight})`
    };
  } catch (error) {
    return { valid: false, message: `❌ Erreur lecture image: ${error.message}` };
  }
}

async function checkAsset(asset, platform) {
  const filePath = path.join(assetsDir, asset.file);
  const exists = fs.existsSync(filePath);

  if (!exists) {
    return {
      name: asset.file,
      status: 'missing',
      message: `❌ Fichier manquant: ${asset.file}`
    };
  }

  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);

  let dimensionCheck = null;
  if (asset.size && sharp) {
    dimensionCheck = await checkImageDimensions(filePath, asset.size);
  }

  return {
    name: asset.file,
    status: dimensionCheck?.valid === false ? 'invalid' : 'ok',
    size: `${sizeKB} KB`,
    dimensions: dimensionCheck?.actual || 'N/A',
    message: dimensionCheck?.message || `✅ Fichier présent: ${asset.file} (${sizeKB} KB)`
  };
}

async function main() {
  console.log('🔍 Vérification des assets pour les stores\n');
  console.log('=' .repeat(60));

  // Vérifier assets de base
  console.log('\n📱 Assets de Base\n');
  
  const allAssets = [
    ...Object.values(requiredAssets.android),
    ...Object.values(requiredAssets.ios),
    ...Object.values(requiredAssets.common)
  ];

  // Dédupliquer par nom de fichier
  const uniqueAssets = Array.from(
    new Map(allAssets.map(a => [a.file, a])).values()
  );

  for (const asset of uniqueAssets) {
    const result = await checkAsset(asset);
    console.log(`  ${result.message}`);
    if (result.dimensions && result.dimensions !== 'N/A') {
      console.log(`     Dimensions: ${result.dimensions}`);
    }
  }

  // Assets manquants pour stores
  console.log('\n📦 Assets Store (Optionnels mais Recommandés)\n');
  
  console.log('  Google Play Store:');
  console.log(`    ⚠️  Feature Graphic: ${storeAssets.playStore.featureGraphic.description}`);
  console.log(`    ⚠️  Screenshots: ${storeAssets.playStore.screenshots.description}`);
  
  console.log('\n  Apple App Store:');
  console.log(`    ⚠️  ${storeAssets.appStore.screenshots.iphone65.description}`);
  console.log(`    ⚠️  ${storeAssets.appStore.screenshots.iphone55.description}`);
  console.log(`    ⚠️  ${storeAssets.appStore.screenshots.ipad.description}`);

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Résumé\n');
  
  const results = await Promise.all(
    uniqueAssets.map(asset => checkAsset(asset))
  );

  const ok = results.filter(r => r.status === 'ok').length;
  const missing = results.filter(r => r.status === 'missing').length;
  const invalid = results.filter(r => r.status === 'invalid').length;

  console.log(`  ✅ Assets OK: ${ok}`);
  console.log(`  ❌ Assets manquants: ${missing}`);
  console.log(`  ⚠️  Assets invalides: ${invalid}`);

  if (missing > 0 || invalid > 0) {
    console.log('\n⚠️  Certains assets nécessitent une attention.');
    console.log('   Voir PLAY_STORE_ASSETS_GUIDE.md et APP_STORE_ASSETS_GUIDE.md');
  } else {
    console.log('\n✅ Tous les assets de base sont présents !');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
