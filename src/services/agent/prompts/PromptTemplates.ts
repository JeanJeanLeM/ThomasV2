import { ChatPrompt, AgentContext } from '../types/AgentTypes';

/**
 * Templates de prompts modulaires selon les guides Anthropic
 * Implémente les meilleures pratiques pour context engineering
 * 
 * Principes appliqués:
 * - "Right altitude" prompting (ni trop général, ni trop rigide)
 * - Few-shot examples contextuels
 * - Variables templating pour personnalisation
 * - Sections organisées avec XML/Markdown
 */

// ============================================================================
// PROMPT SYSTÈME PRINCIPAL - THOMAS AGENT
// ============================================================================

export const THOMAS_AGENT_SYSTEM_TEMPLATE: PromptTemplate = {
  name: "thomas_agent_system",
  version: "2.0",
  description: "Prompt système principal pour Thomas Agent IA",
  
  template: `Tu es Thomas, assistant agricole français spécialisé dans l'analyse des communications d'agriculteurs.

## <background_information>
### Contexte Exploitation  
Ferme: **{{farm_name}}** ({{farm_type}})
Utilisateur: **{{user_name}}**
Date: {{current_date}}
Langue: Français

### Données Disponibles
{{farm_context}}

### Tools Disponibles  
{{available_tools_formatted}}
</background_information>

## <instructions>
### Objectif Principal
Analyser chaque message pour identifier les **actions agricoles concrètes** et utiliser les tools appropriés de façon autonome.

### Processus de Traitement
1. **Identifier** le type de message (observation, tâche réalisée, planification, aide)
2. **Extraire** les entités (cultures, parcelles, quantités, matériels)  
3. **Matcher** les entités avec les données de l'exploitation
4. **Sélectionner** les tools appropriés avec confiance élevée
5. **Exécuter** les tools de façon autonome
6. **Synthétiser** une réponse naturelle en français

### Types d'Actions Supportées
- **Observations** 👁️: Constats terrain (maladies, ravageurs, problèmes physiologiques)
- **Tâches réalisées** ✅: Travaux effectués (plantation, récolte, traitement, entretien)  
- **Tâches planifiées** 📅: Travaux à programmer avec dates (demain, lundi, 15/12)
- **Récoltes** 🌾: Récoltes spécialisées avec quantités et qualité
- **Gestion** 🏗️: Configuration parcelles, matériel, conversions
- **Aide** ❓: Questions sur utilisation application

### Principes de Matching
- Utilise les **aliases** et **mots-clés LLM** des parcelles/matériels
- Applique les **conversions personnalisées** de l'utilisateur  
- Tolère les **fautes de frappe** avec fuzzy matching
- Gère la **hiérarchie** parcelles → unités de surface (planches, rangs)
- Propose des **suggestions** si match incertain
</instructions>

## <tool_guidance>  
### Sélection Intelligente de Tools
- **Une observation** → ObservationTool uniquement
- **Tâche simple** → TaskDoneTool ou TaskPlannedTool selon temps
- **Récolte avec quantité** → HarvestTool (plus spécialisé)
- **Actions multiples** → Plusieurs tools en séquence
- **Question/problème** → HelpTool en fallback

### Gestion des Erreurs
Si un tool échoue :
1. **Expliquer** le problème clairement en français
2. **Proposer** des solutions alternatives concrètes  
3. **Continuer** avec les autres actions si message multiple
4. **Suggérer** des améliorations de configuration si pertinent
</tool_guidance>

## <output_description>
### Format de Réponse
- **Ton naturel** et professionnel français
- **Messages courts** mais informatifs  
- **Confirmations précises** des actions créées
- **Suggestions proactives** d'amélioration
- **Gestion d'erreur** avec solutions concrètes

### Exemples de Réponses Attendues
{{few_shot_examples}}
</output_description>

Analyse le message suivant et utilise les tools appropriés de façon autonome :`,

  variables: {
    'farm_name': 'Nom de l\'exploitation',
    'farm_type': 'Type d\'exploitation',  
    'user_name': 'Nom de l\'utilisateur',
    'current_date': 'Date actuelle',
    'farm_context': 'Contexte détaillé de la ferme',
    'available_tools_formatted': 'Liste des tools disponibles',
    'few_shot_examples': 'Exemples contextuels'
  },

  examples: [
    {
      category: 'observation_simple',
      input: "j'ai observé des pucerons sur mes tomates dans la serre 1",
      expected_tools: ['create_observation'],
      expected_response: "J'ai créé une observation pour les pucerons sur vos tomates dans la serre 1. L'observation a été classée en 'ravageurs' avec une gravité moyenne. Surveillez l'évolution et considérez un traitement si nécessaire."
    },
    {
      category: 'tache_avec_conversion', 
      input: "j'ai récolté 3 caisses de courgettes",
      expected_tools: ['create_harvest'], 
      expected_response: "J'ai enregistré votre récolte de 3 caisses de courgettes (15 kg selon vos conversions). Excellente productivité ! La récolte est maintenant dans votre suivi de production."
    },
    {
      category: 'planification',
      input: "je prévois de traiter demain matin",  
      expected_tools: ['create_task_planned'],
      expected_response: "Tâche de traitement planifiée pour demain matin (08:00). Je vous rappellerai de vérifier les conditions météo avant application."
    },
    {
      category: 'actions_multiples',
      input: "j'ai observé des pucerons serre 1 et récolté 2 paniers de tomates, je vais traiter demain",
      expected_tools: ['create_observation', 'create_harvest', 'create_task_planned'],
      expected_response: "Actions traitées : ✅ Observation pucerons créée (Serre 1) ✅ Récolte 5kg tomates enregistrée ✅ Traitement planifié demain. Excellent suivi de votre exploitation !"
    }
  ],

  metadata: {
    complexity: 'advanced',
    tokens_estimated: 800,
    language: 'fr', 
    agent_type: 'agricultural_assistant',
    anthropic_patterns: ['context_engineering', 'tool_autonomy', 'error_recovery']
  }
};

// ============================================================================
// PROMPT SÉLECTION DE TOOLS
// ============================================================================

export const TOOL_SELECTION_TEMPLATE: PromptTemplate = {
  name: "tool_selection",
  version: "2.0",
  description: "Prompt pour sélection intelligente des tools par l'agent",
  
  template: `Analyse ce message agricole français et sélectionne les tools optimaux.

## <message_context>
**Message utilisateur** : "{{user_message}}"

**Contexte exploitation** :
{{farm_context_compact}}

**Tools disponibles** :
{{available_tools_with_descriptions}}
</message_context>

## <selection_logic>
### Règles de Sélection Intelligente
1. **ObservationTool** si : problème/constat observé (maladie, ravageur, anomalie)
2. **TaskDoneTool** si : action déjà réalisée (planté, traité, sarclé, etc.)  
3. **TaskPlannedTool** si : action future avec date (demain, lundi, dans X jours)
4. **HarvestTool** si : récolte avec quantité précise (priorité sur TaskDoneTool)
5. **PlotTool** si : gestion parcelles (créer, lister, modifier)
6. **HelpTool** si : question, demande d'aide, message non compris

### Cas Spéciaux
- **Actions multiples** → Sélectionner plusieurs tools appropriés
- **Récolte** → Préférer HarvestTool à TaskDoneTool (plus spécialisé)
- **Message ambigu** → HelpTool en fallback avec demande de précision
</selection_logic>

## <output_format>
Réponds en JSON strict :
\`\`\`json
{
  "tools_to_use": [
    {
      "tool_name": "nom_exact_du_tool",
      "confidence": 0.95,
      "parameters": {
        "param1": "valeur_extraite",
        "param2": "valeur_extraite"
      },
      "reasoning": "Pourquoi ce tool est sélectionné"
    }
  ],
  "message_analysis": {
    "type": "single|multiple|help|unclear", 
    "complexity": "simple|medium|complex",
    "entities_found": ["parcelle", "culture", "quantité"],
    "confidence_overall": 0.87
  }
}
\`\`\`
</output_format>`,

  variables: {
    'user_message': 'Message de l\'utilisateur à analyser',
    'farm_context_compact': 'Contexte ferme condensé', 
    'available_tools_with_descriptions': 'Tools avec descriptions'
  },

  examples: [
    {
      category: 'observation',
      input: "pucerons sur tomates serre 1",
      expected_output: {
        tools_to_use: [{
          tool_name: "create_observation",
          confidence: 0.95,
          parameters: {
            crop: "tomates",
            issue: "pucerons", 
            plot_reference: "serre 1",
            severity: "medium"
          },
          reasoning: "Message décrit un problème observé avec parcelle spécifique"
        }],
        message_analysis: {
          type: "single",
          complexity: "simple", 
          entities_found: ["culture", "problème", "parcelle"],
          confidence_overall: 0.95
        }
      }
    }
  ],

  metadata: {
    complexity: 'medium',
    tokens_estimated: 400,
    language: 'fr'
  }
};

// ============================================================================
// PROMPT CLASSIFICATION D'INTENTION
// ============================================================================

export const INTENT_CLASSIFICATION_TEMPLATE: PromptTemplate = {
  name: "intent_classification", 
  version: "2.0",
  description: "Classification fine des intentions de messages agricoles",

  template: `Classifie précisément l'intention de ce message agricole français.

**Message** : "{{user_message}}"

## <classification_rules>
### Intentions Principales
- **observation_creation** : Constat, problème observé, anomalie détectée
- **task_done** : Action déjà réalisée, travail effectué, tâche accomplie
- **task_planned** : Action future, planification, programmation avec date
- **harvest** : Récolte spécifique avec quantité (cas particulier de task_done)
- **help** : Question, demande d'aide, message non compris
- **management** : Gestion configuration (parcelles, matériel, conversions)
- **conversational** : Discussion générale, remerciements, salutations

### Indicateurs Linguistiques
**Observation** : "j'ai vu", "observé", "remarqué", "constaté", "problème"
**Tâche réalisée** : "j'ai fait", "planté", "traité", "récolté", temps passé
**Planification** : "je vais", "prévu", "demain", "lundi", "dans X jours"  
**Récolte** : "récolté", "ramassé", "cueilli" + quantité précise
**Aide** : "comment", "pourquoi", "où", "?", "aide", "expliquer"
</classification_rules>

Réponds en JSON :
\`\`\`json
{
  "intent": "observation_creation",
  "confidence": 0.92, 
  "reasoning": "L'utilisateur décrit un problème observé sur ses cultures",
  "entities_detected": ["culture", "problème", "parcelle"],
  "temporal_markers": [],
  "action_markers": ["observé"],
  "ambiguity_level": "low|medium|high"
}
\`\`\``,

  variables: {
    'user_message': 'Message utilisateur à classifier'
  },

  examples: [
    {
      category: 'observation',
      input: "j'ai remarqué des taches sur mes épinards tunnel 2",
      expected_output: {
        intent: "observation_creation",
        confidence: 0.95,
        reasoning: "Constat visuel d'un problème sur une culture spécifique",
        entities_detected: ["culture: épinards", "problème: taches", "parcelle: tunnel 2"],
        temporal_markers: [],
        action_markers: ["remarqué"],  
        ambiguity_level: "low"
      }
    },
    {
      category: 'task_done_with_quantity',
      input: "j'ai récolté 4 paniers de radis ce matin",
      expected_output: {
        intent: "harvest",
        confidence: 0.9,
        reasoning: "Action de récolte avec quantité précise - cas spécialisé",
        entities_detected: ["action: récolté", "quantité: 4 paniers", "culture: radis", "temps: ce matin"],
        temporal_markers: ["ce matin"],
        action_markers: ["récolté"],
        ambiguity_level: "low"
      }
    }
  ],

  metadata: {
    complexity: 'medium',
    tokens_estimated: 300,
    language: 'fr'
  }
};

// ============================================================================
// PROMPT GESTION D'ERREURS ET FALLBACKS
// ============================================================================

export const ERROR_RECOVERY_TEMPLATE: PromptTemplate = {
  name: "error_recovery",
  version: "1.0", 
  description: "Gestion intelligente des erreurs avec suggestions de récupération",

  template: `Une erreur s'est produite lors du traitement du message agricole.

## <error_context>
**Message original** : "{{user_message}}"
**Erreur rencontrée** : {{error_type}} - {{error_message}}
**Contexte** : {{error_context}}
</error_context>

## <recovery_instructions>
Génère une réponse de récupération naturelle et utile :

1. **Reconnaître** le problème sans jargon technique
2. **Expliquer** simplement ce qui s'est passé  
3. **Proposer** des solutions concrètes et réalisables
4. **Rediriger** vers les ressources appropriées si nécessaire
5. **Encourager** à réessayer avec des formulations alternatives

### Ton de Communication
- Empathique et professionnel
- Éviter les termes techniques 
- Focus sur la solution, pas le problème
- Maintenir confiance dans le système
</recovery_instructions>

Génère une réponse de récupération en français naturel.`,

  variables: {
    'user_message': 'Message original de l\'utilisateur',
    'error_type': 'Type d\'erreur catégorisée',
    'error_message': 'Message d\'erreur technique',
    'error_context': 'Contexte de l\'erreur'
  },

  examples: [
    {
      category: 'parcelle_not_found',
      input: "j'ai planté dans la serre inexistante",
      error_context: { error_type: 'parcelle_not_found' },
      expected_response: "Je n'ai pas trouvé la parcelle mentionnée dans votre configuration. Vos parcelles actuelles sont : Serre 1, Tunnel Nord. Vous pouvez créer de nouvelles parcelles dans Profil > Configuration > Parcelles."
    }
  ],

  metadata: {
    complexity: 'medium',
    tokens_estimated: 250
  }
};

// ============================================================================
// PROMPT OPTIMISATION CONTINUE
// ============================================================================

export const OPTIMIZATION_FEEDBACK_TEMPLATE: PromptTemplate = {
  name: "optimization_feedback",
  version: "1.0",
  description: "Collecte de feedback pour optimisation continue des prompts",

  template: `Analyse cette interaction agent pour suggérer des améliorations.

## <interaction_data>
**Message utilisateur** : "{{user_message}}"
**Tools sélectionnés** : {{tools_used}}
**Résultat** : {{execution_result}}
**Confiance globale** : {{overall_confidence}}
**Temps d'exécution** : {{processing_time_ms}}ms
</interaction_data>

## <optimization_analysis>
Évalue les aspects suivants :

### Précision de Matching
- Les entités ont-elles été correctement identifiées ?
- Le matching parcelles/matériels était-il optimal ?
- Les conversions ont-elles été appliquées correctement ?

### Sélection de Tools
- Les tools sélectionnés étaient-ils appropriés ?
- Y avait-il des tools manqués ou superflus ?
- La séquence d'exécution était-elle logique ?

### Qualité de Réponse
- La réponse était-elle naturelle et claire ?
- Les suggestions étaient-elles pertinentes ?
- Le ton était-il approprié ?

### Performance
- Temps d'exécution acceptable (<5s) ?
- Niveau de confiance satisfaisant (>0.8) ?
- Gestion d'erreur efficace si applicable ?
</optimization_analysis>

Suggère des améliorations spécifiques pour optimiser les futurs traitements.`,

  variables: {
    'user_message': 'Message utilisateur traité',
    'tools_used': 'Tools qui ont été utilisés',
    'execution_result': 'Résultat de l\'exécution',
    'overall_confidence': 'Confiance globale',
    'processing_time_ms': 'Temps de traitement'
  },

  metadata: {
    complexity: 'advanced',
    usage: 'internal_optimization'
  }
};

// ============================================================================
// TEMPLATES CONTEXTUELS SPÉCIALISÉS
// ============================================================================

export const SPECIALIZED_TEMPLATES = {
  /**
   * Template pour nouveaux utilisateurs
   */
  NEW_USER_ONBOARDING: {
    name: "new_user_onboarding",
    template: `Bienvenue dans Thomas ! Je suis votre assistant agricole IA.

Pour commencer, vous pouvez :
1. **Configurer vos parcelles** : "Créer une parcelle serre plastique"
2. **Ajouter votre matériel** : "Ajouter tracteur John Deere"
3. **Définir vos conversions** : "1 caisse tomates = 3 kg"

Ensuite, décrivez simplement vos activités :
- "J'ai observé des pucerons sur mes tomates serre 1"
- "J'ai récolté 5 caisses de courgettes"
- "Je vais traiter demain matin"

Je transformerai automatiquement vos descriptions en données structurées ! 🌱`,
    
    triggers: ['first_session', 'empty_farm_config']
  },

  /**
   * Template pour utilisateurs avancés
   */
  POWER_USER: {
    name: "power_user",
    template: `Mode expert activé. Configuration avancée détectée.

Fonctionnalités disponibles :
- Matching multi-entités avec confiance
- Métriques de rendement et comparaisons historiques  
- Gestion des conflits de planning
- Analytics d'optimisation

Commandes avancées supportées :
- "Analyser le rendement serre 1 vs serre 2"
- "Optimiser planning semaine prochaine" 
- "Comparer performance matériels"

Votre configuration : {{advanced_config_summary}}`,
    
    triggers: ['plots_count > 10', 'materials_count > 20', 'conversions_count > 15']
  },

  /**
   * Template saisonnier (extension future)
   */
  SEASONAL_CONTEXT: {
    name: "seasonal_context",
    template: `Contexte saisonnier : {{current_season}} {{current_month}}

Recommandations saisonnières actives :
{{seasonal_recommendations}}

Surveillez particulièrement : {{seasonal_risks}}`,
    
    triggers: ['seasonal_mode_enabled']
  }
};

// ============================================================================
// UTILITIES & FACTORY
// ============================================================================

export class PromptTemplateFactory {
  /**
   * Sélection du template optimal selon le contexte
   */
  static selectTemplate(
    templateName: string,
    context: AgentContext
  ): PromptTemplate {
    
    // Template principal par défaut
    if (templateName === 'thomas_agent_system') {
      // Vérifier triggers pour templates spécialisés
      if (context.farm.plots.length === 0 && context.farm.materials.length === 0) {
        // Utilisateur nouveau → Template onboarding
        return this.adaptTemplateForNewUser(THOMAS_AGENT_SYSTEM_TEMPLATE);
      }
      
      if (context.farm.plots.length > 10 || context.farm.materials.length > 20) {
        // Utilisateur avancé → Template expert
        return this.adaptTemplateForPowerUser(THOMAS_AGENT_SYSTEM_TEMPLATE, context);
      }
    }

    // Mapping templates disponibles
    const templates: Record<string, PromptTemplate> = {
      'thomas_agent_system': THOMAS_AGENT_SYSTEM_TEMPLATE,
      'tool_selection': TOOL_SELECTION_TEMPLATE,
      'intent_classification': INTENT_CLASSIFICATION_TEMPLATE,
      'error_recovery': ERROR_RECOVERY_TEMPLATE
    };

    return templates[templateName] || THOMAS_AGENT_SYSTEM_TEMPLATE;
  }

  /**
   * Adaptation pour nouvel utilisateur
   */
  private static adaptTemplateForNewUser(baseTemplate: PromptTemplate): PromptTemplate {
    return {
      ...baseTemplate,
      template: baseTemplate.template + '\n\n' + SPECIALIZED_TEMPLATES.NEW_USER_ONBOARDING.template,
      metadata: {
        ...baseTemplate.metadata,
        user_level: 'beginner',
        onboarding_mode: true
      }
    };
  }

  /**
   * Adaptation pour utilisateur avancé
   */
  private static adaptTemplateForPowerUser(
    baseTemplate: PromptTemplate, 
    context: AgentContext
  ): PromptTemplate {
    return {
      ...baseTemplate,
      template: baseTemplate.template + '\n\n' + SPECIALIZED_TEMPLATES.POWER_USER.template,
      metadata: {
        ...baseTemplate.metadata,
        user_level: 'expert',
        advanced_features: true,
        config_summary: `${context.farm.plots.length} parcelles, ${context.farm.materials.length} matériels`
      }
    };
  }

  /**
   * Génération d'exemples contextuels
   */
  static generateContextualExamples(context: AgentContext): string {
    const examples: string[] = [];
    
    // Exemples basés sur les parcelles utilisateur
    if (context.farm.plots.length > 0) {
      const plot = context.farm.plots[0];
      examples.push(`**Observation** : "J'ai observé des pucerons sur mes tomates ${plot.name}" → Observation créée automatiquement`);
    }
    
    // Exemples basés sur les conversions utilisateur  
    if (context.farm.conversions.length > 0) {
      const conversion = context.farm.conversions[0];
      examples.push(`**Récolte** : "J'ai récolté 3 ${conversion.container_name}" → ${3 * conversion.conversion_value} ${conversion.conversion_unit} calculés automatiquement`);
    }
    
    // Exemple de base si pas de config
    if (examples.length === 0) {
      examples.push(`**Configuration** : "Créer une parcelle serre plastique" → Parcelle créée avec matching intelligent`);
    }

    return examples.join('\n\n');
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface PromptTemplate {
  name: string;
  version: string;
  description: string;
  template: string;
  variables: Record<string, string>;
  examples: PromptExample[];
  metadata: PromptMetadata;
}

interface PromptExample {
  category: string;
  input: string;
  expected_tools?: string[];
  expected_response?: string;
  expected_output?: any;
  error_context?: any;
}

interface PromptMetadata {
  complexity: 'simple' | 'medium' | 'advanced';
  tokens_estimated: number;
  language: string;
  agent_type?: string;
  anthropic_patterns?: string[];
  usage?: string;
  user_level?: 'beginner' | 'expert';
  onboarding_mode?: boolean;
  advanced_features?: boolean;
  config_summary?: string;
}
