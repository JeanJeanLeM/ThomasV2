import { PlotMatchingService } from '../PlotMatchingService';
import { FarmContext, PlotWithDetails } from '../../types/AgentTypes';

/**
 * Tests pour PlotMatchingService
 * Validation des patterns de matching français
 */
describe('PlotMatchingService', () => {
  let plotMatchingService: PlotMatchingService;
  let mockFarmContext: FarmContext;

  beforeEach(() => {
    // Mock Supabase client
    const mockSupabase = {} as any;
    plotMatchingService = new PlotMatchingService(mockSupabase);

    // Mock farm context avec plots de test
    mockFarmContext = {
      id: 1,
      name: 'Ferme Test',
      plots: [
        {
          id: 1,
          name: 'Serre 1',
          type: 'serre_plastique',
          aliases: ['serre1', 'grande serre'],
          llm_keywords: ['serre', 'tunnel', 'abri'],
          surface_units: [
            {
              id: 11,
              plot_id: 1,
              name: 'Planche 1',
              type: 'planche',
              aliases: ['planche1'],
              llm_keywords: ['planche', 'rang'],
              is_active: true
            },
            {
              id: 12,
              plot_id: 1,
              name: 'Planche 2',
              type: 'planche',
              aliases: ['planche2'],
              llm_keywords: ['planche', 'rang'],
              is_active: true
            }
          ],
          is_active: true
        },
        {
          id: 2,
          name: 'Tunnel Nord',
          type: 'tunnel',
          aliases: ['tunnel_n', 'tunnel_nord'],
          llm_keywords: ['tunnel', 'chenille'],
          surface_units: [],
          is_active: true
        },
        {
          id: 3,
          name: 'Plein Champ 1',
          type: 'plein_champ',
          aliases: ['pc1', 'champ1'],
          llm_keywords: ['champ', 'extérieur'],
          surface_units: [],
          is_active: true
        }
      ],
      materials: [],
      conversions: [],
      preferences: {
        language: 'fr',
        auto_categorization: true,
        confidence_threshold: 0.7,
        fallback_enabled: true
      }
    };
  });

  describe('Pattern Matching - Expressions Naturelles', () => {
    
    test('should match "serre 1" to Serre 1 plot', async () => {
      const matches = await plotMatchingService.matchPlots("j'ai planté dans la serre 1", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].plot.name).toBe('Serre 1');
      expect(matches[0].confidence).toBeGreaterThan(0.8);
      expect(matches[0].match_type).toBe('exact');
    });

    test('should match "tunnel nord" to Tunnel Nord plot', async () => {
      const matches = await plotMatchingService.matchPlots("problème dans le tunnel nord", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].plot.name).toBe('Tunnel Nord');
      expect(matches[0].confidence).toBeGreaterThan(0.8);
    });

    test('should handle hierarchical matching "planche 2 de la serre"', async () => {
      const matches = await plotMatchingService.matchPlots("planche 2 de la serre", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].plot.name).toBe('Serre 1');
      expect(matches[0].surface_units).toBeDefined();
      expect(matches[0].surface_units).toHaveLength(1);
      expect(matches[0].surface_units![0].name).toBe('Planche 2');
    });
  });

  describe('Fuzzy Matching', () => {
    
    test('should handle typos with fuzzy matching', async () => {
      const matches = await plotMatchingService.matchPlots("sere 1", mockFarmContext); // Faute de frappe
      
      expect(matches).toHaveLength(1);
      expect(matches[0].plot.name).toBe('Serre 1');
      expect(matches[0].confidence).toBeGreaterThan(0.6);
      expect(matches[0].match_type).toBe('fuzzy');
    });

    test('should match aliases', async () => {
      const matches = await plotMatchingService.matchPlots("grande serre", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].plot.name).toBe('Serre 1');
      expect(matches[0].match_type).toBe('alias');
    });
  });

  describe('Confidence Scoring', () => {
    
    test('should return matches ordered by confidence', async () => {
      // Texte ambigu qui pourrait matcher plusieurs plots
      const matches = await plotMatchingService.matchPlots("serre", mockFarmContext);
      
      // Vérifier ordre décroissant de confiance
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i-1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });

    test('should filter out low confidence matches', async () => {
      const matches = await plotMatchingService.matchPlots("xyz123", mockFarmContext); // Texte sans correspondance
      
      expect(matches).toHaveLength(0);
    });
  });

  describe('Suggestions Generation', () => {
    
    test('should generate plot suggestions when no match', () => {
      const suggestions = plotMatchingService.generatePlotSuggestions(mockFarmContext);
      
      expect(suggestions).toHaveLength(3); // 3 plots actifs
      expect(suggestions[0]).toContain('Serre 1');
      expect(suggestions[1]).toContain('Tunnel Nord');
      expect(suggestions[2]).toContain('Plein Champ 1');
    });
  });

  describe('Performance & Caching', () => {
    
    test('should cache matching results', async () => {
      const text = "serre 1";
      
      // Premier appel
      const matches1 = await plotMatchingService.matchPlots(text, mockFarmContext);
      
      // Deuxième appel (devrait utiliser le cache)
      const matches2 = await plotMatchingService.matchPlots(text, mockFarmContext);
      
      expect(matches1).toEqual(matches2);
      
      const stats = plotMatchingService.getMatchingStats();
      expect(stats.cacheSize).toBe(1);
    });

    test('should clear cache', async () => {
      await plotMatchingService.matchPlots("serre 1", mockFarmContext);
      
      let stats = plotMatchingService.getMatchingStats();
      expect(stats.cacheSize).toBe(1);
      
      plotMatchingService.clearCache();
      
      stats = plotMatchingService.getMatchingStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Validation', () => {
    
    test('should validate plot matches correctly', async () => {
      const matches = await plotMatchingService.matchPlots("serre 1", mockFarmContext);
      
      expect(matches).toHaveLength(1);
      expect(plotMatchingService.validatePlotMatch(matches[0])).toBe(true);
    });
  });
});

/**
 * Tests d'intégration avec vraies données
 */
describe('PlotMatchingService - Integration', () => {
  // Tests avec vraie base de données (à implémenter plus tard)
  test.skip('should work with real database', async () => {
    // TODO: Tests avec vraie connexion Supabase
  });
});

