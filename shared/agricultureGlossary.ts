export const agricultureGlossary: string[] = [
  'agriculture biologique',
  'apport de compost',
  'bâchage',
  'binage',
  'buttage',
  'butter',
  'chapelle',
  'désherbage mécanique',
  'effeuillage',
  'effeuiller',
  'étable',
  'étables',
  'fertigation',
  'fertilisation organique',
  'filet anti-insectes',
  'filet insect-proof',
  'irrigation goutte à goutte',
  'lagunage',
  'paillage',
  'palissage',
  'palisser',
  'pain de culture',
  'planche permanente',
  'planches',
  'pépinière',
  'protection biologique intégrée',
  'P17',
  'P19',
  'P21',
  'récolte manuelle',
  'semis direct',
  'serre froide',
  'serre tunnel',
  'tuteurage',
  'voile d\'hivernage',
];

export const agricultureGlossarySet = new Set(
  agricultureGlossary.map(term => term.toLowerCase())
);

export function normalizeGlossaryTerms(terms: string[]): string[] {
  return Array.from(
    new Set(
      terms
        .map(term => term.trim())
        .filter(Boolean)
        .map(term => term.toLowerCase())
    )
  );
}
