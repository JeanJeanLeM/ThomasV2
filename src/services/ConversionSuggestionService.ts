/**
 * Service de suggestions intelligentes pour les conversions
 * Analyse les patterns de la ferme et propose des conversions pertinentes
 */

import { ConversionService, UserConversion } from './ConversionService';
import { DirectSupabaseService } from './DirectSupabaseService';

export interface ConversionSuggestion {
  id: string;
  containerName: string;
  cropName: string;
  suggestedValues: Array<{ value: number; unit: string; confidence: number }>;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  category: 'harvest' | 'input' | 'generic';
}

export interface FarmAnalysis {
  mainCrops: string[];
  commonContainers: string[];
  missingConversions: Array<{ container: string; crop: string; frequency: number }>;
  conversionGaps: string[];
}

export class ConversionSuggestionService {
  
  /**
   * Génère des suggestions intelligentes basées sur l'analyse de la ferme
   */
  static async generateSmartSuggestions(
    farmId: number,
    userId: string,
    failedQuantities: Array<{ container: string; crop?: string; frequency: number }> = []
  ): Promise<ConversionSuggestion[]> {
    try {
      console.log('🧠 Generating smart conversion suggestions...');
      
      // 1. Analyser les données existantes de la ferme
      const farmAnalysis = await this.analyzeFarmData(farmId, userId);
      
      // 2. Analyser les conversions existantes (filtrées uniquement par farm_id)
      const existingConversions = await ConversionService.getActiveConversions(farmId);
      
      // 3. Générer suggestions basées sur les échecs de matching
      const failureSuggestions = this.generateFailureSuggestions(failedQuantities, existingConversions);
      
      // 4. Générer suggestions basées sur les cultures de la ferme
      const cropSuggestions = await this.generateCropBasedSuggestions(farmAnalysis, existingConversions);
      
      // 5. Générer suggestions de contenants communs
      const containerSuggestions = this.generateCommonContainerSuggestions(farmAnalysis, existingConversions);
      
      // 6. Combiner et prioriser
      const allSuggestions = [
        ...failureSuggestions,
        ...cropSuggestions,
        ...containerSuggestions
      ];
      
      // 7. Dédoublonner et trier par priorité
      const uniqueSuggestions = this.deduplicateAndPrioritize(allSuggestions);
      
      console.log(`✅ Generated ${uniqueSuggestions.length} smart suggestions`);
      return uniqueSuggestions.slice(0, 10); // Limiter à 10 suggestions max
      
    } catch (error) {
      console.error('❌ Error generating smart suggestions:', error);
      return [];
    }
  }
  
  /**
   * Analyse les données de la ferme pour identifier les patterns
   */
  private static async analyzeFarmData(farmId: number, userId: string): Promise<FarmAnalysis> {
    try {
      // Récupérer les cultures de la ferme
      const { data: plots, error: plotsError } = await DirectSupabaseService.directSelect(
        'plots',
        'id, name, current_culture, surface_area',
        [{ column: 'farm_id', value: farmId }, { column: 'is_active', value: true }]
      );
      
      if (plotsError) {
        console.warn('Could not fetch plots:', plotsError);
      }
      
      // Récupérer les tâches récentes pour identifier les patterns d'usage
      const { data: tasks, error: tasksError } = await DirectSupabaseService.directSelect(
        'tasks',
        'action, description, quantity_value, quantity_unit, created_at',
        [
          { column: 'farm_id', value: farmId },
          { column: 'is_active', value: true }
        ],
        'created_at DESC',
        100 // Dernières 100 tâches
      );
      
      if (tasksError) {
        console.warn('Could not fetch tasks:', tasksError);
      }
      
      // Analyser les cultures principales
      const mainCrops = this.extractMainCrops(plots || [], tasks || []);
      
      // Analyser les contenants utilisés
      const commonContainers = this.extractCommonContainers(tasks || []);
      
      // Identifier les conversions manquantes
      const missingConversions = this.identifyMissingConversions(tasks || []);
      
      return {
        mainCrops,
        commonContainers,
        missingConversions,
        conversionGaps: []
      };
      
    } catch (error) {
      console.error('Error analyzing farm data:', error);
      return {
        mainCrops: [],
        commonContainers: [],
        missingConversions: [],
        conversionGaps: []
      };
    }
  }
  
  /**
   * Extrait les cultures principales de la ferme
   */
  private static extractMainCrops(plots: any[], tasks: any[]): string[] {
    const cropFrequency = new Map<string, number>();
    
    // Analyser les cultures des parcelles
    plots.forEach(plot => {
      if (plot.current_culture) {
        const crop = plot.current_culture.toLowerCase();
        cropFrequency.set(crop, (cropFrequency.get(crop) || 0) + plot.surface_area || 1);
      }
    });
    
    // Analyser les mentions dans les tâches
    tasks.forEach(task => {
      if (task.description) {
        const crops = this.extractCropsFromText(task.description);
        crops.forEach(crop => {
          cropFrequency.set(crop, (cropFrequency.get(crop) || 0) + 1);
        });
      }
    });
    
    // Retourner les cultures les plus fréquentes
    return Array.from(cropFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([crop]) => crop);
  }
  
  /**
   * Extrait les contenants communs des tâches
   */
  private static extractCommonContainers(tasks: any[]): string[] {
    const containerFrequency = new Map<string, number>();
    
    tasks.forEach(task => {
      if (task.description) {
        const containers = this.extractContainersFromText(task.description);
        containers.forEach(container => {
          containerFrequency.set(container, (containerFrequency.get(container) || 0) + 1);
        });
      }
      
      if (task.quantity_unit) {
        const container = task.quantity_unit.toLowerCase();
        if (this.isContainer(container)) {
          containerFrequency.set(container, (containerFrequency.get(container) || 0) + 1);
        }
      }
    });
    
    return Array.from(containerFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([container]) => container);
  }
  
  /**
   * Identifie les conversions manquantes à partir des tâches
   */
  private static identifyMissingConversions(tasks: any[]): Array<{ container: string; crop: string; frequency: number }> {
    const missingConversions = new Map<string, { container: string; crop: string; frequency: number }>();
    
    tasks.forEach(task => {
      if (task.description) {
        // Pattern pour détecter "X contenants de Y"
        const matches = task.description.match(/(\d+)\s+(caisse|panier|bac|brouette|sac)s?\s+de\s+(\w+)/gi);
        
        if (matches) {
          matches.forEach((match: string) => {
            const parts = match.match(/(\d+)\s+(\w+)s?\s+de\s+(\w+)/i);
            if (parts) {
              const container = parts[2].toLowerCase();
              const crop = parts[3].toLowerCase();
              const key = `${container}_${crop}`;
              
              const existing = missingConversions.get(key);
              if (existing) {
                existing.frequency++;
              } else {
                missingConversions.set(key, { container, crop, frequency: 1 });
              }
            }
          });
        }
      }
    });
    
    return Array.from(missingConversions.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);
  }
  
  /**
   * Génère des suggestions basées sur les échecs de matching
   */
  private static generateFailureSuggestions(
    failedQuantities: Array<{ container: string; crop?: string; frequency: number }>,
    existingConversions: UserConversion[]
  ): ConversionSuggestion[] {
    const suggestions: ConversionSuggestion[] = [];
    
    failedQuantities.forEach(failed => {
      // Vérifier si déjà existant
      const exists = existingConversions.some(conv => 
        conv.container_name.toLowerCase() === failed.container.toLowerCase() &&
        (!failed.crop || conv.crop_name.toLowerCase() === failed.crop.toLowerCase())
      );
      
      if (!exists && failed.crop) {
        const suggestion = this.createSuggestionFromFailure(failed);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    });
    
    return suggestions;
  }
  
  /**
   * Génère des suggestions basées sur les cultures de la ferme
   */
  private static async generateCropBasedSuggestions(
    farmAnalysis: FarmAnalysis,
    existingConversions: UserConversion[]
  ): Promise<ConversionSuggestion[]> {
    const suggestions: ConversionSuggestion[] = [];
    const commonContainers = ['caisse', 'panier', 'bac'];
    
    farmAnalysis.mainCrops.forEach(crop => {
      commonContainers.forEach(container => {
        // Vérifier si cette combinaison existe déjà
        const exists = existingConversions.some(conv => 
          conv.container_name.toLowerCase() === container &&
          conv.crop_name.toLowerCase() === crop
        );
        
        if (!exists) {
          const suggestion = this.createCropContainerSuggestion(container, crop);
          if (suggestion) {
            suggestions.push(suggestion);
          }
        }
      });
    });
    
    return suggestions;
  }
  
  /**
   * Génère des suggestions pour contenants communs
   */
  private static generateCommonContainerSuggestions(
    farmAnalysis: FarmAnalysis,
    existingConversions: UserConversion[]
  ): ConversionSuggestion[] {
    const suggestions: ConversionSuggestion[] = [];
    
    // Suggestions de contenants spécialisés
    const specializedContainers = [
      { container: 'brouette', crop: 'compost', category: 'input' as const },
      { container: 'sac', crop: 'terreau', category: 'input' as const },
      { container: 'sac', crop: 'engrais', category: 'input' as const },
      { container: 'bac', crop: 'fumier', category: 'input' as const }
    ];
    
    specializedContainers.forEach(spec => {
      const exists = existingConversions.some(conv => 
        conv.container_name.toLowerCase() === spec.container &&
        conv.crop_name.toLowerCase() === spec.crop
      );
      
      if (!exists) {
        const suggestion = this.createSpecializedSuggestion(spec.container, spec.crop, spec.category);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    });
    
    return suggestions;
  }
  
  /**
   * Crée une suggestion à partir d'un échec de matching
   */
  private static createSuggestionFromFailure(
    failed: { container: string; crop?: string; frequency: number }
  ): ConversionSuggestion | null {
    if (!failed.crop) return null;
    
    const baseValues = this.getBaseConversionValues(failed.container, failed.crop);
    
    return {
      id: `failure_${failed.container}_${failed.crop}`,
      containerName: failed.container,
      cropName: failed.crop,
      suggestedValues: baseValues,
      priority: failed.frequency >= 3 ? 'high' : 'medium',
      reasoning: `Détecté ${failed.frequency} fois dans vos messages récents`,
      category: this.categorizeConversion(failed.container, failed.crop)
    };
  }
  
  /**
   * Crée une suggestion contenant + culture
   */
  private static createCropContainerSuggestion(
    container: string,
    crop: string
  ): ConversionSuggestion {
    const baseValues = this.getBaseConversionValues(container, crop);
    
    return {
      id: `crop_${container}_${crop}`,
      containerName: container,
      cropName: crop,
      suggestedValues: baseValues,
      priority: 'medium',
      reasoning: `Basé sur vos cultures principales`,
      category: this.categorizeConversion(container, crop)
    };
  }
  
  /**
   * Crée une suggestion spécialisée
   */
  private static createSpecializedSuggestion(
    container: string,
    crop: string,
    category: 'harvest' | 'input' | 'generic'
  ): ConversionSuggestion {
    const baseValues = this.getBaseConversionValues(container, crop);
    
    return {
      id: `specialized_${container}_${crop}`,
      containerName: container,
      cropName: crop,
      suggestedValues: baseValues,
      priority: 'low',
      reasoning: `Suggestion pour ${category === 'input' ? 'intrants' : 'récolte'}`,
      category
    };
  }
  
  /**
   * Obtient les valeurs de conversion de base
   */
  private static getBaseConversionValues(container: string, crop: string): Array<{ value: number; unit: string; confidence: number }> {
    // Base de données des conversions typiques
    const conversionDatabase: Record<string, Record<string, Array<{ value: number; unit: string; confidence: number }>>> = {
      'caisse': {
        'tomates': [
          { value: 10, unit: 'kg', confidence: 0.9 },
          { value: 8, unit: 'kg', confidence: 0.7 },
          { value: 12, unit: 'kg', confidence: 0.7 }
        ],
        'courgettes': [
          { value: 8, unit: 'kg', confidence: 0.9 },
          { value: 6, unit: 'kg', confidence: 0.7 },
          { value: 10, unit: 'kg', confidence: 0.7 }
        ],
        'radis': [
          { value: 6, unit: 'kg', confidence: 0.9 },
          { value: 5, unit: 'kg', confidence: 0.7 },
          { value: 7, unit: 'kg', confidence: 0.6 }
        ]
      },
      'panier': {
        'tomates': [
          { value: 3, unit: 'kg', confidence: 0.9 },
          { value: 2.5, unit: 'kg', confidence: 0.7 },
          { value: 4, unit: 'kg', confidence: 0.6 }
        ],
        'salade': [
          { value: 1.5, unit: 'kg', confidence: 0.9 },
          { value: 1, unit: 'kg', confidence: 0.7 },
          { value: 2, unit: 'kg', confidence: 0.6 }
        ]
      },
      'brouette': {
        'compost': [
          { value: 50, unit: 'kg', confidence: 0.9 },
          { value: 40, unit: 'kg', confidence: 0.7 },
          { value: 60, unit: 'kg', confidence: 0.6 }
        ],
        'fumier': [
          { value: 45, unit: 'kg', confidence: 0.9 },
          { value: 35, unit: 'kg', confidence: 0.7 },
          { value: 55, unit: 'kg', confidence: 0.6 }
        ]
      },
      'sac': {
        'terreau': [
          { value: 25, unit: 'kg', confidence: 0.9 },
          { value: 20, unit: 'kg', confidence: 0.7 },
          { value: 30, unit: 'kg', confidence: 0.6 }
        ],
        'engrais': [
          { value: 25, unit: 'kg', confidence: 0.9 },
          { value: 20, unit: 'kg', confidence: 0.7 },
          { value: 50, unit: 'kg', confidence: 0.5 }
        ]
      }
    };
    
    const containerData = conversionDatabase[container.toLowerCase()];
    if (containerData) {
      const cropData = containerData[crop.toLowerCase()];
      if (cropData) {
        return cropData;
      }
    }
    
    // Valeurs par défaut
    return [
      { value: 1, unit: 'kg', confidence: 0.5 },
      { value: 1, unit: 'litre', confidence: 0.3 }
    ];
  }
  
  /**
   * Catégorise une conversion
   */
  private static categorizeConversion(container: string, crop: string): 'harvest' | 'input' | 'generic' {
    const inputMaterials = ['compost', 'terreau', 'engrais', 'fumier', 'paille', 'copeaux'];
    const inputContainers = ['brouette', 'sac'];
    
    if (inputMaterials.includes(crop.toLowerCase()) || inputContainers.includes(container.toLowerCase())) {
      return 'input';
    }
    
    return 'harvest';
  }
  
  /**
   * Dédoublonne et priorise les suggestions
   */
  private static deduplicateAndPrioritize(suggestions: ConversionSuggestion[]): ConversionSuggestion[] {
    const seen = new Set<string>();
    const unique: ConversionSuggestion[] = [];
    
    // Trier par priorité
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    suggestions.forEach(suggestion => {
      const key = `${suggestion.containerName}_${suggestion.cropName}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    });
    
    return unique;
  }
  
  // Méthodes utilitaires
  
  private static extractCropsFromText(text: string): string[] {
    const crops: string[] = [];
    const cropPatterns = [
      /\b(tomate|tomates|courgette|courgettes|radis|carotte|carottes|salade|salades|épinard|épinards|basilic|persil)\b/gi
    ];
    
    cropPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        crops.push(...matches.map(m => m.toLowerCase()));
      }
    });
    
    return [...new Set(crops)];
  }
  
  private static extractContainersFromText(text: string): string[] {
    const containers: string[] = [];
    const containerPatterns = [
      /\b(caisse|caisses|panier|paniers|bac|bacs|brouette|brouettes|sac|sacs)\b/gi
    ];
    
    containerPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        containers.push(...matches.map(m => m.toLowerCase()));
      }
    });
    
    return [...new Set(containers)];
  }
  
  private static isContainer(unit: string): boolean {
    const containers = ['caisse', 'caisses', 'panier', 'paniers', 'bac', 'bacs', 'brouette', 'brouettes', 'sac', 'sacs'];
    return containers.includes(unit.toLowerCase());
  }
}