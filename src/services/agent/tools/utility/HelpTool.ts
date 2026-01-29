import { AgentTool } from '../../base/AgentTool';
import { 
  AgentContext, 
  ToolResult, 
  ToolParameters 
} from '../../types/AgentTypes';

/**
 * Tool pour répondre aux questions d'aide et cas non compris
 * Système de fallback intelligent avec suggestions contextuelles
 * 
 * Fonctionnalités:
 * - Classification automatique des types de questions
 * - Réponses prédéfinies pour cas courants
 * - Suggestions basées sur le contexte utilisateur
 * - Redirection vers les bonnes sections de l'app
 * - Feedback pour amélioration continue
 */
export class HelpTool extends AgentTool {
  readonly name = "help";
  readonly description = "Fournir de l'aide et répondre aux questions sur l'utilisation de l'application";
  
  readonly parameters: ToolParameters = {
    type: "object",
    properties: {
      question_type: {
        type: "string",
        description: "Type de question identifié",
        enum: ["parcelle", "materiel", "conversion", "tache", "general", "unclear"]
      },
      user_question: {
        type: "string",
        description: "Question originale de l'utilisateur"
      },
      context_needed: {
        type: "string",
        description: "Informations contextuelles manquantes"
      }
    },
    required: ["question_type", "user_question"]
  };

  constructor() {
    super();
  }

  async execute(params: HelpParams, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log('❓ HelpTool executing:', params);
      
      // 1. Validation des paramètres
      this.validateParameters(params);

      // 2. Classification plus fine si nécessaire
      const refinedType = this.refineQuestionType(params.user_question, params.question_type);

      // 3. Génération de la réponse selon le type
      const helpResponse = this.generateHelpResponse(refinedType, params.user_question, context);

      // 4. Suggestions contextuelles
      const contextualSuggestions = this.generateContextualSuggestions(refinedType, context);

      // 5. Actions recommandées
      const recommendedActions = this.getRecommendedActions(refinedType, context);

      // 6. Logging de l'aide fournie (pour amélioration continue)
      await this.logHelpRequest(params, context, helpResponse.success);

      return {
        success: true,
        data: {
          question_type: refinedType,
          help_category: this.getHelpCategory(refinedType),
          recommended_actions: recommendedActions
        },
        message: helpResponse.content,
        suggestions: contextualSuggestions,
        confidence: helpResponse.confidence
      };

    } catch (error) {
      console.error('❌ HelpTool error:', error);
      return this.handleError(error, { params, context });
    }
  }

  /**
   * Affinement du type de question selon le contenu
   */
  private refineQuestionType(question: string, initialType: string): string {
    const questionLower = question.toLowerCase();

    // Patterns spécifiques pour affiner
    const refinementPatterns = {
      'parcelle_creation': ['créer parcelle', 'ajouter parcelle', 'nouvelle parcelle'],
      'parcelle_modification': ['modifier parcelle', 'changer parcelle', 'supprimer parcelle'],
      'materiel_ajout': ['ajouter matériel', 'nouveau matériel', 'enregistrer matériel'],
      'conversion_setup': ['configurer conversion', 'créer conversion', 'unité personnalisée'],
      'tache_creation': ['créer tâche', 'ajouter tâche', 'nouvelle tâche'],
      'navigation': ['comment aller', 'où trouver', 'navigation'],
      'features': ['fonction', 'utilité', 'à quoi sert']
    };

    for (const [refinedType, patterns] of Object.entries(refinementPatterns)) {
      if (patterns.some(pattern => questionLower.includes(pattern))) {
        return refinedType;
      }
    }

    return initialType;
  }

  /**
   * Génération de la réponse d'aide selon le type
   */
  private generateHelpResponse(
    questionType: string,
    question: string,
    context: AgentContext
  ): { content: string; success: boolean; confidence: number } {
    
    const responses: Record<string, string> = {
      // Parcelles
      'parcelle_creation': `Pour créer une nouvelle parcelle :
1. Allez dans **Profil** → **Configuration** → **Parcelles**  
2. Appuyez sur le bouton **"+"**
3. Renseignez le nom, type (serre, tunnel, plein champ...)
4. Optionnel : créez des unités de surface (planches, rangs)
5. Sauvegardez

💡 Vous pouvez ajouter des **aliases** pour que Thomas vous comprenne mieux !`,

      'parcelle_modification': `Pour modifier une parcelle existante :
1. **Profil** → **Configuration** → **Parcelles**
2. Appuyez sur la parcelle à modifier  
3. Utilisez l'icône **poubelle** pour la désactiver (soft delete)
4. Ou modifiez directement les informations

⚠️ Les parcelles sont **soft deleted** - elles restent dans l'historique.`,

      'materiel_ajout': `Pour ajouter du matériel :
1. **Profil** → **Configuration** → **Matériel**
2. **"+"** → Nouveau matériel
3. Renseignez nom, catégorie, marque, modèle
4. **Important** : Ajoutez des mots-clés LLM pour que Thomas comprenne les synonymes

Exemple mots-clés : "tracteur, tractor, engin, John Deere"`,

      'conversion_setup': `Pour configurer vos conversions personnalisées :
1. **Profil** → **Configuration** → **Conversions**
2. **"+"** → Nouvelle conversion  
3. Définissez : contenat → quantité → unité
4. Exemple : "1 caisse courgettes = 5 kg"

🎯 Thomas utilisera automatiquement vos conversions dans les calculs !`,

      'tache_creation': `Thomas peut créer des tâches automatiquement ! 

**Tâches réalisées** : "J'ai planté des tomates serre 1"
**Tâches planifiées** : "Je vais traiter demain matin"  
**Observations** : "J'ai observé des pucerons sur mes radis"

Ou créez manuellement : **Tâches** → **"+"** → Nouvelle tâche`,

      'navigation': `**Navigation principale :**
🏠 **Accueil** - Vue d'ensemble
📋 **Tâches** - Gestion des tâches
🔬 **Observations** - Constats terrain  
💬 **Chat** - Thomas Assistant IA
👤 **Profil** - Configuration et paramètres

💡 Thomas peut vous guider : "Comment faire X ?" ou "Où trouver Y ?"`,

      'unclear': `Je n'ai pas bien compris votre question. 

**Je peux vous aider avec :**
• Création de parcelles, matériel, conversions
• Gestion des tâches et observations  
• Navigation dans l'application
• Fonctionnalités spécifiques

**Reformulez** en étant plus précis ou demandez :
"Comment créer une parcelle ?" ou "Où voir mes tâches ?"`
    };

    const content = responses[questionType] || responses['unclear'];
    const confidence = questionType === 'unclear' ? 0.6 : 0.9;

    return {
      content,
      success: true,
      confidence
    };
  }

  /**
   * Génération de suggestions contextuelles selon le profil utilisateur
   */
  private generateContextualSuggestions(questionType: string, context: AgentContext): string[] {
    const suggestions: string[] = [];

    // Suggestions selon le contexte ferme
    if (questionType.includes('parcelle') && context.farm.plots.length === 0) {
      suggestions.push('🎯 Vous n\'avez pas encore de parcelles configurées');
      suggestions.push('Commencez par créer votre première parcelle !');
    }

    if (questionType.includes('materiel') && context.farm.materials.length === 0) {
      suggestions.push('🚜 Aucun matériel configuré');
      suggestions.push('Ajoutez vos outils pour un meilleur suivi');
    }

    if (questionType.includes('conversion') && context.farm.conversions.length === 0) {
      suggestions.push('🔄 Aucune conversion personnalisée');
      suggestions.push('Configurez vos unités (caisses, paniers...) pour des calculs automatiques');
    }

    // Suggestions selon l'historique (si disponible)
    suggestions.push('📚 Consultez la documentation complète dans Aide > Guide');
    suggestions.push('💬 Continuez à discuter avec Thomas pour plus de précisions');

    return suggestions;
  }

  /**
   * Actions recommandées selon le type de question
   */
  private getRecommendedActions(questionType: string, context: AgentContext): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    const actionMappings: Record<string, RecommendedAction[]> = {
      'parcelle_creation': [
        {
          title: 'Créer une parcelle',
          navigation: 'Profil → Configuration → Parcelles',
          icon: '🏗️',
          priority: 'high'
        }
      ],
      'materiel_ajout': [
        {
          title: 'Ajouter du matériel', 
          navigation: 'Profil → Configuration → Matériel',
          icon: '🚜',
          priority: 'medium'
        }
      ],
      'conversion_setup': [
        {
          title: 'Configurer conversions',
          navigation: 'Profil → Configuration → Conversions', 
          icon: '🔄',
          priority: 'medium'
        }
      ],
      'tache_creation': [
        {
          title: 'Voir les tâches',
          navigation: 'Tâches',
          icon: '📋',
          priority: 'high'
        }
      ]
    };

    return actionMappings[questionType] || [];
  }

  /**
   * Catégorie d'aide pour organisation
   */
  private getHelpCategory(questionType: string): string {
    const categories: Record<string, string> = {
      'parcelle_creation': 'Configuration',
      'parcelle_modification': 'Configuration', 
      'materiel_ajout': 'Configuration',
      'conversion_setup': 'Configuration',
      'tache_creation': 'Fonctionnalités',
      'navigation': 'Interface',
      'features': 'Fonctionnalités',
      'unclear': 'Général'
    };

    return categories[questionType] || 'Général';
  }

  /**
   * Logging des demandes d'aide pour amélioration
   */
  private async logHelpRequest(
    params: HelpParams,
    context: AgentContext,
    wasSuccessful: boolean
  ): Promise<void> {
    
    try {
      // TODO: Implémenter table help_requests si besoin de stats détaillées
      console.log('📊 Help request logged:', {
        question_type: params.question_type,
        was_successful: wasSuccessful,
        farm_id: context.farm.id,
        user_id: context.user.id
      });
      
    } catch (error) {
      console.error('❌ Failed to log help request:', error);
      // Non-bloquant
    }
  }

  /**
   * Suggestions contextuelles étendues
   */
  protected generateSuggestions(context: AgentContext, errorType?: string): string[] {
    const suggestions = super.generateSuggestions(context, errorType);

    // Ajout de suggestions spécifiques à l'aide
    suggestions.push('Posez des questions spécifiques : "Comment créer..." ou "Où trouver..."');
    suggestions.push('Décrivez vos actions agricoles et Thomas les transformera en données');
    suggestions.push('Utilisez les noms de vos parcelles pour que Thomas comprenne mieux');

    return suggestions;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface HelpParams {
  question_type: 'parcelle' | 'materiel' | 'conversion' | 'tache' | 'general' | 'unclear';
  user_question: string;
  context_needed?: string;
}

interface RecommendedAction {
  title: string;
  navigation: string;
  icon: string;
  priority: 'low' | 'medium' | 'high';
}

