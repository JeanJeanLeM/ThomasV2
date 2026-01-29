import { SupabaseClient } from '@supabase/supabase-js';
import { 
  QuantityMention,
  ConvertedQuantity,
  UserConversionWithAliases,
  FarmContext 
} from '../types/AgentTypes';

/**
 * Service de matching et conversion des quantités
 * Gère les conversions personnalisées utilisateur
 * 
 * Fonctionnalités:
 * - Extraction des quantités du texte français
 * - Application des conversions personnalisées  
 * - Support des aliases ("caisse", "caisses", "casier")
 * - Fallback vers unités standards
 * - Suggestions de nouvelles conversions
 */
export class ConversionMatchingService {
  private conversionCache = new Map<string, ConvertedQuantity[]>();

  constructor(private supabase: SupabaseClient) {}

  /**
   * Résolution des conversions pour toutes les quantités d'un texte
   */
  async resolveConversions(
    text: string,
    farmContext: FarmContext
  ): Promise<ConvertedQuantity[]> {
    
    const cacheKey = `${farmContext.id}_${text}`;
    
    // Cache pour performance
    if (this.conversionCache.has(cacheKey)) {
      return this.conversionCache.get(cacheKey)!;
    }

    console.log('🔄 Resolving conversions for text:', text);

    try {
      // 1. Extraction des quantités mentionnées
      const quantities = this.extractQuantities(text);
      console.log('📊 Quantities found:', quantities);

      if (quantities.length === 0) {
        return [];
      }

      // 2. Application des conversions
      const converted: ConvertedQuantity[] = [];
      
      for (const quantity of quantities) {
        const convertedQty = await this.applyConversion(quantity, farmContext);
        converted.push(convertedQty);
      }

      // Mise en cache
      this.conversionCache.set(cacheKey, converted);

      console.log(`✅ Conversions resolved: ${converted.length} quantities processed`);
      return converted;

    } catch (error) {
      console.error('❌ Error in conversion resolution:', error);
      return [];
    }
  }

  /**
   * Extraction des quantités du texte français avec matching CONTENANT + CULTURE/MATIÈRE
   */
  private extractQuantities(text: string): QuantityMentionExtended[] {
    const quantities: QuantityMention[] = [];
    
    // Patterns améliorés pour CONTENANT + CULTURE/MATIÈRE obligatoire
    const quantityPatterns = [
      // PRIORITÉ 1: Quantités avec contenant ET culture/matière (OBLIGATOIRE)
      /(\d+(?:[.,]\d+)?)\s*(caisse|caisses|casier|casiers|bac|bacs|panier|paniers|brouette|brouettes|sac|sacs)\s+de\s+(\w+(?:\s+\w+)*)/gi,
      
      // PRIORITÉ 2: Approximations avec contenant ET culture
      /(une?\s+dizaine|quelques|plusieurs|beaucoup)\s+(?:de\s+)?(caisse|panier|bac|brouette|sac)s?\s+de\s+(\w+(?:\s+\w+)*)/gi,
      
      // PRIORITÉ 3: Expressions françaises avec contenant ET culture
      /(un\s+plein|une\s+pleine)\s+(caisse|brouette|panier|sac)\s+de\s+(\w+(?:\s+\w+)*)/gi,
      
      // PRIORITÉ 4: Variations avec prépositions
      /(\d+(?:[.,]\d+)?)\s*(caisse|bac|panier|brouette|sac)s?\s+(en|avec|contenant)\s+(\w+(?:\s+\w+)*)/gi,
      
      // PRIORITÉ 5: Matières spécifiques (compost, terreau, engrais, etc.)
      /(\d+(?:[.,]\d+)?)\s*(brouette|sac|bac)s?\s+de\s+(compost|terreau|engrais|fumier|paille|copeaux?)/gi,
      
      // FALLBACK: Unités standards sans contenant (kg, litres, etc.)
      /(\d+(?:[.,]\d+)?)\s*(kg|gramme|grammes|g|litre|litres|l|unité|unités|pièce|pièces)\b/gi,
      
      // FALLBACK: Contenants seuls (score très faible - demander précision)
      /(\d+(?:[.,]\d+)?)\s*(caisse|caisses|panier|paniers|bac|bacs|brouette|brouettes|sac|sacs)\b(?!\s+de)/gi
    ];

    quantityPatterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = this.parseQuantityValue(match[1]);
        let unit: string;
        let item: string | undefined;
        let confidence: number;
        
        // Déterminer le type de pattern et extraire les données
        if (patternIndex === 0) {
          // Pattern principal: "5 caisses de tomates"
          unit = this.normalizeUnit(match[2]);
          item = match[3]?.toLowerCase().trim();
          confidence = 1.0;
        } else if (patternIndex === 1) {
          // Approximations: "quelques caisses de radis"
          const approximation = match[1].toLowerCase();
          unit = this.normalizeUnit(match[2]);
          item = match[3]?.toLowerCase().trim();
          confidence = 0.8;
          
          // Convertir approximations en valeurs
          const approxValue = this.parseApproximation(approximation);
          if (approxValue > 0) {
            value = approxValue;
          }
        } else if (patternIndex === 2) {
          // Expressions: "une pleine brouette de compost"
          unit = this.normalizeUnit(match[2]);
          item = match[3]?.toLowerCase().trim();
          confidence = 0.9;
        } else if (patternIndex === 3) {
          // Variations: "2 caisses contenant tomates"
          unit = this.normalizeUnit(match[2]);
          item = match[4]?.toLowerCase().trim();
          confidence = 0.85;
        } else if (patternIndex === 4) {
          // Matières spécifiques: "3 sacs de terreau"
          unit = this.normalizeUnit(match[2]);
          item = match[3]?.toLowerCase().trim();
          confidence = 0.95;
        } else if (patternIndex === 5) {
          // Unités standards: "5 kg", "2 litres"
          unit = this.normalizeUnit(match[2]);
          item = undefined; // Pas de culture spécifiée
          confidence = 0.9;
        } else {
          // Contenants seuls: "3 caisses" (sans culture)
          unit = this.normalizeUnit(match[2]);
          item = undefined;
          confidence = 0.3; // Score très faible - demander précision
        }

        if (value > 0) {
          quantities.push({
            value,
            unit,
            item,
            raw_text: match[0],
            position: match.index,
            pattern_type: patternIndex,
            confidence
          });
        }
      }
    });

    // Trier par confiance (meilleurs matches en premier)
    return quantities.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Application d'une conversion pour une quantité
   */
  private async applyConversion(
    quantity: QuantityMention,
    farmContext: FarmContext
  ): Promise<ConvertedQuantity> {
    
    // 1. Recherche conversion utilisateur personnalisée
    const userConversion = this.findUserConversion(quantity.unit, quantity.item, farmContext.conversions);

    if (userConversion) {
      console.log(`🔄 Applying user conversion: ${quantity.value} ${quantity.unit} → ${quantity.value * userConversion.conversion_value} ${userConversion.conversion_unit}`);
      
      return {
        original: quantity,
        converted: {
          value: quantity.value * userConversion.conversion_value,
          unit: userConversion.conversion_unit
        },
        confidence: 1.0,
        source: 'user_conversion',
        conversion_details: {
          conversion_id: userConversion.id,
          factor: userConversion.conversion_value,
          description: userConversion.description
        }
      };
    }

    // 2. Conversions standards si pas de conversion utilisateur
    const standardConversion = this.applyStandardConversion(quantity);
    if (standardConversion) {
      return standardConversion;
    }

    // 3. Pas de conversion possible - garder l'original
    console.log(`➡️ No conversion available for: ${quantity.value} ${quantity.unit}`);
    
    return {
      original: quantity,
      converted: {
        value: quantity.value,
        unit: quantity.unit
      },
      confidence: 0.8,
      source: 'no_conversion',
      suggestions: this.suggestNewConversion(quantity, farmContext)
    };
  }

  /**
   * Recherche d'une conversion utilisateur avec matching CONTENANT + CULTURE/MATIÈRE
   */
  private findUserConversion(
    unit: string, 
    item: string | undefined,
    conversions: UserConversionWithAliases[]
  ): UserConversionWithAliases | null {
    
    const unitLower = unit.toLowerCase();
    const itemLower = item?.toLowerCase();
    
    console.log(`🔍 Searching conversion for: container="${unitLower}", item="${itemLower}"`);
    
    // PRIORITÉ 1: Match exact complet (contenant + culture)
    if (itemLower) {
      for (const conversion of conversions) {
        if (!conversion.is_active) continue;
        
        const containerMatch = conversion.container_name.toLowerCase() === unitLower;
        const cropMatch = conversion.crop_name.toLowerCase() === itemLower;
        
        if (containerMatch && cropMatch) {
          console.log(`✅ Exact match found: ${conversion.container_name} + ${conversion.crop_name}`);
          return conversion;
        }
      }
    }
    
    // PRIORITÉ 2: Match avec aliases/slugs + culture
    if (itemLower) {
      for (const conversion of conversions) {
        if (!conversion.is_active) continue;
        
        const aliases = conversion.slugs || [];
        const containerAliasMatch = aliases.some(alias => alias.toLowerCase() === unitLower);
        const cropMatch = conversion.crop_name.toLowerCase() === itemLower;
        
        if (containerAliasMatch && cropMatch) {
          console.log(`✅ Alias match found: ${unitLower} (alias) + ${conversion.crop_name}`);
          return conversion;
        }
      }
    }
    
    // PRIORITÉ 3: Match avec variantes linguistiques (pluriel/singulier) + culture
    if (itemLower) {
      for (const conversion of conversions) {
        if (!conversion.is_active) continue;
        
        const containerVariant = this.matchLinguisticVariants(unitLower, conversion.container_name.toLowerCase());
        const cropVariant = this.matchLinguisticVariants(itemLower, conversion.crop_name.toLowerCase());
        
        if (containerVariant && cropVariant) {
          console.log(`✅ Linguistic variant match: ${conversion.container_name} + ${conversion.crop_name}`);
          return conversion;
        }
      }
    }
    
    // PRIORITÉ 4: Match partiel contenant + culture exacte
    if (itemLower) {
      for (const conversion of conversions) {
        if (!conversion.is_active) continue;
        
        const containerPartial = (
          conversion.container_name.toLowerCase().includes(unitLower) ||
          unitLower.includes(conversion.container_name.toLowerCase())
        );
        const cropMatch = conversion.crop_name.toLowerCase() === itemLower;
        
        if (containerPartial && cropMatch) {
          console.log(`✅ Partial container match: ${conversion.container_name} + ${conversion.crop_name}`);
          return conversion;
        }
      }
    }
    
    // PRIORITÉ 5: Fallback générique (contenant seul, sans culture spécifiée)
    // Score très faible - utilisé seulement si pas de culture détectée
    if (!itemLower) {
      for (const conversion of conversions) {
        if (!conversion.is_active) continue;
        
        // Match exact contenant sans culture spécifique
        if (conversion.container_name.toLowerCase() === unitLower && !conversion.crop_name) {
          console.log(`⚠️ Generic container match (no crop): ${conversion.container_name}`);
          return conversion;
        }
      }
    }
    
    console.log(`❌ No conversion found for: ${unitLower} + ${itemLower || 'no item'}`);
    return null;
  }
  
  /**
   * Matching des variantes linguistiques (pluriel/singulier, accents)
   */
  private matchLinguisticVariants(term1: string, term2: string): boolean {
    // Match exact
    if (term1 === term2) return true;
    
    // Normalisation des pluriels français
    const normalizations: Record<string, string> = {
      'caisses': 'caisse',
      'paniers': 'panier', 
      'bacs': 'bac',
      'brouettes': 'brouette',
      'sacs': 'sac',
      'tomates': 'tomate',
      'courgettes': 'courgette',
      'carottes': 'carotte',
      'radis': 'radis', // Invariant
      'épinards': 'épinard',
      'salades': 'salade'
    };
    
    const norm1 = normalizations[term1] || term1;
    const norm2 = normalizations[term2] || term2;
    
    return norm1 === norm2;
  }

  /**
   * Application de conversions standards
   */
  private applyStandardConversion(quantity: QuantityMention): ConvertedQuantity | null {
    const standardConversions: Record<string, { factor: number; unit: string }> = {
      // Conversions poids
      'g': { factor: 0.001, unit: 'kg' },
      'gramme': { factor: 0.001, unit: 'kg' },
      'grammes': { factor: 0.001, unit: 'kg' },
      
      // Conversions volume
      'ml': { factor: 0.001, unit: 'litre' },
      'l': { factor: 1, unit: 'litre' },
      'litres': { factor: 1, unit: 'litre' },
      
      // Conversions textuelles approximatives
      'dizaine': { factor: 10, unit: 'unités' },
      'quelques': { factor: 3, unit: 'unités' }, // Estimation
      'plusieurs': { factor: 5, unit: 'unités' }, // Estimation
      'beaucoup': { factor: 10, unit: 'unités' } // Estimation
    };

    const unitLower = quantity.unit.toLowerCase();
    const conversion = standardConversions[unitLower];
    
    if (conversion) {
      return {
        original: quantity,
        converted: {
          value: quantity.value * conversion.factor,
          unit: conversion.unit
        },
        confidence: 0.9,
        source: 'standard'
      };
    }

    return null;
  }

  /**
   * Parsing de la valeur numérique avec support français et approximations
   */
  private parseQuantityValue(valueStr: string): number {
    if (!valueStr) return 0;

    // Remplacer virgule par point pour parsing français
    const normalizedValue = valueStr.replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    
    return isNaN(parsed) ? 0 : parsed;
  }
  
  /**
   * Conversion des approximations françaises en valeurs numériques
   */
  private parseApproximation(approximation: string): number {
    const approxMap: Record<string, number> = {
      'une dizaine': 10,
      'un dizaine': 10,
      'dizaine': 10,
      'quelques': 3,
      'plusieurs': 5,
      'beaucoup': 10,
      'beaucoup de': 10,
      'un plein': 1,
      'une pleine': 1,
      'plein': 1,
      'pleine': 1
    };
    
    const normalized = approximation.toLowerCase().trim();
    return approxMap[normalized] || 1;
  }

  /**
   * Normalisation des unités françaises
   */
  private normalizeUnit(unit: string): string {
    if (!unit) return '';

    const unitLower = unit.toLowerCase();
    
    // Normalisation pluriels
    const normalizations: Record<string, string> = {
      'caisses': 'caisse',
      'paniers': 'panier',
      'bacs': 'bac',
      'grammes': 'gramme',
      'litres': 'litre',
      'kg': 'kg', // Déjà normalisé
      'g': 'gramme',
      'l': 'litre'
    };

    return normalizations[unitLower] || unitLower;
  }

  /**
   * Suggestion de nouvelle conversion si aucune trouvée (CONTENANT + CULTURE)
   */
  private suggestNewConversion(
    quantity: QuantityMention,
    farmContext: FarmContext
  ): string[] {
    const suggestions: string[] = [];
    
    if (quantity.item) {
      // Cas idéal: contenant + culture détectés
      suggestions.push(
        `Créer une conversion pour "${quantity.unit} de ${quantity.item}"`,
        `Exemple: 1 ${quantity.unit} de ${quantity.item} = ? kg`,
        'Cette conversion sera spécifique à cette combinaison contenant + culture'
      );
    } else {
      // Cas problématique: contenant seul
      suggestions.push(
        `⚠️ Conversion incomplète détectée: "${quantity.unit}"`,
        'Précisez la culture: "caisse de tomates", "sac de terreau", etc.',
        'Chaque combinaison contenant + culture a un poids différent'
      );
    }

    // Ajouter exemples basés sur les conversions existantes
    if (farmContext.conversions.length > 0) {
      const similarConversions = farmContext.conversions
        .filter(conv => conv.container_name.toLowerCase().includes(quantity.unit.toLowerCase()))
        .slice(0, 2)
        .map(conv => `${conv.container_name} de ${conv.crop_name} (${conv.conversion_value} ${conv.conversion_unit})`);
      
      if (similarConversions.length > 0) {
        suggestions.push(`Conversions similaires: ${similarConversions.join(', ')}`);
      }
    }

    suggestions.push('Aller dans Profil > Configuration > Conversions');
    return suggestions;
  }

  /**
   * Création d'une nouvelle conversion utilisateur
   */
  async createUserConversion(
    userId: string,
    farmId: number,
    containerName: string,
    cropName: string,
    conversionValue: number,
    conversionUnit: string,
    aliases: string[] = []
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_conversion_units')
        .insert({
          user_id: userId,
          farm_id: farmId,
          container_name: containerName,
          crop_name: cropName,
          conversion_value: conversionValue,
          conversion_unit: conversionUnit,
          slugs: aliases,
          is_active: true
        });

      if (error) {
        throw new Error(`Échec création conversion: ${error.message}`);
      }

      // Invalider cache
      this.conversionCache.clear();
      
      console.log(`✅ User conversion created: ${containerName} → ${conversionValue} ${conversionUnit}`);
    } catch (error) {
      console.error('❌ Error creating user conversion:', error);
      throw error;
    }
  }

  /**
   * Validation des conversions existantes
   */
  validateConversions(conversions: UserConversionWithAliases[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const conversion of conversions) {
      const issues: string[] = [];

      // Validations de base
      if (!conversion.container_name || conversion.container_name.length < 1) {
        issues.push('Nom du contenant manquant');
      }

      if (!conversion.crop_name || conversion.crop_name.length < 1) {
        issues.push('Nom de la culture manquant');
      }

      if (conversion.conversion_value <= 0) {
        issues.push('Valeur de conversion invalide');
      }

      if (!conversion.conversion_unit || conversion.conversion_unit.length < 1) {
        issues.push('Unité de conversion manquante');
      }

      results.push({
        conversion_id: conversion.id,
        valid: issues.length === 0,
        issues
      });
    }

    return results;
  }

  /**
   * Statistiques de conversion pour monitoring
   */
  getConversionStats(farmContext: FarmContext): ConversionStats {
    const activeConversions = farmContext.conversions.filter(c => c.is_active);
    
    // Groupement par culture
    const cropGroups = new Map<string, number>();
    activeConversions.forEach(conv => {
      const count = cropGroups.get(conv.crop_name) || 0;
      cropGroups.set(conv.crop_name, count + 1);
    });

    // Unités les plus utilisées
    const unitGroups = new Map<string, number>();
    activeConversions.forEach(conv => {
      const count = unitGroups.get(conv.conversion_unit) || 0;
      unitGroups.set(conv.conversion_unit, count + 1);
    });

    return {
      total_conversions: activeConversions.length,
      crops_with_conversions: cropGroups.size,
      conversions_by_crop: Object.fromEntries(cropGroups),
      most_used_units: Object.fromEntries(unitGroups),
      cache_size: this.conversionCache.size
    };
  }

  /**
   * Génération de suggestions pour conversions manquantes
   */
  generateConversionSuggestions(
    failedQuantities: QuantityMention[],
    farmContext: FarmContext
  ): ConversionSuggestion[] {
    
    const suggestions: ConversionSuggestion[] = [];

    for (const quantity of failedQuantities) {
      // Vérifier si déjà suggéré
      const existing = farmContext.conversions.find(conv => 
        conv.container_name.toLowerCase() === quantity.unit.toLowerCase()
      );

      if (!existing) {
        suggestions.push({
          container_name: quantity.unit,
          suggested_crop: quantity.item || 'général',
          priority: this.calculateSuggestionPriority(quantity),
          example_values: this.getExampleConversions(quantity.unit)
        });
      }
    }

    return suggestions;
  }

  /**
   * Calcul de la priorité d'une suggestion
   */
  private calculateSuggestionPriority(quantity: QuantityMention): 'low' | 'medium' | 'high' {
    const commonUnits = ['caisse', 'panier', 'bac', 'sac', 'kg', 'litre'];
    
    if (commonUnits.includes(quantity.unit.toLowerCase())) {
      return 'high';
    }
    
    if (quantity.item) { // Si culture spécifiée = plus important
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Exemples de conversions pour suggestions
   */
  private getExampleConversions(unit: string): Array<{ value: number; unit: string }> {
    const examples: Record<string, Array<{ value: number; unit: string }>> = {
      'caisse': [
        { value: 5, unit: 'kg' },
        { value: 10, unit: 'kg' },
        { value: 15, unit: 'kg' }
      ],
      'panier': [
        { value: 2, unit: 'kg' },
        { value: 3, unit: 'kg' },
        { value: 5, unit: 'kg' }
      ],
      'bac': [
        { value: 8, unit: 'kg' },
        { value: 12, unit: 'kg' },
        { value: 20, unit: 'kg' }
      ]
    };

    return examples[unit.toLowerCase()] || [
      { value: 1, unit: 'kg' },
      { value: 1, unit: 'litre' }
    ];
  }

  /**
   * Validation d'une conversion proposée
   */
  validateConversion(
    containerName: string,
    cropName: string,
    value: number,
    unit: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!containerName || containerName.trim().length < 1) {
      errors.push('Nom du contenant requis');
    }

    if (!cropName || cropName.trim().length < 1) {
      errors.push('Nom de la culture requis');
    }

    if (value <= 0) {
      errors.push('La valeur de conversion doit être positive');
    }

    if (value > 1000) {
      errors.push('La valeur de conversion semble très élevée');
    }

    if (!unit || unit.trim().length < 1) {
      errors.push('Unité de conversion requise');
    }

    const validUnits = ['kg', 'g', 'litre', 'l', 'unités', 'pièces'];
    if (unit && !validUnits.includes(unit.toLowerCase())) {
      errors.push(`Unité non supportée. Unités valides: ${validUnits.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Mise à jour d'une conversion existante
   */
  async updateConversion(
    conversionId: string,
    updates: Partial<UserConversionWithAliases>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_conversion_units')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversionId);

      if (error) {
        throw new Error(`Échec mise à jour conversion: ${error.message}`);
      }

      // Invalider cache
      this.conversionCache.clear();
      
      console.log(`✅ Conversion ${conversionId} updated`);
    } catch (error) {
      console.error('❌ Error updating conversion:', error);
      throw error;
    }
  }

  /**
   * Nettoyage du cache
   */
  clearCache(): void {
    this.conversionCache.clear();
    console.log('🗑️ Conversion matching cache cleared');
  }

  /**
   * Test d'une conversion avant application
   */
  testConversion(
    quantity: QuantityMention,
    conversion: UserConversionWithAliases
  ): ConvertedQuantity {
    return {
      original: quantity,
      converted: {
        value: quantity.value * conversion.conversion_value,
        unit: conversion.conversion_unit
      },
      confidence: 1.0,
      source: 'test',
      conversion_details: {
        conversion_id: conversion.id,
        factor: conversion.conversion_value,
        description: conversion.description
      }
    };
  }
}

// ============================================================================
// INTERFACES & TYPES ÉTENDUES
// ============================================================================

interface QuantityMentionExtended extends QuantityMention {
  position?: number;
  pattern_type?: number;
  confidence?: number;
}

interface ConversionSuggestion {
  container_name: string;
  suggested_crop: string;
  priority: 'low' | 'medium' | 'high';
  example_values: Array<{ value: number; unit: string }>;
}

interface ValidationResult {
  conversion_id: string;
  valid: boolean;
  issues: string[];
}

interface ConversionStats {
  total_conversions: number;
  crops_with_conversions: number;
  conversions_by_crop: Record<string, number>;
  most_used_units: Record<string, number>;
  cache_size: number;
}
