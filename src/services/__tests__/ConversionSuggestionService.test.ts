/**
 * Tests pour ConversionSuggestionService
 * Valide les suggestions intelligentes basées sur les données de la ferme
 */

import { ConversionSuggestionService } from '../ConversionSuggestionService';
import { DirectSupabaseService } from '../DirectSupabaseService';

// Mock DirectSupabaseService
jest.mock('../DirectSupabaseService');
const mockDirectSupabaseService = DirectSupabaseService as jest.Mocked<typeof DirectSupabaseService>;

describe('ConversionSuggestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSmartSuggestions', () => {
    test('should generate suggestions based on farm crops', async () => {
      // Mock des données de parcelles
      mockDirectSupabaseService.directSelect
        .mockResolvedValueOnce({
          data: [
            { id: 1, name: 'Parcelle A', current_culture: 'tomates', surface_area: 100 },
            { id: 2, name: 'Parcelle B', current_culture: 'courgettes', surface_area: 50 }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { 
              action: 'harvest', 
              description: 'Récolte de 5 caisses de tomates',
              quantity_value: 5,
              quantity_unit: 'caisse',
              created_at: '2024-01-01'
            }
          ],
          error: null
        });

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1, // farmId
        'user-1',
        []
      );

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Devrait suggérer des conversions pour les cultures principales
      const tomatoSuggestions = suggestions.filter(s => s.cropName === 'tomates');
      expect(tomatoSuggestions.length).toBeGreaterThan(0);
    });

    test('should prioritize high-frequency failed quantities', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const failedQuantities = [
        { container: 'caisse', crop: 'radis', frequency: 5 },
        { container: 'panier', crop: 'salade', frequency: 2 }
      ];

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        failedQuantities
      );

      // La suggestion avec plus haute fréquence devrait avoir priorité 'high'
      const highPrioritySuggestion = suggestions.find(s => s.priority === 'high');
      expect(highPrioritySuggestion?.containerName).toBe('caisse');
      expect(highPrioritySuggestion?.cropName).toBe('radis');
    });

    test('should suggest specialized containers for inputs', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            {
              action: 'input',
              description: 'Ajout de 2 brouettes de compost',
              quantity_value: 2,
              quantity_unit: 'brouette',
              created_at: '2024-01-01'
            }
          ],
          error: null
        });

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        []
      );

      // Devrait suggérer des conversions pour intrants
      const inputSuggestions = suggestions.filter(s => s.category === 'input');
      expect(inputSuggestions.length).toBeGreaterThan(0);
      
      const compostSuggestion = inputSuggestions.find(s => 
        s.containerName === 'brouette' && s.cropName === 'compost'
      );
      expect(compostSuggestion).toBeDefined();
    });
  });

  describe('analyzeFarmData', () => {
    test('should extract main crops from plots and tasks', async () => {
      const plots = [
        { current_culture: 'tomates', surface_area: 200 },
        { current_culture: 'courgettes', surface_area: 100 },
        { current_culture: 'tomates', surface_area: 150 } // Tomates apparaît 2 fois
      ];

      const tasks = [
        { description: 'Récolte de radis aujourd\'hui' },
        { description: 'Plantation de tomates cerises' }
      ];

      // Les tomates devraient être identifiées comme culture principale
      // (surface totale: 350 vs courgettes: 100)
      
      // Note: Cette méthode est privée, on teste via generateSmartSuggestions
      mockDirectSupabaseService.directSelect
        .mockResolvedValueOnce({ data: plots, error: null })
        .mockResolvedValueOnce({ data: tasks, error: null });

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(1, 'user-1', []);
      
      // Les tomates devraient apparaître plus fréquemment dans les suggestions
      const tomatoSuggestions = suggestions.filter(s => s.cropName.includes('tomate'));
      const courgetteSuggestions = suggestions.filter(s => s.cropName.includes('courgette'));
      
      expect(tomatoSuggestions.length).toBeGreaterThanOrEqual(courgetteSuggestions.length);
    });
  });

  describe('getBaseConversionValues', () => {
    test('should provide realistic conversion values', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValue({ data: [], error: null });

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        [{ container: 'caisse', crop: 'tomates', frequency: 1 }]
      );

      const tomatoSuggestion = suggestions.find(s => 
        s.containerName === 'caisse' && s.cropName === 'tomates'
      );

      expect(tomatoSuggestion).toBeDefined();
      expect(tomatoSuggestion?.suggestedValues).toBeDefined();
      expect(tomatoSuggestion?.suggestedValues.length).toBeGreaterThan(0);
      
      // Vérifier que les valeurs sont réalistes pour une caisse de tomates
      const primaryValue = tomatoSuggestion?.suggestedValues[0];
      expect(primaryValue?.value).toBeGreaterThan(5);
      expect(primaryValue?.value).toBeLessThan(20);
      expect(primaryValue?.unit).toBe('kg');
    });

    test('should provide different values for different container-crop combinations', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValue({ data: [], error: null });

      const failedQuantities = [
        { container: 'caisse', crop: 'tomates', frequency: 1 },
        { container: 'brouette', crop: 'compost', frequency: 1 }
      ];

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        failedQuantities
      );

      const tomatoSuggestion = suggestions.find(s => 
        s.containerName === 'caisse' && s.cropName === 'tomates'
      );
      const compostSuggestion = suggestions.find(s => 
        s.containerName === 'brouette' && s.cropName === 'compost'
      );

      expect(tomatoSuggestion?.suggestedValues[0].value).toBeLessThan(
        compostSuggestion?.suggestedValues[0].value || 0
      );
      // Une brouette de compost pèse plus qu'une caisse de tomates
    });
  });

  describe('categorizeConversion', () => {
    test('should categorize input materials correctly', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValue({ data: [], error: null });

      const inputQuantities = [
        { container: 'sac', crop: 'terreau', frequency: 1 },
        { container: 'brouette', crop: 'fumier', frequency: 1 }
      ];

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        inputQuantities
      );

      const inputSuggestions = suggestions.filter(s => s.category === 'input');
      expect(inputSuggestions.length).toBe(2);
      
      expect(inputSuggestions.some(s => s.cropName === 'terreau')).toBe(true);
      expect(inputSuggestions.some(s => s.cropName === 'fumier')).toBe(true);
    });

    test('should categorize harvest materials correctly', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValue({ data: [], error: null });

      const harvestQuantities = [
        { container: 'caisse', crop: 'tomates', frequency: 1 },
        { container: 'panier', crop: 'radis', frequency: 1 }
      ];

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        harvestQuantities
      );

      const harvestSuggestions = suggestions.filter(s => s.category === 'harvest');
      expect(harvestSuggestions.length).toBe(2);
    });
  });

  describe('deduplicateAndPrioritize', () => {
    test('should remove duplicates and prioritize by importance', async () => {
      mockDirectSupabaseService.directSelect
        .mockResolvedValue({ data: [], error: null });

      const duplicateQuantities = [
        { container: 'caisse', crop: 'tomates', frequency: 5 }, // High priority
        { container: 'caisse', crop: 'tomates', frequency: 2 }, // Duplicate, lower priority
        { container: 'panier', crop: 'radis', frequency: 1 }    // Low priority
      ];

      const suggestions = await ConversionSuggestionService.generateSmartSuggestions(
        1,
        'user-1',
        duplicateQuantities
      );

      // Ne devrait pas avoir de doublons
      const tomatoSuggestions = suggestions.filter(s => 
        s.containerName === 'caisse' && s.cropName === 'tomates'
      );
      expect(tomatoSuggestions.length).toBe(1);
      
      // La suggestion conservée devrait être celle avec la plus haute priorité
      expect(tomatoSuggestions[0].priority).toBe('high');
    });
  });
});