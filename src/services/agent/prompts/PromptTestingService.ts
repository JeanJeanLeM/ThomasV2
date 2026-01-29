import { SupabaseClient } from '@supabase/supabase-js';
import { PromptTemplateEngine } from './PromptTemplateEngine';
import { 
  ChatPrompt, 
  AgentContext 
} from '../types/AgentTypes';

/**
 * Service de test des prompts avec cas de test automatisés
 * Validation de la performance et cohérence des prompts
 * 
 * Fonctionnalités:
 * - Exécution de cas de test prédéfinis
 * - Validation de cohérence des réponses
 * - Métriques de performance (temps, tokens)
 * - Comparaison entre versions de prompts
 * - Détection de régression
 */
export class PromptTestingService {
  private testResults = new Map<string, TestResult[]>();
  
  constructor(
    private supabase: SupabaseClient,
    private templateEngine: PromptTemplateEngine,
    private openAIApiKey: string
  ) {}

  /**
   * Exécution d'une suite de tests sur un prompt
   */
  async runTestSuite(
    prompt: ChatPrompt,
    testCases: TestCase[]
  ): Promise<TestSuiteResults> {
    
    console.log(`🧪 Running test suite for prompt: ${prompt.name} v${prompt.version}`);
    const startTime = Date.now();
    
    const results: TestResult[] = [];
    let totalTokens = 0;
    
    for (const testCase of testCases) {
      const testResult = await this.runSingleTest(prompt, testCase);
      results.push(testResult);
      totalTokens += testResult.tokens_used || 0;
    }

    // Calcul des métriques globales
    const passedTests = results.filter(r => r.passed).length;
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length;

    const suiteResults: TestSuiteResults = {
      prompt_name: prompt.name,
      prompt_version: prompt.version,
      total_tests: testCases.length,
      passed_tests: passedTests,
      success_rate: passedTests / testCases.length,
      average_score: avgScore,
      average_execution_time_ms: avgExecutionTime,
      total_tokens_used: totalTokens,
      total_execution_time_ms: Date.now() - startTime,
      results
    };

    // Stockage des résultats
    await this.storeTestResults(suiteResults);
    this.testResults.set(`${prompt.name}_${prompt.version}`, results);

    console.log(`✅ Test suite completed:`, {
      success_rate: `${(suiteResults.success_rate * 100).toFixed(1)}%`,
      avg_score: suiteResults.average_score.toFixed(2),
      avg_time: `${suiteResults.average_execution_time_ms.toFixed(0)}ms`
    });

    return suiteResults;
  }

  /**
   * Exécution d'un test individuel
   */
  private async runSingleTest(
    prompt: ChatPrompt,
    testCase: TestCase
  ): Promise<TestResult> {
    
    const startTime = Date.now();
    
    try {
      // 1. Rendu du template avec contexte de test
      const renderedPrompt = this.templateEngine.render(
        prompt.content,
        testCase.context,
        testCase.variables || {}
      );

      // 2. Appel OpenAI (simulé pour MVP)
      const response = await this.callOpenAI(renderedPrompt, testCase.input);
      
      // 3. Évaluation du résultat
      const evaluation = this.evaluateResponse(
        response.content,
        testCase.expected_output,
        testCase.evaluation_criteria
      );

      return {
        test_case_name: testCase.name,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: response.content,
        score: evaluation.score,
        passed: evaluation.score >= testCase.pass_threshold,
        execution_time_ms: Date.now() - startTime,
        tokens_used: response.tokens_used,
        evaluation_details: evaluation.details,
        model_used: response.model
      };

    } catch (error) {
      console.error(`❌ Test case "${testCase.name}" failed:`, error);
      
      return {
        test_case_name: testCase.name,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: '',
        score: 0,
        passed: false,
        execution_time_ms: Date.now() - startTime,
        error_message: error.message
      };
    }
  }

  /**
   * Appel OpenAI pour test (ou simulation)
   */
  private async callOpenAI(
    systemPrompt: string, 
    userMessage: string
  ): Promise<OpenAIResponse> {
    
    // Pour MVP, simulation de réponse
    // TODO: Remplacer par vrai appel OpenAI
    
    const simulatedResponse: OpenAIResponse = {
      content: `Réponse simulée pour: "${userMessage}"`,
      tokens_used: Math.floor(systemPrompt.length / 4) + Math.floor(userMessage.length / 4),
      model: 'gpt-4o-mini-simulated'
    };

    // Simulation du délai API
    await new Promise(resolve => setTimeout(resolve, 100));

    return simulatedResponse;
  }

  /**
   * Évaluation d'une réponse selon les critères
   */
  private evaluateResponse(
    actual: string,
    expected: string,
    criteria: EvaluationCriteria
  ): EvaluationResult {
    
    const details: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Critère 1: Similarité de contenu
    if (criteria.content_similarity) {
      const similarity = this.calculateContentSimilarity(actual, expected);
      totalScore += similarity * criteria.content_similarity.weight;
      totalWeight += criteria.content_similarity.weight;
      details.push(`Similarité contenu: ${(similarity * 100).toFixed(1)}%`);
    }

    // Critère 2: Présence de mots-clés requis
    if (criteria.required_keywords) {
      const keywordScore = this.checkRequiredKeywords(actual, criteria.required_keywords.keywords);
      totalScore += keywordScore * criteria.required_keywords.weight;
      totalWeight += criteria.required_keywords.weight;
      details.push(`Mots-clés requis: ${(keywordScore * 100).toFixed(1)}%`);
    }

    // Critère 3: Tone/style français
    if (criteria.language_style) {
      const styleScore = this.evaluateLanguageStyle(actual);
      totalScore += styleScore * criteria.language_style.weight;
      totalWeight += criteria.language_style.weight;
      details.push(`Style français: ${(styleScore * 100).toFixed(1)}%`);
    }

    // Critère 4: Structure de réponse
    if (criteria.response_structure) {
      const structureScore = this.evaluateResponseStructure(actual, criteria.response_structure.expected_format);
      totalScore += structureScore * criteria.response_structure.weight;
      totalWeight += criteria.response_structure.weight;
      details.push(`Structure: ${(structureScore * 100).toFixed(1)}%`);
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: finalScore,
      details
    };
  }

  /**
   * Calcul de similarité de contenu
   */
  private calculateContentSimilarity(actual: string, expected: string): number {
    // Algorithme de similarité simple basé sur mots communs
    const actualWords = actual.toLowerCase().split(/\s+/);
    const expectedWords = expected.toLowerCase().split(/\s+/);
    
    const commonWords = actualWords.filter(word => expectedWords.includes(word));
    const totalWords = Math.max(actualWords.length, expectedWords.length);
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Vérification des mots-clés requis
   */
  private checkRequiredKeywords(text: string, keywords: string[]): number {
    const textLower = text.toLowerCase();
    const foundKeywords = keywords.filter(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    
    return keywords.length > 0 ? foundKeywords.length / keywords.length : 1;
  }

  /**
   * Évaluation du style français
   */
  private evaluateLanguageStyle(text: string): number {
    let score = 0.5; // Score de base
    
    // Indicateurs positifs français
    if (text.includes('j\'ai') || text.includes('vous')) score += 0.1;
    if (text.match(/[àâäéèêëïîôöùûüÿç]/)) score += 0.1;
    if (text.includes('été') || text.includes('créé')) score += 0.1;
    if (text.match(/\b(le|la|les|un|une|des)\b/)) score += 0.1;
    
    // Indicateurs négatifs  
    if (text.includes('I have') || text.includes('you have')) score -= 0.2;
    if (text.match(/\b(the|a|an)\b/)) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Évaluation de la structure de réponse
   */
  private evaluateResponseStructure(text: string, expectedFormat: string): number {
    // Vérifications basiques de structure
    let score = 0.5;
    
    if (expectedFormat === 'conversational') {
      // Réponse conversationnelle attendue
      if (text.match(/^[A-ZÁÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/)) score += 0.2; // Majuscule début
      if (text.includes('.') || text.includes('!')) score += 0.1; // Ponctuation
      if (text.length > 20 && text.length < 500) score += 0.2; // Longueur raisonnable
    }

    if (expectedFormat === 'json') {
      // Format JSON attendu
      try {
        JSON.parse(text);
        score = 1.0; // JSON valide
      } catch {
        score = 0.1; // JSON invalide
      }
    }

    if (expectedFormat === 'action_confirmation') {
      // Confirmation d'action attendue
      if (text.includes('créé') || text.includes('enregistré')) score += 0.3;
      if (text.match(/✅|🎯|📝/)) score += 0.2; // Émojis positifs
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Stockage des résultats de test
   */
  private async storeTestResults(results: TestSuiteResults): Promise<void> {
    try {
      // TODO: Implémenter table prompt_test_results si besoin de persistance
      console.log('📊 Test results logged:', {
        prompt: `${results.prompt_name}_${results.prompt_version}`,
        success_rate: results.success_rate,
        avg_score: results.average_score
      });

    } catch (error) {
      console.error('❌ Failed to store test results:', error);
      // Non-bloquant
    }
  }

  /**
   * Comparaison entre versions de prompts
   */
  async comparePromptVersions(
    promptName: string,
    version1: string,
    version2: string,
    testCases: TestCase[]
  ): Promise<VersionComparisonResult> {
    
    console.log(`🔍 Comparing prompt versions: ${version1} vs ${version2}`);

    try {
      // Récupérer les deux versions
      const [prompt1, prompt2] = await Promise.all([
        this.getPromptVersion(promptName, version1),
        this.getPromptVersion(promptName, version2)
      ]);

      // Exécuter tests sur les deux versions
      const [results1, results2] = await Promise.all([
        this.runTestSuite(prompt1, testCases),
        this.runTestSuite(prompt2, testCases)
      ]);

      // Calculer les différences
      const comparison: VersionComparisonResult = {
        prompt_name: promptName,
        version_1: version1,
        version_2: version2,
        performance_delta: {
          success_rate: results2.success_rate - results1.success_rate,
          avg_score: results2.average_score - results1.average_score,
          avg_execution_time: results2.average_execution_time_ms - results1.average_execution_time_ms,
          token_usage: results2.total_tokens_used - results1.total_tokens_used
        },
        regression_detected: results2.success_rate < results1.success_rate - 0.1, // 10% de régression
        improvement_areas: this.identifyImprovementAreas(results1, results2),
        recommendation: this.generateVersionRecommendation(results1, results2)
      };

      console.log(`📊 Version comparison completed:`, {
        success_rate_delta: `${(comparison.performance_delta.success_rate * 100).toFixed(1)}%`,
        regression: comparison.regression_detected
      });

      return comparison;

    } catch (error) {
      console.error('❌ Error comparing versions:', error);
      throw new Error(`Échec comparaison versions: ${error.message}`);
    }
  }

  /**
   * Génération de cas de test automatiques
   */
  generateTestCases(farmContext: any): TestCase[] {
    const testCases: TestCase[] = [];

    // Cas de test basiques
    testCases.push({
      name: 'observation_simple',
      input: "j'ai observé des pucerons sur mes tomates serre 1",
      expected_output: "Observation créée: pucerons sur tomates",
      context: this.createTestContext(farmContext),
      evaluation_criteria: {
        content_similarity: { weight: 0.4 },
        required_keywords: { 
          keywords: ['observation', 'pucerons', 'tomates'], 
          weight: 0.3 
        },
        language_style: { weight: 0.2 },
        response_structure: { 
          expected_format: 'action_confirmation', 
          weight: 0.1 
        }
      },
      pass_threshold: 0.75
    });

    testCases.push({
      name: 'task_with_conversion',
      input: "j'ai récolté 3 caisses de courgettes",
      expected_output: "Tâche créée: récolte courgettes avec conversion quantité",
      context: this.createTestContext(farmContext),
      evaluation_criteria: {
        content_similarity: { weight: 0.3 },
        required_keywords: { 
          keywords: ['récolté', 'caisses', 'courgettes'], 
          weight: 0.4 
        },
        language_style: { weight: 0.3 }
      },
      pass_threshold: 0.7
    });

    testCases.push({
      name: 'help_request',
      input: "comment créer une parcelle ?",
      expected_output: "Guide création parcelle avec étapes",
      context: this.createTestContext(farmContext),
      evaluation_criteria: {
        required_keywords: { 
          keywords: ['parcelle', 'créer', 'profil', 'configuration'], 
          weight: 0.6 
        },
        language_style: { weight: 0.4 }
      },
      pass_threshold: 0.8
    });

    // Cas de test contextuels selon ferme
    if (farmContext.plots.length > 0) {
      const plotName = farmContext.plots[0].name;
      testCases.push({
        name: 'contextual_plot_reference',
        input: `problème dans ${plotName.toLowerCase()}`,
        expected_output: `Observation créée pour ${plotName}`,
        context: this.createTestContext(farmContext),
        evaluation_criteria: {
          required_keywords: { 
            keywords: [plotName.toLowerCase()], 
            weight: 0.5 
          },
          response_structure: { 
            expected_format: 'action_confirmation', 
            weight: 0.5 
          }
        },
        pass_threshold: 0.8
      });
    }

    return testCases;
  }

  /**
   * Création d'un contexte de test
   */
  private createTestContext(farmData: any): AgentContext {
    return {
      user: {
        id: 'test-user',
        name: 'Utilisateur Test',
        farm_id: 1
      },
      farm: {
        id: 1,
        name: 'Ferme Test',
        plots: farmData.plots || [],
        materials: farmData.materials || [],
        conversions: farmData.conversions || [],
        preferences: {
          language: 'fr',
          auto_categorization: true,
          confidence_threshold: 0.7,
          fallback_enabled: true
        }
      },
      session_id: 'test-session',
      analysis_id: 'test-analysis',
      availableTools: ['create_observation', 'create_task_done', 'help']
    };
  }

  /**
   * Récupération d'une version spécifique de prompt
   */
  private async getPromptVersion(name: string, version: string): Promise<ChatPrompt> {
    const { data: prompt, error } = await this.supabase
      .from('chat_prompts')
      .select('*')
      .eq('name', name)
      .eq('version', version)
      .eq('is_active', true)
      .single();

    if (error || !prompt) {
      throw new Error(`Prompt ${name} version ${version} non trouvé`);
    }

    return prompt;
  }

  /**
   * Identification des domaines d'amélioration
   */
  private identifyImprovementAreas(
    results1: TestSuiteResults,
    results2: TestSuiteResults
  ): string[] {
    const areas: string[] = [];

    // Analyse comparative
    if (results2.success_rate < results1.success_rate) {
      areas.push('Taux de réussite en baisse - revoir logique principale');
    }

    if (results2.average_score < results1.average_score) {
      areas.push('Score moyen en baisse - améliorer précision des réponses');
    }

    if (results2.average_execution_time_ms > results1.average_execution_time_ms * 1.2) {
      areas.push('Temps d\'exécution augmenté - optimiser longueur du prompt');
    }

    if (results2.total_tokens_used > results1.total_tokens_used * 1.3) {
      areas.push('Usage de tokens augmenté - simplifier le prompt');
    }

    // Analyse spécifique aux échecs
    const failedTests2 = results2.results.filter(r => !r.passed);
    const failedTests1 = results1.results.filter(r => !r.passed);

    if (failedTests2.length > failedTests1.length) {
      const newFailures = failedTests2.filter(f2 => 
        !failedTests1.some(f1 => f1.test_case_name === f2.test_case_name)
      );
      
      if (newFailures.length > 0) {
        areas.push(`Nouveaux échecs détectés: ${newFailures.map(f => f.test_case_name).join(', ')}`);
      }
    }

    return areas.length > 0 ? areas : ['Aucune régression majeure détectée'];
  }

  /**
   * Génération de recommandation version
   */
  private generateVersionRecommendation(
    oldResults: TestSuiteResults,
    newResults: TestSuiteResults
  ): string {
    const successDelta = newResults.success_rate - oldResults.success_rate;
    const scoreDelta = newResults.average_score - oldResults.average_score;

    if (successDelta >= 0.1 && scoreDelta >= 0.05) {
      return '✅ RECOMMANDÉ: Nouvelle version significativement meilleure';
    }

    if (successDelta >= 0.05 || scoreDelta >= 0.02) {
      return '🔄 ACCEPTABLE: Amélioration légère, déployable';
    }

    if (successDelta >= 0 && scoreDelta >= 0) {
      return '⚠️ NEUTRE: Pas d\'amélioration notable, garder ancienne version';
    }

    if (successDelta >= -0.05 && scoreDelta >= -0.02) {
      return '⚠️ ATTENTION: Légère régression, vérifier avant déploiement';
    }

    return '❌ NON RECOMMANDÉ: Régression significative détectée';
  }

  /**
   * Benchmark d'un prompt avec charge de travail
   */
  async benchmarkPrompt(
    prompt: ChatPrompt,
    testLoad: number = 10
  ): Promise<BenchmarkResult> {
    
    console.log(`⚡ Benchmarking prompt ${prompt.name} with ${testLoad} requests...`);
    
    const startTime = Date.now();
    const results: number[] = [];
    
    // Générer cas de test pour benchmark
    const benchmarkCase: TestCase = {
      name: 'benchmark',
      input: 'j\'ai observé un problème sur mes cultures',
      expected_output: 'observation créée',
      context: this.createTestContext({ plots: [], materials: [], conversions: [] }),
      evaluation_criteria: {
        content_similarity: { weight: 1.0 }
      },
      pass_threshold: 0.5
    };

    // Exécutions parallèles
    const promises = Array(testLoad).fill(null).map(async () => {
      const testStart = Date.now();
      await this.runSingleTest(prompt, benchmarkCase);
      return Date.now() - testStart;
    });

    const executionTimes = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    return {
      prompt_name: prompt.name,
      prompt_version: prompt.version,
      test_load: testLoad,
      total_time_ms: totalTime,
      avg_response_time_ms: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      min_response_time_ms: Math.min(...executionTimes),
      max_response_time_ms: Math.max(...executionTimes),
      requests_per_second: testLoad / (totalTime / 1000),
      performance_grade: this.calculatePerformanceGrade(executionTimes)
    };
  }

  /**
   * Calcul de la note de performance
   */
  private calculatePerformanceGrade(executionTimes: number[]): 'A' | 'B' | 'C' | 'D' | 'F' {
    const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    
    if (avgTime < 500) return 'A';      // Excellent < 0.5s
    if (avgTime < 1000) return 'B';     // Bon < 1s  
    if (avgTime < 2000) return 'C';     // Acceptable < 2s
    if (avgTime < 5000) return 'D';     // Lent < 5s
    return 'F';                         // Très lent > 5s
  }

  /**
   * Nettoyage des anciens résultats de test
   */
  clearOldResults(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleared = 0;

    for (const [key, results] of this.testResults.entries()) {
      // Vérifier si résultats trop anciens (approximation)
      if (results.length > 0 && cleared < 10) { // Simple cleanup
        this.testResults.delete(key);
        cleared++;
      }
    }

    console.log(`🗑️ Cleared ${cleared} old test result sets`);
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface TestCase {
  name: string;
  input: string;
  expected_output: string;
  context: AgentContext;
  variables?: Record<string, any>;
  evaluation_criteria: EvaluationCriteria;
  pass_threshold: number;
}

interface TestResult {
  test_case_name: string;
  input: string;
  expected_output: string;
  actual_output: string;
  score: number;
  passed: boolean;
  execution_time_ms: number;
  tokens_used?: number;
  evaluation_details?: string[];
  error_message?: string;
  model_used?: string;
}

interface TestSuiteResults {
  prompt_name: string;
  prompt_version: string;
  total_tests: number;
  passed_tests: number;
  success_rate: number;
  average_score: number;
  average_execution_time_ms: number;
  total_tokens_used: number;
  total_execution_time_ms: number;
  results: TestResult[];
}

interface EvaluationCriteria {
  content_similarity?: { weight: number };
  required_keywords?: { keywords: string[]; weight: number };
  language_style?: { weight: number };
  response_structure?: { expected_format: string; weight: number };
}

interface EvaluationResult {
  score: number;
  details: string[];
}

interface OpenAIResponse {
  content: string;
  tokens_used: number;
  model: string;
}

interface VersionComparisonResult {
  prompt_name: string;
  version_1: string;
  version_2: string;
  performance_delta: {
    success_rate: number;
    avg_score: number;
    avg_execution_time: number;
    token_usage: number;
  };
  regression_detected: boolean;
  improvement_areas: string[];
  recommendation: string;
}

interface BenchmarkResult {
  prompt_name: string;
  prompt_version: string;
  test_load: number;
  total_time_ms: number;
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  requests_per_second: number;
  performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
