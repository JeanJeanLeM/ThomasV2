import { agricultureGlossary, normalizeGlossaryTerms } from '../../shared/agricultureGlossary';

/**
 * Service centralisé pour fournir les termes agricoles utilisés
 * afin d'améliorer les prompts Whisper côté app et edge function.
 */
export class AgricultureGlossaryService {
  private static cachedCoreTerms: string[] | null = null;

  static async getCoreTerms(): Promise<string[]> {
    if (!this.cachedCoreTerms) {
      this.cachedCoreTerms = normalizeGlossaryTerms(agricultureGlossary);
    }
    return this.cachedCoreTerms;
  }

  static async buildVocabulary(termLists: Array<string[] | undefined> = []): Promise<string[]> {
    const coreTerms = await this.getCoreTerms();
    const merged = [
      ...coreTerms,
      ...termLists.flatMap(list => list ?? []),
    ];
    return normalizeGlossaryTerms(merged);
  }
}

