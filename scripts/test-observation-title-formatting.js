/**
 * Script de test pour le formatage des titres d'observations
 * 
 * Teste que les différents formats de titres sont correctement parsés et formatés
 * selon le standard: "Observation [type/ravageur] [culture]"
 */

// Simuler les fonctions (en production, elles seraient importées de observationFormatters.ts)
function parseObservationTitle(title) {
  const result = {
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

function formatObservationTitle(title) {
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

// =====================================
// DONNÉES DE TEST
// =====================================

const testCases = [
  // Format problématique actuel (texte libre)
  {
    input: "J'ai observé quelque chose sur tomates",
    expected: "Observation tomates",
    category: "Format texte libre avec terme générique"
  },
  {
    input: "J'ai observé des pucerons sur tomates",
    expected: "Observation pucerons tomates",
    category: "Format texte libre avec J'ai observé"
  },
  {
    input: "J'ai observé des dégâts de mineuse sur les tomates",
    expected: "Observation dégâts mineuse tomates",
    category: "Format texte libre avec J'ai observé"
  },
  {
    input: "J'ai vu des pucerons sur courgettes",
    expected: "Observation pucerons courgettes",
    category: "Format texte libre avec J'ai vu"
  },
  {
    input: "J'ai remarqué un jaunissement sur laitues",
    expected: "Observation jaunissement laitues",
    category: "Format texte libre avec J'ai remarqué"
  },
  
  // Format correct du chat (déjà bon)
  {
    input: "pucerons - tomates",
    expected: "Observation pucerons tomates",
    category: "Format chat correct"
  },
  {
    input: "mildiou - courgettes",
    expected: "Observation mildiou courgettes",
    category: "Format chat correct"
  },
  {
    input: "jaunissement - laitues",
    expected: "Observation jaunissement laitues",
    category: "Format chat correct"
  },
  
  // Format avec "sur" sans J'ai observé
  {
    input: "pucerons sur tomates",
    expected: "Observation pucerons tomates",
    category: "Format simple avec 'sur'"
  },
  {
    input: "mildiou sur les courgettes",
    expected: "Observation mildiou courgettes",
    category: "Format simple avec 'sur'"
  },
  
  // Cas limites
  {
    input: "Observation pucerons tomates",
    expected: "Observation pucerons tomates",
    category: "Déjà formaté correctement"
  },
  {
    input: "problème non spécifique",
    expected: "Observation problème non spécifique",
    category: "Titre sans structure claire"
  },
  
  // Tests termes génériques
  {
    input: "J'ai observé quelque chose sur serres",
    expected: "Observation serres",
    category: "Terme générique filtré"
  },
  {
    input: "rien - tomates",
    expected: "Observation tomates",
    category: "Terme générique filtré (format chat)"
  },
  {
    input: "quelque chose - courgettes",
    expected: "Observation courgettes",
    category: "Terme générique filtré (format chat)"
  }
];

// =====================================
// EXÉCUTION DES TESTS
// =====================================

console.log('🧪 TEST DU FORMATAGE DES TITRES D\'OBSERVATIONS\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = formatObservationTitle(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`\n✅ Test ${index + 1} - ${testCase.category}`);
  } else {
    failed++;
    console.log(`\n❌ Test ${index + 1} - ${testCase.category}`);
  }
  
  console.log(`   Entrée:   "${testCase.input}"`);
  console.log(`   Attendu:  "${testCase.expected}"`);
  console.log(`   Résultat: "${result}"`);
  
  // Debug parsing
  const parsed = parseObservationTitle(testCase.input);
  console.log(`   Parsé:    issue="${parsed.issue || 'N/A'}" | crop="${parsed.crop || 'N/A'}"`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RÉSULTATS: ${passed} tests réussis, ${failed} tests échoués sur ${testCases.length} total`);

if (failed === 0) {
  console.log('\n🎉 TOUS LES TESTS ONT RÉUSSI!\n');
  process.exit(0);
} else {
  console.log('\n⚠️ CERTAINS TESTS ONT ÉCHOUÉ\n');
  process.exit(1);
}

