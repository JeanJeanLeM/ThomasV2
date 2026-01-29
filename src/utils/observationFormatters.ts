/**
 * Utilitaires de formatage pour les observations
 * Assure la cohérence du format des titres d'observations
 */

/**
 * Extrait les informations d'un titre d'observation au format libre
 * et retourne un objet structuré
 */
export interface ParsedObservation {
  issue?: string;  // Ce qui a été observé (ravageur, maladie, problème)
  crop?: string;   // Culture concernée
  location?: string; // Localisation
  rawTitle: string; // Titre original
}

/**
 * Parse un titre d'observation pour en extraire les composants
 * Gère plusieurs formats:
 * - "J'ai observé des pucerons sur tomates"
 * - "pucerons - tomates"
 * - "Observation pucerons tomates"
 */
export function parseObservationTitle(title: string): ParsedObservation {
  const result: ParsedObservation = {
    rawTitle: title,
  };

  // Format déjà correct: "issue - crop"
  if (title.includes(' - ')) {
    const [issue, crop] = title.split(' - ').map(s => s.trim());
    result.issue = issue;
    result.crop = crop;
    return result;
  }

  // Format texte libre: "J'ai observé [issue] sur [crop]"
  // Pattern 1: "J'ai [verbe] [articles optionnels] [issue] sur [articles optionnels] [crop]"
  const pattern1 = /^j'ai\s+(?:observé|vu|remarqué|constaté)\s+(?:des?|les?|un|une)?\s*(.+?)\s+sur\s+(?:les?|des?)?\s*(.+)$/i;
  let match = title.match(pattern1);
  if (match && match[1] && match[2]) {
    result.issue = match[1].trim();
    result.crop = match[2].trim();
    return result;
  }

  // Pattern 2: "[issue] sur [crop]" (sans J'ai)
  const pattern2 = /^(.+?)\s+sur\s+(?:les?|des?)?\s*(.+)$/i;
  match = title.match(pattern2);
  if (match && match[1] && match[2]) {
    // Vérifier que ce n'est pas un pattern "J'ai..." qui n'a pas matché avant
    if (!match[1].toLowerCase().startsWith("j'ai")) {
      result.issue = match[1].trim();
      result.crop = match[2].trim();
      return result;
    }
  }

  return result;
}

/**
 * Formate un titre d'observation selon le standard
 * Format: "Observation [type] [culture]"
 * Exemples:
 * - "Observation pucerons tomates"
 * - "Observation mildiou courgettes"
 * - "Observation jaunissement laitues"
 */
export function formatObservationTitle(title: string, category?: string): string {
  const parsed = parseObservationTitle(title);

  // Si on a réussi à parser issue et crop, créer le format standard
  if (parsed.issue && parsed.crop) {
    // Nettoyer les articles et prépositions
    const cleanIssue = parsed.issue
      .replace(/^(des?|les?|un|une)\s+/i, '')
      .replace(/\s+(de|du|des)\s+/gi, ' ')
      .trim();
    
    const cleanCrop = parsed.crop
      .replace(/^(des?|les?|un|une)\s+/i, '')
      .replace(/\s+(de|du|des)\s+/gi, ' ')
      .trim();

    // Filtrer les termes génériques non informatifs
    const isGenericIssue = /^(quelque chose|rien|chose|truc|machin|problème)$/i.test(cleanIssue);
    
    if (isGenericIssue) {
      // Si l'issue est générique, ne garder que la culture
      return `Observation ${cleanCrop}`;
    }

    return `Observation ${cleanIssue} ${cleanCrop}`;
  }

  // Format "issue - crop" déjà bon, juste ajouter "Observation"
  if (title.includes(' - ')) {
    const [issue, crop] = title.split(' - ').map(s => s.trim());
    
    // Filtrer les termes génériques
    const isGenericIssue = /^(quelque chose|rien|chose|truc|machin|problème)$/i.test(issue);
    
    if (isGenericIssue) {
      return `Observation ${crop}`;
    }
    
    return `Observation ${issue} ${crop}`;
  }

  // Si on ne peut pas parser, retourner le titre original avec "Observation" devant si absent
  if (!title.toLowerCase().startsWith('observation')) {
    return `Observation ${title}`;
  }

  return title;
}

/**
 * Formate un titre court pour affichage compact
 * Format: "[type] - [culture]"
 * Exemples:
 * - "pucerons - tomates"
 * - "mildiou - courgettes"
 */
export function formatObservationTitleShort(title: string): string {
  const parsed = parseObservationTitle(title);

  if (parsed.issue && parsed.crop) {
    // Nettoyer les articles
    const cleanIssue = parsed.issue
      .replace(/^(des?|les?|un|une)\s+/i, '')
      .trim();
    
    const cleanCrop = parsed.crop
      .replace(/^(des?|les?|un|une)\s+/i, '')
      .trim();

    return `${cleanIssue} - ${cleanCrop}`;
  }

  // Format déjà court
  if (title.includes(' - ') && !title.toLowerCase().startsWith('observation')) {
    return title;
  }

  // Retirer "Observation" au début si présent
  return title.replace(/^observation\s+/i, '').trim();
}

/**
 * Génère un titre d'observation structuré à partir de composants
 */
export function buildObservationTitle(issue: string, crop: string): string {
  const cleanIssue = issue.replace(/^(des?|les?|un|une)\s+/i, '').trim();
  const cleanCrop = crop.replace(/^(des?|les?|un|une)\s+/i, '').trim();
  
  return `Observation ${cleanIssue} ${cleanCrop}`;
}

/**
 * Capitalise la première lettre d'une chaîne
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

