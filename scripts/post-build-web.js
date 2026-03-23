/**
 * Script post-build web — Thomas V2
 * Copie les fichiers statiques nécessaires au déploiement OVH dans dist/
 * Utilisé automatiquement par `npm run build:web`
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const filesToCopy = [
  { src: path.join(ROOT, 'web', '.htaccess'), dest: path.join(DIST, '.htaccess') },
];

if (!fs.existsSync(DIST)) {
  console.error('❌ Le dossier dist/ est introuvable. Lancez d\'abord `expo export --platform web`.');
  process.exit(1);
}

for (const { src, dest } of filesToCopy) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ Copié : ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
  } else {
    console.warn(`⚠️  Fichier source introuvable, ignoré : ${path.relative(ROOT, src)}`);
  }
}

console.log('\n🚀 Build web prêt pour déploiement OVH. Contenu de dist/ à uploader sur FTP.');
