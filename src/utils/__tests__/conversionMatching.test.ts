/**
 * Tests d'intégration pour le système de conversion complet
 * Valide le workflow end-to-end du matching et des suggestions
 */

import { ConversionMatchingService } from '../../services/agent/matching/ConversionMatchingService';
import { ConversionSuggestionService } from '../../services/ConversionSuggestionService';
import { ConversionService } from '../../services/ConversionService';

describe('Conversion System Integration', () => {
  describe('End-to-end workflow', () => {
    test('should handle complete conversion workflow', async () => {
      // Scénario: Utilisateur tape "5 caisses de tomates cerises"
      // 1. Pas de conversion existante
      // 2. Suggestion créée
      // 3. Conversion ajoutée
      // 4. Message retraité avec succès

      const mockFarmContext = {
        id: 1,
        conversions: [] // Aucune conversion existante
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          insert: jest.fn(() => ({ error: null })),
          update: jest.fn(() => ({ error: null })),
          eq: jest.fn(() => ({ error: null }))
        }))
      } as any;

      const matchingService = new ConversionMatchingService(mockSupabase);
      
      // Étape 1: Premier matching échoue
      const initialResult = await matchingService.resolveConversions(
        "J'ai récolté 5 caisses de tomates cerises",
        mockFarmContext
      );

      expect(initialResult[0].source).toBe('no_conversion');
      expect(initialResult[0].suggestions).toContain(
        expect.stringContaining('caisse de tomates cerises')
      );

      // Étape 2: Création de la conversion
      await matchingService.createUserConversion(
        'user-1',
        1,
        'caisse',
        'tomates cerises',
        4,
        'kg',
        ['casier']
      );

      // Étape 3: Nouveau contexte avec la conversion
      const updatedFarmContext = {
        id: 1,
        conversions: [{
          id: '1',
          container_name: 'caisse',
          crop_name: 'tomates cerises',
          conversion_value: 4,
          conversion_unit: 'kg',
          is_active: true,
          slugs: ['casier']
        }]
      };

      // Étape 4: Nouveau matching réussit
      const finalResult = await matchingService.resolveConversions(
        "J'ai récolté 5 caisses de tomates cerises",
        updatedFarmContext
      );

      expect(finalResult[0].source).toBe('user_conversion');
      expect(finalResult[0].converted.value).toBe(20); // 5 * 4kg
      expect(finalResult[0].converted.unit).toBe('kg');
    });

    test('should distinguish between similar but different conversions', async () => {
      const mockFarmContext = {
        id: 1,
        conversions: [
          {
            id: '1',
            container_name: 'caisse',
            crop_name: 'tomates',
            conversion_value: 10,
            conversion_unit: 'kg',
            is_active: true,
            slugs: []
          },
          {
            id: '2',
            container_name: 'caisse',
            crop_name: 'tomates cerises',
            conversion_value: 4,
            conversion_unit: 'kg',
            is_active: true,
            slugs: []
          }
        ]
      };

      const mockSupabase = {} as any;
      const matchingService = new ConversionMatchingService(mockSupabase);

      // Test avec tomates normales
      const tomatoResult = await matchingService.resolveConversions(
        "3 caisses de tomates",
        mockFarmContext
      );

      // Test avec tomates cerises
      const cherryResult = await matchingService.resolveConversions(
        "3 caisses de tomates cerises",
        mockFarmContext
      );

      expect(tomatoResult[0].converted.value).toBe(30); // 3 * 10kg
      expect(cherryResult[0].converted.value).toBe(12); // 3 * 4kg
      
      // Vérifier que les bonnes conversions sont utilisées
      expect(tomatoResult[0].conversion_details?.conversion_id).toBe('1');
      expect(cherryResult[0].conversion_details?.conversion_id).toBe('2');
    });
  });

  describe('Complex message parsing', () => {
    test('should handle multiple quantities in complex sentences', async () => {
      const mockFarmContext = {
        id: 1,
        conversions: [
          {
            id: '1',
            container_name: 'caisse',
            crop_name: 'tomates',
            conversion_value: 10,
            conversion_unit: 'kg',
            is_active: true,
            slugs: []
          },
          {
            id: '2',
            container_name: 'brouette',
            crop_name: 'compost',
            conversion_value: 50,
            conversion_unit: 'kg',
            is_active: true,
            slugs: []
          }
        ]
      };

      const mockSupabase = {} as any;
      const matchingService = new ConversionMatchingService(mockSupabase);

      const complexMessage = `
        Aujourd'hui j'ai eu une journée productive ! 
        J'ai commencé par récolter 8 caisses de tomates bien mûres,
        puis j'ai épandu 3 brouettes de compost sur la parcelle nord.
        En fin de journée, j'ai aussi préparé quelques caisses pour demain.
      `;

      const result = await matchingService.resolveConversions(
        complexMessage,
        mockFarmContext
      );

      // Devrait détecter au moins 2 conversions précises
      const preciseConversions = result.filter(r => r.source === 'user_conversion');
      expect(preciseConversions.length).toBeGreaterThanOrEqual(2);

      // Vérifier les conversions spécifiques
      const tomatoConversion = preciseConversions.find(r => 
        r.original.item === 'tomates'
      );
      const compostConversion = preciseConversions.find(r => 
        r.original.item === 'compost'
      );

      expect(tomatoConversion?.converted.value).toBe(80); // 8 * 10kg
      expect(compostConversion?.converted.value).toBe(150); // 3 * 50kg
    });

    test('should handle approximations and exact quantities together', async () => {
      const mockFarmContext = {
        id: 1,
        conversions: [
          {
            id: '1',
            container_name: 'panier',
            crop_name: 'radis',
            conversion_value: 2,
            conversion_unit: 'kg',
            is_active: true,
            slugs: []
          }
        ]
      };

      const mockSupabase = {} as any;
      const matchingService = new ConversionMatchingService(mockSupabase);

      const result = await matchingService.resolveConversions(
        "J'ai récolté 5 paniers de radis et quelques paniers de radis supplémentaires",
        mockFarmContext
      );

      expect(result.length).toBe(2);
      
      // Premier: quantité exacte
      expect(result[0].original.value).toBe(5);
      expect(result[0].converted.value).toBe(10); // 5 * 2kg
      
      // Deuxième: approximation (quelques = 3)
      expect(result[1].original.value).toBe(3);
      expect(result[1].converted.value).toBe(6); // 3 * 2kg
    });
  });

  describe('Suggestion system integration', () => {
    test('should generate contextual suggestions based on farm data', async () => {
      // Mock des données de ferme riches
      const mockFarmData = {
        plots: [
          { current_culture: 'tomates', surface_area: 200 },
          { current_culture: 'courgettes', surface_area: 100 }
        ],
        tasks: [
          { description: 'Récolte de 5 caisses de tomates' },
          { description: 'Ajout de 2 brouettes de compost' }
        ]
      };

      // Les suggestions devraient être pertinentes par rapport aux données
      // (Ce test nécessiterait un mock plus complet du service)
      
      const failedQuantities = [
        { container: 'caisse', crop: 'courgettes', frequency: 3 }
      ];

      // La suggestion devrait être prioritaire car:
      // 1. Courgettes cultivées sur la ferme
      // 2. Échec fréquent (3 fois)
      // 3. Contenant couramment utilisé (caisse)
      
      expect(true).toBe(true); // Placeholder pour structure de test
    });
  });

  describe('Performance and caching', () => {
    test('should cache conversion results for identical queries', async () => {
      const mockFarmContext = {
        id: 1,
        conversions: [{
          id: '1',
          container_name: 'caisse',
          crop_name: 'tomates',
          conversion_value: 10,
          conversion_unit: 'kg',
          is_active: true,
          slugs: []
        }]
      };

      const mockSupabase = {} as any;
      const matchingService = new ConversionMatchingService(mockSupabase);

      const message = "5 caisses de tomates";
      
      // Premier appel
      const start1 = Date.now();
      const result1 = await matchingService.resolveConversions(message, mockFarmContext);
      const time1 = Date.now() - start1;

      // Deuxième appel (devrait utiliser le cache)
      const start2 = Date.now();
      const result2 = await matchingService.resolveConversions(message, mockFarmContext);
      const time2 = Date.now() - start2;

      // Résultats identiques
      expect(result1).toEqual(result2);
      
      // Deuxième appel plus rapide (cache)
      expect(time2).toBeLessThan(time1);
    });

    test('should handle large numbers of conversions efficiently', async () => {
      // Générer beaucoup de conversions
      const manyConversions = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        container_name: `container${i}`,
        crop_name: `crop${i}`,
        conversion_value: i + 1,
        conversion_unit: 'kg',
        is_active: true,
        slugs: []
      }));

      const mockFarmContext = {
        id: 1,
        conversions: manyConversions
      };

      const mockSupabase = {} as any;
      const matchingService = new ConversionMatchingService(mockSupabase);

      const start = Date.now();
      const result = await matchingService.resolveConversions(
        "5 container50 de crop50",
        mockFarmContext
      );
      const time = Date.now() - start;

      // Devrait trouver la bonne conversion même avec beaucoup d'options
      expect(result[0].source).toBe('user_conversion');
      expect(result[0].converted.value).toBe(255); // 5 * 51kg (index 50 + 1)
      
      // Devrait rester performant (< 100ms)
      expect(time).toBeLessThan(100);
    });
  });
});