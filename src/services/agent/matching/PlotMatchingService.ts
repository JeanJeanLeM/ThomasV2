import { SupabaseClient } from '@supabase/supabase-js';
import { 
  PlotMatch, 
  PlotWithDetails,
  SurfaceUnitWithDetails,
  FarmContext 
} from '../types/AgentTypes';

/**
 * Service de matching intelligent des parcelles
 * Support expressions naturelles françaises avec fuzzy matching
 * 
 * Patterns supportés:
 * - "serre 1", "tunnel nord", "plein champ 3"
 * - "planche 3 de la serre", "rang 2 du tunnel"
 * - Aliases personnalisés et mots-clés LLM
 */
export class PlotMatchingService {
  private matchingCache = new Map<string, PlotMatch[]>();
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  constructor(private supabase: SupabaseClient) {}

  /**
   * Matching principal des parcelles mentionnées dans le texte
   */
  async matchPlots(text: string, farmContext: FarmContext): Promise<PlotMatch[]> {
    const cacheKey = `${farmContext.id}_${text}`;
    
    // Vérifier cache pour performance
    if (this.matchingCache.has(cacheKey)) {
      return this.matchingCache.get(cacheKey)!;
    }

    console.log('🎯 Matching plots for text:', text);

    try {
      const matches: PlotMatch[] = [];

      // 1. Extraction des mentions de parcelles
      const plotMentions = this.extractPlotMentions(text);
      console.log('📋 Plot mentions found:', plotMentions);

      // 2. Matching pour chaque mention
      for (const mention of plotMentions) {
        const plotMatches = await this.fuzzyMatchPlots(mention, farmContext.plots);
        matches.push(...plotMatches);
      }

      // 3. Résolution hiérarchique (plots > surface_units)
      const resolvedMatches = this.resolveHierarchy(matches);

      // 4. Filtrage par confiance et dédoublonnage
      const finalMatches = this.filterAndDeduplicate(resolvedMatches);

      // Mise en cache
      this.matchingCache.set(cacheKey, finalMatches);

      console.log(`✅ Plot matching completed: ${finalMatches.length} matches found`);
      return finalMatches;

    } catch (error) {
      console.error('❌ Error in plot matching:', error);
      return [];
    }
  }

  /**
   * Extraction des mentions de parcelles avec patterns français
   */
  private extractPlotMentions(text: string): PlotMention[] {
    const mentions: PlotMention[] = [];
    const textLower = text.toLowerCase();

    // Pattern 1: serre|tunnel|plein champ + numéro/direction
    const mainPatterns = [
      /(?:serre|tunnel|plein\s+champ|pépinière|hydroponique)\s*(?:n°|#)?\s*(\d+|nord|sud|est|ouest|a|b|c)/gi,
      /(?:serre|tunnel)\s*(plastique|verre)?\s*(\d+|nord|sud|est|ouest)/gi
    ];

    mainPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mentions.push({
          text: match[0],
          type: 'plot_direct',
          confidence: 0.9,
          position: match.index
        });
      }
    });

    // Pattern 2: planche|rang + numéro + référence parcelle
    const hierarchicalPatterns = [
      /planche\s*(\d+)(?:\s+(?:de\s+la\s+|du\s+|dans\s+(?:la\s+|le\s+)?)?(serre|tunnel|plein\s+champ)?\s*(\d+|nord|sud|est|ouest)?)?/gi,
      /rang\s*(\d+)(?:\s+(?:de\s+la\s+|du\s+|dans\s+(?:la\s+|le\s+)?)?(serre|tunnel)?\s*(\d+)?)?/gi
    ];

    hierarchicalPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mentions.push({
          text: match[0],
          type: 'surface_unit',
          parent_reference: match[2] ? `${match[2]} ${match[3] || ''}`.trim() : undefined,
          confidence: 0.8,
          position: match.index
        });
      }
    });

    // Pattern 3: Références génériques
    const genericPatterns = [
      /(?:parcelle|zone)\s*(?:n°|#)?\s*(\d+|[a-z])/gi,
      /(?:bloc|secteur)\s*(\d+|[a-z])/gi
    ];

    genericPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mentions.push({
          text: match[0],
          type: 'generic',
          confidence: 0.7,
          position: match.index
        });
      }
    });

    return mentions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Fuzzy matching avec algorithme de scoring
   */
  private async fuzzyMatchPlots(
    mention: PlotMention, 
    plots: PlotWithDetails[]
  ): Promise<PlotMatch[]> {
    
    const matches: PlotMatch[] = [];
    const mentionText = mention.text.toLowerCase();

    for (const plot of plots) {
      if (!plot.is_active) continue;

      // 1. Exact match sur nom
      if (plot.name.toLowerCase() === mentionText) {
        matches.push({
          plot,
          confidence: 1.0,
          match_type: 'exact'
        });
        continue;
      }

      // 2. Partial match sur nom
      if (plot.name.toLowerCase().includes(mentionText) || 
          mentionText.includes(plot.name.toLowerCase())) {
        matches.push({
          plot,
          confidence: 0.9,
          match_type: 'partial'
        });
        continue;
      }

      // 3. Matching sur aliases
      const aliasMatch = this.matchAliases(mentionText, plot.aliases);
      if (aliasMatch.confidence > 0) {
        matches.push({
          plot,
          confidence: aliasMatch.confidence,
          match_type: 'alias'
        });
        continue;
      }

      // 4. Matching sur LLM keywords
      const keywordMatch = this.matchKeywords(mentionText, plot.llm_keywords);
      if (keywordMatch.confidence > 0) {
        matches.push({
          plot,
          confidence: keywordMatch.confidence,
          match_type: 'keyword'
        });
        continue;
      }

      // 5. Fuzzy match avec Levenshtein
      const levenshteinMatch = this.levenshteinMatch(mentionText, plot.name);
      if (levenshteinMatch.confidence >= this.CONFIDENCE_THRESHOLD) {
        matches.push({
          plot,
          confidence: levenshteinMatch.confidence,
          match_type: 'fuzzy'
        });
      }

      // 6. Matching hiérarchique pour surface units
      if (mention.type === 'surface_unit') {
        const surfaceMatches = this.matchSurfaceUnits(mention, plot);
        matches.push(...surfaceMatches);
      }
    }

    return matches.filter(match => match.confidence >= this.CONFIDENCE_THRESHOLD)
                 .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Matching sur aliases avec scoring
   */
  private matchAliases(text: string, aliases: string[]): { confidence: number } {
    if (!aliases || aliases.length === 0) {
      return { confidence: 0 };
    }

    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      
      if (aliasLower === text) {
        return { confidence: 0.95 };
      }
      
      if (aliasLower.includes(text) || text.includes(aliasLower)) {
        return { confidence: 0.85 };
      }
    }

    return { confidence: 0 };
  }

  /**
   * Matching sur mots-clés LLM
   */
  private matchKeywords(text: string, keywords: string[]): { confidence: number } {
    if (!keywords || keywords.length === 0) {
      return { confidence: 0 };
    }

    let bestConfidence = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      
      if (text.includes(keywordLower) || keywordLower.includes(text)) {
        bestConfidence = Math.max(bestConfidence, 0.75);
      }
    }

    return { confidence: bestConfidence };
  }

  /**
   * Fuzzy matching avec distance de Levenshtein
   */
  private levenshteinMatch(text1: string, text2: string): { confidence: number } {
    const distance = this.levenshteinDistance(text1.toLowerCase(), text2.toLowerCase());
    const maxLength = Math.max(text1.length, text2.length);
    
    if (maxLength === 0) return { confidence: 0 };
    
    const similarity = 1 - (distance / maxLength);
    return { confidence: Math.max(0, similarity) };
  }

  /**
   * Calcul de la distance de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Matching des surface units (planches, rangs)
   */
  private matchSurfaceUnits(mention: PlotMention, plot: PlotWithDetails): PlotMatch[] {
    const matches: PlotMatch[] = [];
    
    if (!plot.surface_units || plot.surface_units.length === 0) {
      return matches;
    }

    const mentionText = mention.text.toLowerCase();
    
    for (const surfaceUnit of plot.surface_units) {
      if (!surfaceUnit.is_active) continue;

      // Extraction du numéro de la mention
      const numberMatch = mentionText.match(/(\d+)/);
      if (!numberMatch) continue;

      const mentionNumber = numberMatch[1];
      const surfaceUnitName = surfaceUnit.name.toLowerCase();

      // Match direct sur le numéro
      if (surfaceUnitName.includes(mentionNumber)) {
        matches.push({
          plot,
          surface_units: [surfaceUnit],
          confidence: 0.9,
          match_type: 'surface_unit_direct'
        });
      }

      // Match sur aliases de surface unit
      const aliasMatch = this.matchAliases(mentionText, surfaceUnit.aliases);
      if (aliasMatch.confidence > 0) {
        matches.push({
          plot,
          surface_units: [surfaceUnit],
          confidence: aliasMatch.confidence * 0.9, // Légèrement moins confiant
          match_type: 'surface_unit_alias'
        });
      }
    }

    return matches;
  }

  /**
   * Résolution hiérarchique plots → surface_units
   */
  private resolveHierarchy(matches: PlotMatch[]): PlotMatch[] {
    // Grouper par plot et consolider les surface_units
    const plotGroups = new Map<number, PlotMatch[]>();
    
    for (const match of matches) {
      const plotId = match.plot.id;
      if (!plotGroups.has(plotId)) {
        plotGroups.set(plotId, []);
      }
      plotGroups.get(plotId)!.push(match);
    }

    const resolvedMatches: PlotMatch[] = [];

    for (const [plotId, groupMatches] of Array.from(plotGroups.entries())) {
      // Prendre le match avec la meilleure confiance pour le plot
      const bestPlotMatch = groupMatches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      // Consolider toutes les surface_units trouvées
      const allSurfaceUnits: SurfaceUnitWithDetails[] = [];
      groupMatches.forEach(match => {
        if (match.surface_units) {
          allSurfaceUnits.push(...match.surface_units);
        }
      });

      // Dédoublonner les surface_units
      const uniqueSurfaceUnits = allSurfaceUnits.filter((unit, index, arr) => 
        arr.findIndex(u => u.id === unit.id) === index
      );

      resolvedMatches.push({
        plot: bestPlotMatch.plot,
        surface_units: uniqueSurfaceUnits.length > 0 ? uniqueSurfaceUnits : undefined,
        confidence: bestPlotMatch.confidence,
        match_type: bestPlotMatch.match_type
      });
    }

    return resolvedMatches;
  }

  /**
   * Filtrage par confiance et dédoublonnage
   */
  private filterAndDeduplicate(matches: PlotMatch[]): PlotMatch[] {
    // Filtrer par confiance
    const validMatches = matches.filter(match => 
      match.confidence >= this.CONFIDENCE_THRESHOLD
    );

    // Dédoublonner par plot_id
    const deduped = validMatches.filter((match, index, arr) => 
      arr.findIndex(m => m.plot.id === match.plot.id) === index
    );

    // Trier par confiance décroissante
    return deduped.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Génération de suggestions si pas de match
   */
  generatePlotSuggestions(farmContext: FarmContext, limit = 5): string[] {
    return farmContext.plots
      .filter(plot => plot.is_active)
      .slice(0, limit)
      .map(plot => {
        const surfaceCount = plot.surface_units.length;
        const details = surfaceCount > 0 ? ` (${surfaceCount} unités)` : '';
        return `${plot.name}${details}`;
      });
  }

  /**
   * Validation d'une correspondance plot
   */
  validatePlotMatch(match: PlotMatch): boolean {
    return (
      match.plot.is_active &&
      match.confidence >= this.CONFIDENCE_THRESHOLD &&
      (!match.surface_units || match.surface_units.every(su => su.is_active))
    );
  }

  /**
   * Stats du matching pour monitoring
   */
  getMatchingStats(): { cacheSize: number; avgConfidence?: number } {
    const allMatches = Array.from(this.matchingCache.values()).flat();
    const avgConfidence = allMatches.length > 0 
      ? allMatches.reduce((sum, m) => sum + m.confidence, 0) / allMatches.length
      : undefined;

    return {
      cacheSize: this.matchingCache.size,
      avgConfidence
    };
  }

  /**
   * Nettoyage du cache
   */
  clearCache(): void {
    this.matchingCache.clear();
    console.log('🗑️ Plot matching cache cleared');
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface PlotMention {
  text: string;
  type: 'plot_direct' | 'surface_unit' | 'generic';
  parent_reference?: string; // Pour "planche 3 du tunnel 1"
  confidence: number;
  position: number;
}
