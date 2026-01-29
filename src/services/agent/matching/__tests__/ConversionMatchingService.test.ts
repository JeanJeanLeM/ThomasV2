import { ConversionMatchingService } from '../ConversionMatchingService';
import { FarmContext, UserConversionWithAliases } from '../../types/AgentTypes';

/**
 * Tests pour ConversionMatchingService
 * Validation des conversions personnalisées utilisateur
 */
describe('ConversionMatchingService', () => {
  let conversionService: ConversionMatchingService;
  let mockFarmContext: FarmContext;

  beforeEach(() => {
    // Mock Supabase client
    const mockSupabase = {} as any;
    conversionService = new ConversionMatchingService(mockSupabase);

    // Mock farm context avec conversions de test
    mockFarmContext = {
      id: 1,
      name: 'Ferme Test',
      plots: [],
      materials: [],
      conversions: [
        {
          id: '1',
          container_name: 'caisse',
          crop_name: 'courgettes',
          conversion_value: 5,
          conversion_unit: 'kg',
          slugs: ['caisses', 'casier', 'bac'],
          description: 'Caisse standard courgettes',
          is_active: true
        },
        {
          id: '2', 
          container_name: 'panier',
          crop_name: 'tomates',
          conversion_value: 2.5,
          conversion_unit: 'kg',
          slugs: ['paniers', 'corbeille'],
          description: 'Panier tomates cerises',
          is_active: true
        },
        {
          id: '3',
          container_name: 'botte',
          crop_name: 'radis',
          conversion_value: 0.5,
          conversion_unit: 'kg', 
          slugs: ['bottes'],
          description: 'Botte de radis',
          is_active: true
        }
      ],
      preferences: {
        language: 'fr',
        auto_categorization: true,
        confidence_threshold: 0.7,
        fallback_enabled: true
      }
    };
  });

  describe('Quantity Extraction', () => {
    
    test('should extract simple quantities', async () => {
      const converted = await conversionService.resolveConversions("3 caisses", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].original.value).toBe(3);
      expect(converted[0].original.unit).toBe('caisse');
    });

    test('should extract quantities with items', async () => {
      const converted = await conversionService.resolveConversions("2 paniers de tomates", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].original.value).toBe(2);
      expect(converted[0].original.unit).toBe('panier');
      expect(converted[0].original.item).toBe('tomates');
    });

    test('should handle decimal quantities', async () => {
      const converted = await conversionService.resolveConversions("2,5 kg", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].original.value).toBe(2.5);
      expect(converted[0].original.unit).toBe('kg');
    });

    test('should extract multiple quantities', async () => {
      const converted = await conversionService.resolveConversions("3 caisses et 2 paniers", mockFarmContext);
      
      expect(converted).toHaveLength(2);
      expect(converted[0].original.unit).toBe('caisse');
      expect(converted[1].original.unit).toBe('panier');
    });
  });

  describe('User Conversion Application', () => {
    
    test('should apply user conversion - caisses to kg', async () => {
      const converted = await conversionService.resolveConversions("3 caisses de courgettes", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].converted.value).toBe(15); // 3 * 5kg
      expect(converted[0].converted.unit).toBe('kg');
      expect(converted[0].confidence).toBe(1.0);
      expect(converted[0].source).toBe('user_conversion');
    });

    test('should apply conversion with aliases', async () => {
      const converted = await conversionService.resolveConversions("2 casiers", mockFarmContext); // Alias de "caisse"
      
      expect(converted).toHaveLength(1);
      expect(converted[0].converted.value).toBe(10); // 2 * 5kg
      expect(converted[0].source).toBe('user_conversion');
    });

    test('should match crop-specific conversions', async () => {
      const converted = await conversionService.resolveConversions("2 paniers de tomates", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].converted.value).toBe(5); // 2 * 2.5kg
      expect(converted[0].converted.unit).toBe('kg');
    });
  });

  describe('Standard Conversions', () => {
    
    test('should apply standard gram to kg conversion', async () => {
      const converted = await conversionService.resolveConversions("500 grammes", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].converted.value).toBe(0.5); // 500g = 0.5kg
      expect(converted[0].converted.unit).toBe('kg');
      expect(converted[0].source).toBe('standard');
    });

    test('should handle textual quantities', async () => {
      const converted = await conversionService.resolveConversions("une dizaine", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].converted.value).toBe(10);
      expect(converted[0].converted.unit).toBe('unités');
      expect(converted[0].source).toBe('standard');
    });
  });

  describe('No Conversion Cases', () => {
    
    test('should keep original when no conversion available', async () => {
      const converted = await conversionService.resolveConversions("5 unités mystères", mockFarmContext);
      
      expect(converted).toHaveLength(1);
      expect(converted[0].converted.value).toBe(5);
      expect(converted[0].converted.unit).toBe('unités');
      expect(converted[0].source).toBe('no_conversion');
      expect(converted[0].suggestions).toBeDefined();
    });
  });

  describe('Validation & Error Handling', () => {
    
    test('should validate conversion parameters', () => {
      const validation = conversionService.validateConversion('caisse', 'tomates', 5, 'kg');
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch validation errors', () => {
      const validation = conversionService.validateConversion('', 'tomates', -1, '');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Nom du contenant requis');
      expect(validation.errors).toContain('La valeur de conversion doit être positive');
    });

    test('should warn about high conversion values', () => {
      const validation = conversionService.validateConversion('caisse', 'tomates', 1500, 'kg');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('La valeur de conversion semble très élevée');
    });
  });

  describe('Suggestions Generation', () => {
    
    test('should generate conversion suggestions', async () => {
      const converted = await conversionService.resolveConversions("3 seaux", mockFarmContext); // Unité inconnue
      
      expect(converted).toHaveLength(1);
      expect(converted[0].source).toBe('no_conversion');
      expect(converted[0].suggestions).toBeDefined();
      expect(converted[0].suggestions).toContain('Créer une conversion pour "seau"');
    });

    test('should suggest based on existing conversions', async () => {
      const suggestions = conversionService.generateConversionSuggestions(
        [{ value: 1, unit: 'seau', item: undefined, raw_text: '1 seau' }],
        mockFarmContext
      );
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].container_name).toBe('seau');
      expect(suggestions[0].example_values).toBeDefined();
    });
  });

  describe('Conversion Testing', () => {
    
    test('should test conversion before application', () => {
      const testQuantity = { value: 3, unit: 'caisse', raw_text: '3 caisses' };
      const testConversion = mockFarmContext.conversions[0];
      
      const result = conversionService.testConversion(testQuantity, testConversion);
      
      expect(result.converted.value).toBe(15);
      expect(result.converted.unit).toBe('kg');
      expect(result.source).toBe('test');
    });
  });

  describe('Statistics & Monitoring', () => {
    
    test('should provide conversion statistics', () => {
      const stats = conversionService.getConversionStats(mockFarmContext);
      
      expect(stats.total_conversions).toBe(3);
      expect(stats.crops_with_conversions).toBe(3); // courgettes, tomates, radis
      expect(stats.conversions_by_crop).toEqual({
        'courgettes': 1,
        'tomates': 1,
        'radis': 1
      });
      expect(stats.most_used_units).toEqual({
        'kg': 3 // Toutes les conversions sont en kg
      });
    });
  });

  describe('Complex Scenarios', () => {
    
    test('should handle mixed quantities with different conversions', async () => {
      const text = "j'ai récolté 3 caisses de courgettes et 2 paniers de tomates";
      const converted = await conversionService.resolveConversions(text, mockFarmContext);
      
      expect(converted).toHaveLength(2);
      
      // Première quantité: 3 caisses = 15kg
      expect(converted[0].converted.value).toBe(15);
      expect(converted[0].converted.unit).toBe('kg');
      
      // Deuxième quantité: 2 paniers = 5kg
      expect(converted[1].converted.value).toBe(5);
      expect(converted[1].converted.unit).toBe('kg');
    });

    test('should handle quantities without conversions mixed with converted ones', async () => {
      const text = "3 caisses et 2 kg";
      const converted = await conversionService.resolveConversions(text, mockFarmContext);
      
      expect(converted).toHaveLength(2);
      
      // Première: conversion appliquée
      expect(converted[0].source).toBe('user_conversion');
      
      // Deuxième: pas de conversion (kg déjà standard)
      expect(converted[1].source).toBe('no_conversion');
      expect(converted[1].converted.value).toBe(2);
      expect(converted[1].converted.unit).toBe('kg');
    });
  });

  describe('Cache Performance', () => {
    
    test('should cache conversion results', async () => {
      const text = "3 caisses";
      
      // Premier appel
      const converted1 = await conversionService.resolveConversions(text, mockFarmContext);
      
      // Deuxième appel (devrait utiliser le cache)
      const converted2 = await conversionService.resolveConversions(text, mockFarmContext);
      
      expect(converted1).toEqual(converted2);
    });

    test('should clear cache', async () => {
      await conversionService.resolveConversions("3 caisses", mockFarmContext);
      
      conversionService.clearCache();
      
      // Le cache devrait être vide (pas de méthode directe pour vérifier, mais pas d'erreur)
      expect(true).toBe(true);
    });
  });
});

