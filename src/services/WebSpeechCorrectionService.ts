/**
 * Service de post-correction contextuelle pour la dictée Web Speech.
 *
 * Deux niveaux de correction, appliqués dans l'ordre :
 *
 * 1. RÈGLES EXACTES (priorité absolue) — aliases phonétiques de l'utilisateur
 *    stockés en DB (table user_speech_corrections).
 *    Ex : "rideau mil" → "Ridomil Gold"
 *    Substitution par regex insensible à la casse, garantit 0 faux-positif.
 *
 * 2. FUZZY LEVENSHTEIN — vocabulaire contextuel de la ferme
 *    (produits, parcelles, cultures, matériaux, glossaire).
 *    N-grams glissants 1–4 mots, seuil de similarité ≥ 0.72.
 *    Pour les fautes d'orthographe légères ("ridomil" → "Ridomil Gold").
 *
 * Utilisé sur les segments "final" de la Web Speech API (toutes les ~2-4 s),
 * jamais sur l'interim (trop fréquent → scintillement).
 */

export interface WebSpeechContextualCorrection {
  original: string;    // Séquence de mots reconnue par Web Speech
  corrected: string;   // Nom propre correspondant dans le vocabulaire
  similarity: number;  // Score de similarité 0–1 (1.0 = règle exacte)
  gramSize: number;    // Nombre de mots dans le n-gram
  source: 'exact' | 'fuzzy'; // Origine de la correction
}

export interface WebSpeechCorrectionResult {
  correctedText: string;
  corrections: WebSpeechContextualCorrection[];
}

export interface WebSpeechVocabulary {
  products: string[];   // Noms de produits phytosanitaires
  plots: string[];      // Noms de parcelles + aliases + unités de surface
  cultures: string[];   // Noms de cultures
  materials: string[];  // Noms de matériaux/équipements
  glossary: string[];   // Termes agricoles génériques
}

/** Règle exacte (phonetic alias) chargée depuis user_speech_corrections. */
export interface ExactCorrectionRule {
  alias: string;         // Ce que la dictée transcrit (insensible à la casse)
  corrected_term: string; // Ce qu'il faut afficher
}

const SIMILARITY_THRESHOLD = 0.72;
const MAX_NGRAM_SIZE = 4;
const MIN_TERM_LENGTH = 4;      // Ne pas corriger des termes trop courts (risque de faux positifs)
const MIN_NGRAM_CHAR_LENGTH = 4; // Un n-gram doit faire au moins 4 caractères pour être éligible

// ─── Utilitaires ────────────────────────────────────────────────────────────

/**
 * Distance de Levenshtein entre deux chaînes (insensible à la casse).
 * Complexité : O(m × n) — négligeable pour des noms propres courts.
 */
function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[la][lb];
}

/**
 * Similarité normalisée 0–1 basée sur Levenshtein.
 * 1.0 = identique, 0.0 = totalement différent.
 */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1.0;
  if (al.length === 0 || bl.length === 0) return 0.0;
  const dist = levenshtein(al, bl);
  return 1 - dist / Math.max(al.length, bl.length);
}

/**
 * Normalise légèrement un terme pour la comparaison :
 * supprime les apostrophes, tirets, accents courants, espaces multiples.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`]/g, '') // apostrophes
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Nœud du vocabulaire ────────────────────────────────────────────────────

export interface VocabEntry {
  original: string;   // Forme originale (pour le remplacement dans le texte)
  normalized: string; // Forme normalisée (pour la comparaison)
  words: number;      // Nombre de mots (pour le filtre de taille de n-gram)
}

function buildVocabEntries(terms: string[]): VocabEntry[] {
  return terms
    .filter(t => t && t.trim().length >= MIN_TERM_LENGTH)
    .map(t => ({
      original: t.trim(),
      normalized: normalize(t.trim()),
      words: t.trim().split(/\s+/).length,
    }));
}

// ─── Service principal ───────────────────────────────────────────────────────

export class WebSpeechCorrectionService {
  /**
   * Assemble le vocabulaire depuis les différentes listes de la ferme.
   * Déduplique et filtre les termes trop courts.
   */
  static buildVocabulary(vocab: Partial<WebSpeechVocabulary>): VocabEntry[] {
    const all = [
      ...(vocab.products ?? []),
      ...(vocab.plots ?? []),
      ...(vocab.cultures ?? []),
      ...(vocab.materials ?? []),
      ...(vocab.glossary ?? []),
    ];
    // Dédupliquer (insensible à la casse)
    const seen = new Set<string>();
    const unique = all.filter(t => {
      const key = t.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return buildVocabEntries(unique);
  }

  /**
   * Corrige un texte en deux phases :
   * 1. Règles exactes (aliases phonétiques de l'utilisateur) — priorité absolue.
   * 2. Fuzzy Levenshtein sur le vocabulaire contextuel de la ferme.
   *
   * @param text         Texte brut issu de la Web Speech API (segment final)
   * @param vocabEntries Entrées préparées via buildVocabulary() (fuzzy)
   * @param exactRules   Aliases phonétiques chargés depuis user_speech_corrections
   * @returns            Texte corrigé + liste des corrections appliquées
   */
  static correct(
    text: string,
    vocabEntries: VocabEntry[],
    exactRules: ExactCorrectionRule[] = []
  ): WebSpeechCorrectionResult {
    if (!text) return { correctedText: text, corrections: [] };

    const allCorrections: WebSpeechContextualCorrection[] = [];
    let working = text;

    // ── Phase 1 : Règles exactes (insensibles à la casse) ───────────────────
    // Appliquées par ordre décroissant de longueur (priorité aux aliases longs)
    const sortedRules = [...exactRules].sort(
      (a, b) => b.alias.length - a.alias.length
    );

    for (const rule of sortedRules) {
      if (!rule.alias || !rule.corrected_term) continue;
      // Regex : \b + alias échappé + \b (insensible à la casse)
      const escaped = rule.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = working.match(regex);
      if (matches) {
        working = working.replace(regex, rule.corrected_term);
        allCorrections.push({
          original: matches[0],
          corrected: rule.corrected_term,
          similarity: 1.0,
          gramSize: rule.alias.split(/\s+/).length,
          source: 'exact',
        });
        console.log(
          `✅ [WEB-SPEECH-EXACT] "${matches[0]}" → "${rule.corrected_term}" (règle exacte)`
        );
      }
    }

    // ── Phase 2 : Fuzzy Levenshtein sur le vocabulaire ───────────────────────
    if (!vocabEntries.length) {
      return { correctedText: working, corrections: allCorrections };
    }

    const words = working.split(/(\s+)/);
    const tokens: string[] = [];
    const positions: number[] = [];
    for (let i = 0; i < words.length; i++) {
      if (words[i].trim().length > 0) {
        tokens.push(words[i]);
        positions.push(i);
      }
    }

    const replaced = new Set<number>();

    for (let size = Math.min(MAX_NGRAM_SIZE, tokens.length); size >= 1; size--) {
      for (let start = 0; start <= tokens.length - size; start++) {
        const covered = Array.from({ length: size }, (_, k) => start + k);
        if (covered.some(idx => replaced.has(idx))) continue;

        const ngram = tokens.slice(start, start + size).join(' ');
        const ngramNorm = normalize(ngram);

        if (ngramNorm.length < MIN_NGRAM_CHAR_LENGTH) continue;

        let bestScore = 0;
        let bestEntry: VocabEntry | null = null;

        for (const entry of vocabEntries) {
          if (Math.abs(entry.words - size) > 1) continue;
          if (entry.normalized === ngramNorm) continue;

          const score = similarity(ngramNorm, entry.normalized);
          if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
            bestScore = score;
            bestEntry = entry;
          }
        }

        if (bestEntry) {
          allCorrections.push({
            original: ngram,
            corrected: bestEntry.original,
            similarity: bestScore,
            gramSize: size,
            source: 'fuzzy',
          });
          words[positions[start]] = bestEntry.original;
          for (let k = 1; k < size; k++) {
            if (positions[start + k] > 0) {
              words[positions[start + k] - 1] = '';
            }
            words[positions[start + k]] = '';
          }
          covered.forEach(idx => replaced.add(idx));

          console.log(
            `✏️ [WEB-SPEECH-FUZZY] "${ngram}" → "${bestEntry.original}" (score: ${bestScore.toFixed(2)})`
          );
        }
      }
    }

    const correctedText = words.join('').replace(/\s{2,}/g, ' ').trim();
    return { correctedText, corrections: allCorrections };
  }
}
