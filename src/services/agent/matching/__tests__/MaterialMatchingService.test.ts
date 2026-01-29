import { MaterialMatchingService } from '../MaterialMatchingService';
import { FarmContext, MaterialWithKeywords } from '../../types/AgentTypes';

/**
 * Tests pour MaterialMatchingService
 * Validation du matching avec LLM keywords
 */
describe('MaterialMatchingService', () => {
  let materialMatchingService: MaterialMatchingService;
  let mockFarmContext: FarmContext;

  beforeEach(() => {
    // Mock Supabase client
    const mockSupabase = {} as any;
    materialMatchingService = new MaterialMatchingService(mockSupabase);

    // Mock farm context avec matériels de test
    mockFarmContext = {
      id: 1,
      name: 'Ferme Test',
      plots: [],
      materials: [
        {
          id: 1,
          name: 'John Deere 6120',
          category: 'tracteurs',
          brand: 'John Deere',
          model: '6120',
          llm_keywords: ['tracteur', 'tractor', 'john deere', 'engin', '6120'],
          is_active: true
        },
        {
          id: 2,
          name: 'Pulvérisateur 200L',
          category: 'outils_tracteur',
          brand: 'Amazone',
          model: 'UF1200',
          llm_keywords: ['pulvérisateur', 'atomiseur', 'spray', 'traitement', 'amazone'],
          is_active: true
        },
        {
          id: 3,
          name: 'Bêche',
          category: 'outils_manuels',
          brand: undefined,
          model: undefined,
          llm_keywords: ['bêche', 'pelle', 'outil manuel', 'creuser'],
          is_active: true
        },
        {
          id: 4,
          name: 'Brouette Verte',
          category: 'petit_equipement',
          brand: undefined,
          model: undefined,
          llm_keywords: ['brouette', 'charriot', 'transport', 'vert'],
          is_active: true
        }
      ],
      conversions: [],
      preferences: {
        language: 'fr',
        auto_categorization: true,
        confidence_threshold: 0.7,
        fallback_enabled: true
      }
    };
  });

  describe('Exact Matching', () => {
    
    test('should match exact material name', async () => {
      const matches = await materialMatchingService.matchMaterials("John Deere 6120", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.name).toBe('John Deere 6120');
      expect(matches[0].confidence).toBe(1.0);
      expect(matches[0].match_method).toBe('exact');
    });

    test('should match brand + model', async () => {
      const matches = await materialMatchingService.matchMaterials("John Deere", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.brand).toBe('John Deere');
      expect(matches[0].confidence).toBe(0.95);
      expect(matches[0].match_method).toBe('brand_model');
    });
  });

  describe('LLM Keywords Matching', () => {
    
    test('should match using LLM keywords - tracteur', async () => {
      const matches = await materialMatchingService.matchMaterials("j'ai utilisé le tracteur", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.name).toBe('John Deere 6120');
      expect(matches[0].match_method).toBe('llm_keyword');
      expect(matches[0].confidence).toBeGreaterThan(0.7);
    });

    test('should match synonyms - pulvérisateur/atomiseur', async () => {
      const matches = await materialMatchingService.matchMaterials("atomiseur", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.name).toBe('Pulvérisateur 200L');
      expect(matches[0].match_method).toBe('llm_keyword');
    });

    test('should match with partial keywords', async () => {
      const matches = await materialMatchingService.matchMaterials("spray", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.name).toBe('Pulvérisateur 200L');
    });
  });

  describe('Category Matching', () => {
    
    test('should match by category when mention is generic', async () => {
      const matches = await materialMatchingService.matchByCategory("outil manuel", mockFarmContext.materials);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.category).toBe('outils_manuels');
      expect(matches[0].match_method).toBe('category');
    });

    test('should return multiple matches for broad category', async () => {
      const matches = await materialMatchingService.matchByCategory("tracteur", mockFarmContext.materials);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.category).toBe('tracteurs');
    });
  });

  describe('Suggestions Generation', () => {
    
    test('should generate suggestions when no match found', () => {
      const suggestions = materialMatchingService.generateMaterialSuggestions(
        mockFarmContext, 
        "xyz123", // Mention introuvable
        3
      );
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toContain('John Deere 6120');
      expect(suggestions[1]).toContain('Pulvérisateur 200L');
    });

    test('should include brand and model in suggestions', () => {
      const suggestions = materialMatchingService.generateMaterialSuggestions(mockFarmContext, "tracteur", 2);
      
      expect(suggestions[0]).toContain('John Deere 6120 (John Deere 6120)');
    });
  });

  describe('Performance & Validation', () => {
    
    test('should validate material matches', async () => {
      const matches = await materialMatchingService.matchMaterials("tracteur", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(materialMatchingService.validateMaterialMatch(matches[0])).toBe(true);
    });

    test('should provide matching stats', async () => {
      await materialMatchingService.matchMaterials("tracteur", mockFarmContext);
      await materialMatchingService.matchMaterials("pulvérisateur", mockFarmContext);
      
      const stats = materialMatchingService.getMatchingStats();
      expect(stats.cacheSize).toBe(2);
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.categoryDistribution).toBeDefined();
    });

    test('should handle inactive materials', async () => {
      // Modifier un matériel pour le rendre inactif
      mockFarmContext.materials[0].is_active = false;
      
      const matches = await materialMatchingService.matchMaterials("John Deere", mockFarmContext);
      
      expect(matches).toHaveLength(0); // Matériel inactif ignoré
    });
  });

  describe('Edge Cases', () => {
    
    test('should handle empty material list', async () => {
      const emptyFarmContext = { ...mockFarmContext, materials: [] };
      
      const matches = await materialMatchingService.matchMaterials("tracteur", emptyFarmContext);
      
      expect(matches).toHaveLength(0);
    });

    test('should handle empty text', async () => {
      const matches = await materialMatchingService.matchMaterials("", mockFarmContext);
      
      expect(matches).toHaveLength(0);
    });

    test('should handle special characters', async () => {
      const matches = await materialMatchingService.matchMaterials("John Deere 6120!", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].material.name).toBe('John Deere 6120');
    });
  });

  describe('Cache Management', () => {
    
    test('should clear cache', async () => {
      await materialMatchingService.matchMaterials("tracteur", mockFarmContext);
      
      let stats = materialMatchingService.getMatchingStats();
      expect(stats.cacheSize).toBe(1);
      
      materialMatchingService.clearCache();
      
      stats = materialMatchingService.getMatchingStats();
      expect(stats.cacheSize).toBe(0);
    });
  });
});

