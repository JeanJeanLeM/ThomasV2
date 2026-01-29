import { SupabaseClient } from '@supabase/supabase-js';
import { 
  MaterialMatch, 
  MaterialWithKeywords,
  FarmContext 
} from '../types/AgentTypes';

/**
 * Service de matching intelligent des matériels
 * Utilise LLM keywords et catégorisation pour matching précis
 * 
 * Stratégies de matching:
 * 1. Exact match sur nom
 * 2. LLM keyword matching (synonymes intelligents)
 * 3. Category-based matching
 * 4. Fuzzy matching avec Levenshtein
 * 5. Suggestions contextuelles
 */
export class MaterialMatchingService {
  private matchingCache = new Map<string, MaterialMatch[]>();
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  constructor(private supabase: SupabaseClient) {}

  /**
   * Matching principal des matériels mentionnés
   */
  async matchMaterials(text: string, farmContext: FarmContext): Promise<MaterialMatch[]> {
    const cacheKey = `${farmContext.id}_${text}`;
    
    // Cache pour performance
    if (this.matchingCache.has(cacheKey)) {
      return this.matchingCache.get(cacheKey)!;
    }

    console.log('🔧 Matching materials for text:', text);

    try {
      const matches: MaterialMatch[] = [];

      // 1. Extraction des mentions de matériel
      const materialMentions = this.extractMaterialMentions(text);
      console.log('🚜 Material mentions found:', materialMentions);

      // 2. Matching pour chaque mention
      for (const mention of materialMentions) {
        const materialMatches = await this.findMatches(mention, farmContext.materials);
        matches.push(...materialMatches);
      }

      // 3. Dédoublonnage et tri
      const finalMatches = this.filterAndDeduplicate(matches);

      // Mise en cache
      this.matchingCache.set(cacheKey, finalMatches);

      console.log(`✅ Material matching completed: ${finalMatches.length} matches found`);
      return finalMatches;

    } catch (error) {
      console.error('❌ Error in material matching:', error);
      return [];
    }
  }

  /**
   * Extraction des mentions de matériel
   */
  private extractMaterialMentions(text: string): string[] {
    const mentions: string[] = [];
    const textLower = text.toLowerCase();

    // Patterns de matériel agricole français
    const materialPatterns = [
      // Tracteurs
      /(?:tracteur|tractor)(?:\s+\w+)*(?:\s+\d+)?/gi,
      /(?:john\s+deere|massey\s+ferguson|new\s+holland|case|fendt|claas)(?:\s+\w+)*(?:\s+\d+)?/gi,
      
      // Outils tracteur
      /(?:charrue|cultivateur|herse|semoir|épandeur|faucheuse|andaineur)/gi,
      /(?:pulvérisateur|atomiseur|distributeur|broyeur)/gi,
      
      // Outils manuels
      /(?:bêche|râteau|serfouette|arrosoir|sécateur|transplantoir)/gi,
      /(?:brouette|panier|caisse|seau)/gi,
      
      // Équipement général
      /(?:tuyau|bâche|voile|tunnel|serre)(?:\s+\w+)*/gi
    ];

    materialPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const mention = match[0].trim();
        if (mention.length > 2) { // Éviter les matches trop courts
          mentions.push(mention);
        }
      }
    });

    // Suppression des doublons
    return Array.from(new Set(mentions));
  }

  /**
   * Recherche de correspondances pour une mention
   */
  private async findMatches(
    mention: string, 
    materials: MaterialWithKeywords[]
  ): Promise<MaterialMatch[]> {
    
    const matches: MaterialMatch[] = [];
    const mentionLower = mention.toLowerCase();

    for (const material of materials) {
      if (!material.is_active) continue;

      let match: MaterialMatch | null = null;

      // 1. Exact match sur nom
      if (material.name.toLowerCase() === mentionLower) {
        match = {
          material,
          confidence: 1.0,
          match_method: 'exact'
        };
      }
      // 2. Partial match sur nom
      else if (material.name.toLowerCase().includes(mentionLower) || 
               mentionLower.includes(material.name.toLowerCase())) {
        match = {
          material,
          confidence: 0.9,
          match_method: 'partial'
        };
      }
      // 3. Match sur marque + modèle
      else if (this.matchBrandModel(mentionLower, material)) {
        match = {
          material,
          confidence: 0.95,
          match_method: 'brand_model'
        };
      }
      // 4. LLM keyword match
      else {
        const keywordResult = this.llmKeywordMatch(mentionLower, material);
        if (keywordResult.confidence > 0) {
          match = {
            material,
            confidence: keywordResult.confidence,
            match_method: keywordResult.match_method as any
          };
        }
      }

      if (match && match.confidence >= this.CONFIDENCE_THRESHOLD) {
        matches.push(match);
      }
    }

    return matches;
  }

  /**
   * Matching sur marque et modèle
   */
  private matchBrandModel(mention: string, material: MaterialWithKeywords): boolean {
    const brandModel = `${material.brand || ''} ${material.model || ''}`.toLowerCase().trim();
    
    if (brandModel.length === 0) return false;
    
    return mention.includes(brandModel) || brandModel.includes(mention);
  }

  /**
   * Matching sur mots-clés LLM avec logique intelligente
   */
  private llmKeywordMatch(mention: string, material: MaterialWithKeywords): { material: MaterialWithKeywords; confidence: number; match_method: string } {
    if (!material.llm_keywords || material.llm_keywords.length === 0) {
      return { material, confidence: 0, match_method: 'none' };
    }

    let bestConfidence = 0;

    for (const keyword of material.llm_keywords) {
      const keywordLower = keyword.toLowerCase();
      let confidence = 0;

      // Match exact sur keyword
      if (keywordLower === mention) {
        confidence = 0.9;
      }
      // Match partial
      else if (mention.includes(keywordLower) || keywordLower.includes(mention)) {
        confidence = 0.8;
      }
      // Match avec synonymes intégrés (les LLM keywords peuvent contenir des synonymes)
      else if (this.isSynonymMatch(mention, keywordLower)) {
        confidence = 0.75;
      }

      bestConfidence = Math.max(bestConfidence, confidence);
    }

    return {
      material,
      confidence: bestConfidence,
      match_method: bestConfidence > 0 ? 'llm_keyword' : 'none'
    };
  }

  /**
   * Détection de synonymes courants
   */
  private isSynonymMatch(mention: string, keyword: string): boolean {
    const synonymGroups = [
      ['tracteur', 'tractor', 'engin'],
      ['pulvérisateur', 'atomiseur', 'spray'],
      ['serfouette', 'binette', 'houe'],
      ['brouette', 'charriot', 'transport'],
      ['caisse', 'bac', 'conteneur', 'box']
    ];

    for (const group of synonymGroups) {
      if (group.includes(mention) && group.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Matching par catégorie quand mention générique
   */
  async matchByCategory(
    mention: string, 
    materials: MaterialWithKeywords[]
  ): Promise<MaterialMatch[]> {
    
    const categoryMapping: Record<string, string[]> = {
      'tracteurs': ['tracteur', 'tractor', 'engin'],
      'outils_tracteur': ['charrue', 'cultivateur', 'herse', 'semoir', 'pulvérisateur'],
      'outils_manuels': ['bêche', 'râteau', 'serfouette', 'sécateur'],
      'petit_equipement': ['arrosoir', 'brouette', 'caisse', 'panier']
    };

    const matches: MaterialMatch[] = [];
    const mentionLower = mention.toLowerCase();

    // Trouver la catégorie correspondante
    let targetCategory: string | null = null;
    for (const [category, keywords] of Object.entries(categoryMapping)) {
      if (keywords.some(keyword => mentionLower.includes(keyword))) {
        targetCategory = category;
        break;
      }
    }

    if (!targetCategory) return matches;

    // Récupérer tous les matériels de cette catégorie
    const categoryMaterials = materials.filter(m => 
      m.category === targetCategory && m.is_active
    );

    // Créer des matches avec confiance modérée
    for (const material of categoryMaterials) {
      matches.push({
        material,
        confidence: 0.7, // Confiance modérée pour match par catégorie
        match_method: 'category'
      });
    }

    return matches.slice(0, 3); // Limiter à 3 suggestions
  }

  /**
   * Génération de suggestions si aucun match
   */
  generateMaterialSuggestions(
    farmContext: FarmContext, 
    mention: string,
    limit = 5
  ): string[] {
    // Suggestions basées sur la catégorie inférée
    const categoryGuess = this.inferCategory(mention);
    
    const suggestions = farmContext.materials
      .filter(material => 
        material.is_active && 
        (material.category === categoryGuess || !categoryGuess)
      )
      .slice(0, limit)
      .map(material => {
        const details = material.brand && material.model 
          ? ` (${material.brand} ${material.model})` 
          : '';
        return `${material.name}${details}`;
      });

    // Ajouter suggestions génériques si pas assez de résultats
    if (suggestions.length < 3) {
      const genericSuggestions = [
        'Vérifier l\'orthographe du matériel',
        'Utiliser le nom complet (ex: "John Deere 6120")',
        'Consulter la liste des matériels dans Profil > Configuration'
      ];
      suggestions.push(...genericSuggestions.slice(0, 5 - suggestions.length));
    }

    return suggestions;
  }

  /**
   * Inférence de catégorie selon la mention
   */
  private inferCategory(mention: string): string | null {
    const mentionLower = mention.toLowerCase();
    
    if (['tracteur', 'tractor', 'engin'].some(k => mentionLower.includes(k))) {
      return 'tracteurs';
    }
    
    if (['charrue', 'cultivateur', 'herse', 'semoir', 'pulvérisateur'].some(k => mentionLower.includes(k))) {
      return 'outils_tracteur';
    }
    
    if (['bêche', 'râteau', 'serfouette', 'sécateur', 'transplantoir'].some(k => mentionLower.includes(k))) {
      return 'outils_manuels';
    }
    
    if (['arrosoir', 'brouette', 'caisse', 'panier', 'seau'].some(k => mentionLower.includes(k))) {
      return 'petit_equipement';
    }

    return null;
  }

  /**
   * Filtrage et dédoublonnage des matches
   */
  private filterAndDeduplicate(matches: MaterialMatch[]): MaterialMatch[] {
    // Filtrer par confiance
    const validMatches = matches.filter(match => 
      match.confidence >= this.CONFIDENCE_THRESHOLD
    );

    // Dédoublonner par material_id
    const deduped = validMatches.filter((match, index, arr) => 
      arr.findIndex(m => m.material.id === match.material.id) === index
    );

    // Trier par confiance décroissante
    return deduped.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Validation d'une correspondance matériel
   */
  validateMaterialMatch(match: MaterialMatch): boolean {
    return (
      match.material.is_active &&
      match.confidence >= this.CONFIDENCE_THRESHOLD &&
      match.material.name.length > 0
    );
  }

  /**
   * Recherche de matériel par ID (utilitaire)
   */
  async getMaterialById(materialId: number): Promise<MaterialWithKeywords | null> {
    try {
      const { data: material, error } = await this.supabase
        .from('materials')
        .select('id, name, category, brand, model, llm_keywords, is_active')
        .eq('id', materialId)
        .eq('is_active', true)
        .single();

      return error ? null : material;
    } catch (error) {
      console.error('❌ Error fetching material by ID:', error);
      return null;
    }
  }

  /**
   * Stats du matching pour monitoring
   */
  getMatchingStats(): { 
    cacheSize: number; 
    avgConfidence?: number;
    categoryDistribution: Record<string, number>;
  } {
    const allMatches = Array.from(this.matchingCache.values()).flat();
    const avgConfidence = allMatches.length > 0 
      ? allMatches.reduce((sum, m) => sum + m.confidence, 0) / allMatches.length
      : undefined;

    // Distribution par catégorie
    const categoryDistribution: Record<string, number> = {};
    allMatches.forEach(match => {
      const category = match.material.category;
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });

    return {
      cacheSize: this.matchingCache.size,
      avgConfidence,
      categoryDistribution
    };
  }

  /**
   * Nettoyage du cache
   */
  clearCache(): void {
    this.matchingCache.clear();
    console.log('🗑️ Material matching cache cleared');
  }

  /**
   * Mise à jour des LLM keywords pour un matériel
   */
  async updateMaterialKeywords(
    materialId: number, 
    newKeywords: string[]
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('materials')
        .update({ 
          llm_keywords: newKeywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', materialId);

      if (error) {
        throw new Error(`Échec mise à jour keywords: ${error.message}`);
      }

      // Invalider cache
      this.matchingCache.clear();
      
      console.log(`✅ LLM keywords updated for material ${materialId}`);
    } catch (error) {
      console.error('❌ Error updating material keywords:', error);
      throw error;
    }
  }

  /**
   * Analyse de la performance des keywords existants
   */
  async analyzeKeywordPerformance(farmId: number): Promise<KeywordPerformanceReport> {
    // TODO: Implémenter analyse des performances
    // Basée sur les logs de matching et succès des tools
    
    return {
      total_materials: 0,
      materials_with_keywords: 0,
      avg_keywords_per_material: 0,
      top_performing_keywords: [],
      suggestions: []
    };
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface KeywordPerformanceReport {
  total_materials: number;
  materials_with_keywords: number;
  avg_keywords_per_material: number;
  top_performing_keywords: Array<{
    keyword: string;
    usage_count: number;
    success_rate: number;
  }>;
  suggestions: string[];
}
