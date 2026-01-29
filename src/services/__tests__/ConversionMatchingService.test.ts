/**
 * Tests pour ConversionMatchingService
 * Valide les améliorations du matching contenant + culture/matière
 */

import { ConversionMatchingService } from '../agent/matching/ConversionMatchingService';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    update: jest.fn(() => ({ error: null })),
    eq: jest.fn(() => ({ error: null }))
  }))
} as unknown as SupabaseClient;

describe('ConversionMatchingService', () => {
  let service: ConversionMatchingService;
  let mockFarmContext: any;

  beforeEach(() => {
    service = new ConversionMatchingService(mockSupabase);
    mockFarmContext = {
      id: 1,
      conversions: [
        {
          id: '1',
          container_name: 'caisse',
          crop_name: 'tomates',
          conversion_value: 10,
          conversion_unit: 'kg',
          is_active: true,
          slugs: ['casier']
        },
        {
          id: '2',
          container_name: 'caisse',
          crop_name: 'tomates cerises',
          conversion_value: 4,
          conversion_unit: 'kg',
          is_active: true,
          slugs: []
        },
        {
          id: '3',
          container_name: 'brouette',
          crop_name: 'compost',
          conversion_value: 50,
          conversion_unit: 'kg',
          is_active: true,
          slugs: []
        },
        {
          id: '4',
          container_name: 'sac',
          crop_name: 'terreau',
          conversion_value: 25,
          conversion_unit: 'kg',
          is_active: true,
          slugs: []
        }
      ]
    };
  });

  describe('extractQuantities', () => {
    test('should extract container + culture combinations', async () => {
      const text = "J'ai récolté 5 caisses de tomates et 3 paniers de radis";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(2);
      
      // Premier match: 5 caisses de tomates
      expect(result[0].original.value).toBe(5);
      expect(result[0].original.unit).toBe('caisse');
      expect(result[0].original.item).toBe('tomates');
      
      // Deuxième match: 3 paniers de radis
      expect(result[1].original.value).toBe(3);
      expect(result[1].original.unit).toBe('panier');
      expect(result[1].original.item).toBe('radis');
    });

    test('should handle approximations with container + culture', async () => {
      const text = "J'ai utilisé quelques brouettes de compost";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(1);
      expect(result[0].original.value).toBe(3); // "quelques" = 3
      expect(result[0].original.unit).toBe('brouette');
      expect(result[0].original.item).toBe('compost');
    });

    test('should handle specialized materials', async () => {
      const text = "J'ai acheté 2 sacs de terreau";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(1);
      expect(result[0].original.value).toBe(2);
      expect(result[0].original.unit).toBe('sac');
      expect(result[0].original.item).toBe('terreau');
    });

    test('should assign low confidence to containers without culture', async () => {
      const text = "J'ai préparé 5 caisses";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(1);
      expect(result[0].original.value).toBe(5);
      expect(result[0].original.unit).toBe('caisse');
      expect(result[0].original.item).toBeUndefined();
      expect(result[0].confidence).toBeLessThan(0.5); // Score très faible
    });
  });

  describe('findUserConversion', () => {
    test('should find exact match for container + culture', async () => {
      const text = "5 caisses de tomates";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result[0].source).toBe('user_conversion');
      expect(result[0].converted.value).toBe(50); // 5 * 10kg
      expect(result[0].converted.unit).toBe('kg');
      expect(result[0].confidence).toBe(1.0);
    });

    test('should distinguish between different cultures for same container', async () => {
      const text = "J'ai 3 caisses de tomates et 2 caisses de tomates cerises";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(2);
      
      // Caisses de tomates: 3 * 10kg = 30kg
      expect(result[0].converted.value).toBe(30);
      expect(result[0].converted.unit).toBe('kg');
      
      // Caisses de tomates cerises: 2 * 4kg = 8kg
      expect(result[1].converted.value).toBe(8);
      expect(result[1].converted.unit).toBe('kg');
    });

    test('should match with aliases', async () => {
      const text = "2 casiers de tomates"; // "casier" est un alias de "caisse"
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result[0].source).toBe('user_conversion');
      expect(result[0].converted.value).toBe(20); // 2 * 10kg
    });

    test('should handle linguistic variants (plural/singular)', async () => {
      const text = "1 caisse de tomate"; // singulier
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result[0].source).toBe('user_conversion');
      expect(result[0].converted.value).toBe(10); // 1 * 10kg
    });

    test('should not match different cultures', async () => {
      const text = "5 caisses de courgettes"; // Pas de conversion pour courgettes
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result[0].source).toBe('no_conversion');
      expect(result[0].suggestions).toBeDefined();
      expect(result[0].suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('suggestions', () => {
    test('should suggest creating conversion for missing container + culture', async () => {
      const text = "3 paniers de radis"; // Pas de conversion existante
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result[0].source).toBe('no_conversion');
      expect(result[0].suggestions).toContain(
        expect.stringContaining('panier de radis')
      );
    });

    test('should warn when culture is missing', async () => {
      const text = "5 caisses"; // Contenant sans culture
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result[0].suggestions).toContain(
        expect.stringContaining('Précisez la culture')
      );
    });
  });

  describe('complex scenarios', () => {
    test('should handle mixed quantities in one message', async () => {
      const text = "Aujourd'hui j'ai récolté 5 caisses de tomates, utilisé 2 brouettes de compost et acheté 1 sac de terreau";
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(3);
      
      // Vérifier que chaque conversion est correcte
      const tomatoes = result.find(r => r.original.item === 'tomates');
      const compost = result.find(r => r.original.item === 'compost');
      const soil = result.find(r => r.original.item === 'terreau');
      
      expect(tomatoes?.converted.value).toBe(50); // 5 * 10kg
      expect(compost?.converted.value).toBe(100); // 2 * 50kg
      expect(soil?.converted.value).toBe(25); // 1 * 25kg
    });

    test('should prioritize high-confidence matches', async () => {
      const text = "5 caisses de tomates et quelques caisses"; // Mix précis + vague
      const result = await service.resolveConversions(text, mockFarmContext);
      
      expect(result).toHaveLength(2);
      
      // Le premier résultat devrait être le plus précis (confidence plus élevée)
      expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
      expect(result[0].original.item).toBe('tomates');
    });
  });

  describe('validation', () => {
    test('should validate conversion data', () => {
      const validationResult = service.validateConversion(
        'caisse',
        'tomates',
        10,
        'kg'
      );
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('should detect invalid conversion data', () => {
      const validationResult = service.validateConversion(
        '', // Nom vide
        'tomates',
        -5, // Valeur négative
        'invalid_unit' // Unité non supportée
      );
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });
  });
});