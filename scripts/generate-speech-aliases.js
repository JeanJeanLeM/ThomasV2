/**
 * Script de génération automatique des speech_aliases pour phytosanitary_products
 *
 * Utilise GPT-4o-mini pour générer des alias phonétiques français (ce qu'un agriculteur
 * dirait oralement) pour chaque produit phytosanitaire.
 *
 * Usage:
 *   node scripts/generate-speech-aliases.js
 *   node scripts/generate-speech-aliases.js --dry-run       # Affiche sans écrire en DB
 *   node scripts/generate-speech-aliases.js --limit 200     # Traite les 200 premiers
 *   node scripts/generate-speech-aliases.js --reset         # Réinitialise TOUS les aliases (dangereux)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// ── Configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const GPT_MODEL = 'gpt-4o-mini';
const FETCH_PAGE_SIZE = 500;   // Lignes récupérées par page depuis Supabase
const GPT_BATCH_SIZE = 50;     // Produits envoyés par appel GPT
const DELAY_BETWEEN_BATCHES_MS = 1000; // Pause entre batches (évite rate limit)

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESET = args.includes('--reset');
const limitArg = args.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1]) : null;

// ── Validation ───────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Appel OpenAI via https natif (pas besoin d'installer le SDK openai)
 */
function callOpenAI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: GPT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `Tu es un assistant agricole expert en produits phytosanitaires français.
Ta tâche est de générer des alias phonétiques pour chaque produit,
c'est-à-dire les façons dont un agriculteur pourrait prononcer ces noms
lors d'une dictée vocale en français, en incluant :
- Les variantes de prononciation française courantes
- Les versions sans suffixes techniques (EC, WG, SC, SG, CS, WP, WDG, SE, OL, ME, DP)
- Les abbreviations orales courantes
- Les erreurs de reconnaissance vocale typiques
- Les noms simplifiés sans chiffres si le nom en contient
Réponds UNIQUEMENT avec un tableau JSON valide, rien d'autre.`
        },
        { role: 'user', content: prompt }
      ]
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Réponse invalide: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Voyelles déclenchant la liaison l' en français (y et h inclus)
const FRENCH_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'h']);

/**
 * Génère automatiquement les alias de liaison française (sans appel GPT).
 *
 * - Commence par une voyelle/h → l'[nom], la [nom], l [nom], l[nom] (collé)
 * - Commence par une consonne  → au [nom], du [nom]
 *
 * Exemples :
 *   "Avastel"  → ["l'avastel", "la vastel", "lavastel"]
 *   "Topaze"   → ["au topaze", "du topaze"]
 */
function generateArticleAliases(productName) {
  const lower = productName.toLowerCase().trim();
  if (!lower) return [];

  const firstChar = lower[0];
  const aliases = [];

  if (FRENCH_VOWELS.has(firstChar)) {
    // Liaison avec voyelle : l'Avastel → "l'avastel", "la vastel", "lavastel"
    aliases.push(`l'${lower}`);          // l'avastel
    aliases.push(`la ${lower}`);         // la vastel (Web Speech coupe souvent l' en "la")
    aliases.push(`l ${lower}`);          // l avastel (liaison sans apostrophe reconnue)
    aliases.push(`l${lower}`);           // lavastel  (fusion complète)
  } else {
    // Liaison avec consonne : Topaze → "au topaze", "du topaze"
    aliases.push(`au ${lower}`);         // au topaze
    aliases.push(`du ${lower}`);         // du topaze
  }

  return aliases;
}

/**
 * Construit le prompt GPT pour un batch de produits
 */
function buildPrompt(products) {
  const list = products.map(p => {
    const secondary = p.secondary_names ? `,"secondary":"${p.secondary_names}"` : '';
    return `{"amm":"${p.amm}","name":"${p.name}"${secondary}}`;
  }).join('\n');

  return `Génère jusqu'à 4 alias phonétiques français pour chaque produit.
Les alias doivent être en MINUSCULES.
N'inclus PAS les secondary_names existants (ils sont déjà dans la DB).
N'inclus PAS le nom exact du produit lui-même.
N'inclus PAS les formes avec articles (l', la, au, du) — elles sont gérées séparément.
Si le nom est déjà simple et clairement prononçable tel quel, génère un tableau vide [].

Concentre-toi sur :
- Les erreurs de reconnaissance vocale typiques (ex: "ridomil gold" → "rideau mil")
- Les versions sans suffixes techniques (EC, WG, SC, SG, CS, WP, WDG, SE, OL, ME, DP)
- Les chiffres prononcés oralement (ex: "Score 250" → "score deux cent cinquante")
- Les abréviations orales courantes

Format de réponse (tableau JSON strict) :
[
  {"amm": "1234567", "aliases": ["alias1", "alias2"]},
  ...
]

Produits à traiter :
${list}`;
}

/**
 * Parse la réponse GPT et extrait le JSON
 */
function parseGPTResponse(content) {
  // Nettoyer les blocs markdown si présents
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Chercher un tableau JSON dans la réponse
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Impossible de parser la réponse GPT: ${cleaned.slice(0, 200)}`);
  }
}

// ── Récupération des produits ────────────────────────────────────────────────

async function fetchAllProducts() {
  console.log('📦 Récupération des produits sans aliases...');

  let all = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('phytosanitary_products')
      .select('amm, name, secondary_names')
      .eq('is_custom', false)
      .order('name')
      .range(from, from + FETCH_PAGE_SIZE - 1);

    if (!RESET) {
      // Par défaut : seulement les produits avec speech_aliases vide
      query = query.eq('speech_aliases', '{}');
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erreur Supabase:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    all = all.concat(data);
    console.log(`  → ${all.length} produits récupérés...`);

    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }

  if (LIMIT) {
    all = all.slice(0, LIMIT);
    console.log(`  → Limité à ${LIMIT} produits (--limit)`);
  }

  return all;
}

// ── Traitement par batch ─────────────────────────────────────────────────────

async function processProducts(products) {
  const totalBatches = Math.ceil(products.length / GPT_BATCH_SIZE);
  let totalAliasesGenerated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  console.log(`\n🚀 Traitement de ${products.length} produits en ${totalBatches} batches de ${GPT_BATCH_SIZE}`);
  if (DRY_RUN) console.log('⚠️  MODE DRY-RUN : aucune écriture en base\n');

  for (let i = 0; i < products.length; i += GPT_BATCH_SIZE) {
    const batch = products.slice(i, i + GPT_BATCH_SIZE);
    const batchNum = Math.floor(i / GPT_BATCH_SIZE) + 1;

    process.stdout.write(`\n📝 Batch ${batchNum}/${totalBatches} (${batch.length} produits)... `);

    try {
      const prompt = buildPrompt(batch);
      const response = await callOpenAI(prompt);

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error('Réponse GPT vide');

      const parsed = parseGPTResponse(content);

      // Construire un map amm → aliases fusionnant GPT + articles algorithmiques
      const aliasMap = {};
      for (const item of parsed) {
        if (item.amm && Array.isArray(item.aliases)) {
          const product = batch.find(p => p.amm === item.amm);
          const productName = product?.name || '';

          // Aliases GPT nettoyés (max 4)
          const gptAliases = [...new Set(
            item.aliases
              .map(a => String(a).toLowerCase().trim())
              .filter(a => a.length >= 3 && a !== productName.toLowerCase())
          )].slice(0, 4);

          // Aliases d'articles algorithmiques (l', au, du…)
          const articleAliases = generateArticleAliases(productName);

          // Fusion : articles en premier (priorité haute), puis GPT, dédupliqués
          const merged = [...new Set([...articleAliases, ...gptAliases])];
          aliasMap[item.amm] = merged;
        }
      }

      // Pour les produits absents de la réponse GPT, on génère quand même les articles
      for (const product of batch) {
        if (!aliasMap[product.amm]) {
          aliasMap[product.amm] = generateArticleAliases(product.name);
        }
      }

      // Afficher un aperçu (1 voyelle + 1 consonne si possible)
      console.log(`✅`);
      const vowelExample = batch.find(p => FRENCH_VOWELS.has(p.name[0]?.toLowerCase()));
      const consonantExample = batch.find(p => p.name[0] && !FRENCH_VOWELS.has(p.name[0].toLowerCase()));
      [vowelExample, consonantExample].filter(Boolean).slice(0, 2).forEach(p => {
        if (aliasMap[p.amm]?.length) {
          console.log(`   ${p.name} → [${aliasMap[p.amm].join(', ')}]`);
        }
      });

      // Comptage
      const batchAliases = Object.values(aliasMap).reduce((s, a) => s + a.length, 0);
      totalAliasesGenerated += batchAliases;

      if (!DRY_RUN) {
        // Mise à jour en DB : concurrence limitée à 10 requêtes simultanées
        const CONCURRENT_UPDATES = 10;
        for (let u = 0; u < batch.length; u += CONCURRENT_UPDATES) {
          const chunk = batch.slice(u, u + CONCURRENT_UPDATES);
          const updateResults = await Promise.all(
            chunk.map(product => {
              const aliases = aliasMap[product.amm] || [];
              return supabase
                .from('phytosanitary_products')
                .update({ speech_aliases: aliases })
                .eq('amm', product.amm)
                .then(({ error }) => ({ amm: product.amm, error }));
            })
          );
          for (const r of updateResults) {
            if (r.error) {
              console.error(`\n  ❌ Erreur update ${r.amm}: ${r.error.message}`);
              totalErrors++;
            } else {
              totalUpdated++;
            }
          }
        }
      } else {
        totalUpdated += batch.length;
      }

      // Usage tokens (info)
      const usage = response.usage;
      if (usage) {
        process.stdout.write(
          `   💰 Tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out\n`
        );
      }

    } catch (err) {
      console.error(`\n  ❌ Erreur batch ${batchNum}: ${err.message}`);
      totalErrors++;
    }

    // Pause pour éviter le rate limit OpenAI
    if (i + GPT_BATCH_SIZE < products.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  return { totalUpdated, totalAliasesGenerated, totalErrors };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Thomas - Génération des speech aliases phytosanitaires');
  console.log(`   Modèle: ${GPT_MODEL}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY-RUN (lecture seule)' : 'PRODUCTION (écriture en DB)'}`);
  console.log(`   Reset: ${RESET ? 'OUI (traite tous les produits)' : 'NON (seulement speech_aliases vides)'}`);
  if (LIMIT) console.log(`   Limite: ${LIMIT} produits`);
  console.log('');

  const startTime = Date.now();

  const products = await fetchAllProducts();

  if (products.length === 0) {
    console.log('✅ Aucun produit à traiter (tous ont déjà des speech_aliases).');
    console.log('   Utilisez --reset pour régénérer tous les aliases.');
    return;
  }

  console.log(`\n✅ ${products.length} produits à traiter\n`);

  const { totalUpdated, totalAliasesGenerated, totalErrors } = await processProducts(products);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Produits traités : ${totalUpdated}`);
  console.log(`   Aliases générés  : ${totalAliasesGenerated}`);
  console.log(`   Erreurs          : ${totalErrors}`);
  console.log(`   Durée            : ${elapsed} min`);
  if (DRY_RUN) console.log('\n   ⚠️  Aucune écriture (--dry-run). Relancez sans --dry-run pour appliquer.');
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
