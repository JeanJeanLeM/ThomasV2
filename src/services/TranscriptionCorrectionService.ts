interface CorrectionRule {
  id: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface AppliedCorrection {
  id: string;
  before: string;
  after: string;
  occurrences: number;
  description: string;
}

export interface CorrectionOutcome {
  correctedText: string;
  appliedCorrections: AppliedCorrection[];
}

const CORRECTION_RULES: CorrectionRule[] = [
  {
    id: 'effeuiller-verbe',
    pattern: /\bfeuiller\b/gi,
    replacement: 'effeuiller',
    description: 'Corrige le verbe effeuiller souvent transcrit sans le préfixe.',
  },
  {
    id: 'effeuille-participe',
    pattern: /\bfeuill[ée]\b/gi,
    replacement: 'effeuillé',
    description: 'Corrige le participe passé effeuillé.',
  },
  {
    id: 'palisser',
    pattern: /\bpas\s+lisser\b/gi,
    replacement: 'palisser',
    description: 'Corrige la pratique de palissage.',
  },
  {
    id: 'etables',
    pattern: /\bles\s+tables\b/gi,
    replacement: 'étables',
    description: 'Corrige la mention des étables.',
  },
];

export class TranscriptionCorrectionService {
  static apply(text: string): CorrectionOutcome {
    if (!text) {
      return {
        correctedText: text,
        appliedCorrections: [],
      };
    }

    let corrected = text;
    const applied: AppliedCorrection[] = [];

    for (const rule of CORRECTION_RULES) {
      const matches = corrected.match(rule.pattern);
      if (!matches) {
        continue;
      }

      const before = corrected;
      corrected = corrected.replace(rule.pattern, rule.replacement);
      applied.push({
        id: rule.id,
        before,
        after: corrected,
        occurrences: matches.length,
        description: rule.description,
      });
    }

    return {
      correctedText: corrected,
      appliedCorrections: applied,
    };
  }
}

