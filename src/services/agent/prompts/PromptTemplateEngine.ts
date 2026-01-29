import { AgentContext, FarmContext } from '../types/AgentTypes';

/**
 * Moteur de templates pour prompts avec variables contextuelles
 * Implémente template engine sophistiqué pour personnalisation
 * 
 * Fonctionnalités:
 * - Variables dynamiques ({{variable}})
 * - Conditions ({{#if condition}})
 * - Boucles ({{#each array}})
 * - Functions helpers ({{formatDate date}})
 * - Context-aware rendering
 */
export class PromptTemplateEngine {
  private helperFunctions = new Map<string, Function>();

  constructor() {
    this.initializeHelpers();
  }

  /**
   * Rendu d'un template avec contexte
   */
  render(template: string, context: AgentContext, variables: Record<string, any> = {}): string {
    let rendered = template;

    console.log('📝 Rendering template with context and variables');

    try {
      // 1. Variables de contexte standard
      rendered = this.replaceStandardVariables(rendered, context);

      // 2. Variables personnalisées
      rendered = this.replaceCustomVariables(rendered, variables);

      // 3. Contexte ferme formaté  
      rendered = this.replaceFarmContext(rendered, context.farm);

      // 4. Tools disponibles
      rendered = this.replaceAvailableTools(rendered, context.availableTools);

      // 5. Exemples few-shot contextuels
      rendered = this.replaceFewShotExamples(rendered, context);

      // 6. Conditions et logique
      rendered = this.processConditionals(rendered, context, variables);

      // 7. Helper functions
      rendered = this.processHelperFunctions(rendered, context, variables);

      // 8. Nettoyage final
      rendered = this.finalCleanup(rendered);

      console.log('✅ Template rendered successfully');
      return rendered;

    } catch (error) {
      console.error('❌ Template rendering error:', error);
      // Fallback vers template original si erreur
      return template;
    }
  }

  /**
   * Remplacement des variables standard
   */
  private replaceStandardVariables(template: string, context: AgentContext): string {
    const replacements = {
      '{{farm_name}}': context.farm.name,
      '{{user_name}}': context.user.name,
      '{{user_id}}': context.user.id,
      '{{farm_id}}': context.farm.id.toString(),
      '{{session_id}}': context.session_id,
      '{{current_date}}': new Date().toLocaleDateString('fr-FR'),
      '{{current_time}}': new Date().toLocaleTimeString('fr-FR'),
      '{{current_datetime}}': new Date().toLocaleString('fr-FR'),
      '{{language}}': context.farm.preferences.language || 'fr'
    };

    let result = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * Remplacement des variables personnalisées
   */
  private replaceCustomVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), stringValue);
    }

    return result;
  }

  /**
   * Formatage du contexte ferme pour les prompts
   */
  private replaceFarmContext(template: string, farm: FarmContext): string {
    const farmContextFormatted = this.formatFarmContext(farm);
    return template.replace(/\{\{farm_context\}\}/g, farmContextFormatted);
  }

  /**
   * Formatage détaillé du contexte ferme
   */
  private formatFarmContext(farm: FarmContext): string {
    const sections: string[] = [];

    // Informations générales
    sections.push(`**Exploitation**: ${farm.name} (ID: ${farm.id})`);

    // Parcelles avec détails
    if (farm.plots.length > 0) {
      const activePlots = farm.plots.filter(p => p.is_active);
      sections.push(`**Parcelles actives (${activePlots.length})**: `);
      
      activePlots.slice(0, 8).forEach(plot => {
        const surfaceUnits = plot.surface_units.length > 0 
          ? ` (${plot.surface_units.length} unités)` 
          : '';
        const aliases = plot.aliases.length > 0 
          ? ` [aliases: ${plot.aliases.slice(0, 2).join(', ')}]`
          : '';
        sections.push(`  • ${plot.name} (${plot.type})${surfaceUnits}${aliases}`);
      });
      
      if (activePlots.length > 8) {
        sections.push(`  • ... et ${activePlots.length - 8} autres parcelles`);
      }
    } else {
      sections.push(`**Parcelles**: Aucune parcelle configurée`);
    }

    // Matériels par catégorie
    if (farm.materials.length > 0) {
      const activeMateriels = farm.materials.filter(m => m.is_active);
      const byCategory = this.groupBy(activeMateriels, 'category');
      
      sections.push(`**Matériels (${activeMateriels.length})**: `);
      
      for (const [category, materials] of Object.entries(byCategory)) {
        const categoryName = this.translateCategory(category);
        const materialsList = materials.slice(0, 3).map((m: any) => 
          m.brand && m.model ? `${m.name} (${m.brand} ${m.model})` : m.name
        ).join(', ');
        
        sections.push(`  • ${categoryName}: ${materialsList}${materials.length > 3 ? '...' : ''}`);
      }
    }

    // Conversions disponibles
    if (farm.conversions.length > 0) {
      sections.push(`**Conversions personnalisées (${farm.conversions.length})**: `);
      
      farm.conversions.slice(0, 5).forEach(conv => {
        sections.push(`  • ${conv.container_name} (${conv.crop_name}) = ${conv.conversion_value} ${conv.conversion_unit}`);
      });
      
      if (farm.conversions.length > 5) {
        sections.push(`  • ... et ${farm.conversions.length - 5} autres conversions`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Formatage des tools disponibles
   */
  private replaceAvailableTools(template: string, availableTools: string[]): string {
    const toolsFormatted = availableTools
      .map(tool => {
        const description = this.getToolDescription(tool);
        return `- **${tool}**: ${description}`;
      })
      .join('\n');

    return template.replace(/\{\{available_tools\}\}/g, toolsFormatted);
  }

  /**
   * Génération d'exemples few-shot contextuels
   */
  private replaceFewShotExamples(template: string, context: AgentContext): string {
    if (!template.includes('{{few_shot_examples}}')) {
      return template;
    }

    const examples = this.selectContextualExamples(context);
    const formattedExamples = examples
      .map(example => `**Exemple** : "${example.input}"\n**Réponse** : "${example.output}"`)
      .join('\n\n');

    return template.replace(/\{\{few_shot_examples\}\}/g, formattedExamples);
  }

  /**
   * Sélection d'exemples pertinents selon le contexte
   */
  private selectContextualExamples(context: AgentContext): Array<{input: string, output: string}> {
    const baseExamples = [
      {
        input: "j'ai observé des pucerons sur mes tomates dans la serre 1",
        output: "J'ai créé une observation pour les pucerons sur vos tomates dans la serre 1. L'observation a été classée en 'ravageurs' avec une gravité moyenne."
      },
      {
        input: "j'ai récolté 3 caisses de courgettes et planté des radis pour demain", 
        output: "J'ai enregistré votre récolte de 3 caisses de courgettes (15 kg selon vos conversions) et programmé la plantation de radis pour demain."
      }
    ];

    // Personnaliser selon le contexte ferme
    const contextualizedExamples = baseExamples.map(example => {
      let input = example.input;
      let output = example.output;

      // Remplacer par vraies parcelles si disponibles
      if (context.farm.plots.length > 0) {
        const firstPlot = context.farm.plots[0];
        input = input.replace('serre 1', firstPlot.name.toLowerCase());
        output = output.replace('serre 1', firstPlot.name);
      }

      // Intégrer conversions réelles
      if (context.farm.conversions.length > 0) {
        const conversion = context.farm.conversions.find(c => c.container_name === 'caisse');
        if (conversion) {
          const convertedValue = 3 * conversion.conversion_value;
          output = output.replace('15 kg', `${convertedValue} ${conversion.conversion_unit}`);
        }
      }

      return { input, output };
    });

    // Ajouter exemple d'aide si peu de données
    if (context.farm.plots.length === 0) {
      contextualizedExamples.push({
        input: "comment créer une parcelle ?",
        output: "Pour ajouter une parcelle, allez dans Profil > Configuration > Parcelles, puis appuyez sur '+'. Vous pouvez définir le type (serre, plein champ...) et créer des unités de surface si nécessaire."
      });
    }

    return contextualizedExamples;
  }

  /**
   * Traitement des conditions dans les templates
   */
  private processConditionals(
    template: string, 
    context: AgentContext, 
    variables: Record<string, any>
  ): string {
    let result = template;

    // Pattern {{#if condition}} content {{/if}} - Compatible ES2015
    const conditionalMatches = result.match(/\{\{#if\s+(\w+)\}\}[\s\S]*?\{\{\/if\}\}/g) || [];
    conditionalMatches.forEach(fullMatch => {
      const conditionMatch = fullMatch.match(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/);
      if (conditionMatch) {
        const [, condition, content] = conditionMatch;
        const conditionValue = this.evaluateCondition(condition, context, variables);
        result = result.replace(fullMatch, conditionValue ? content : '');
      }
    });

    // Pattern {{#unless condition}} content {{/unless}} - Compatible ES2015  
    const unlessMatches = result.match(/\{\{#unless\s+(\w+)\}\}[\s\S]*?\{\{\/unless\}\}/g) || [];
    unlessMatches.forEach(fullMatch => {
      const unlessMatch = fullMatch.match(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/);
      if (unlessMatch) {
        const [, condition, content] = unlessMatch;
        const conditionValue = this.evaluateCondition(condition, context, variables);
        result = result.replace(fullMatch, !conditionValue ? content : '');
      }
    });

    return result;
  }

  /**
   * Évaluation des conditions
   */
  private evaluateCondition(
    condition: string, 
    context: AgentContext, 
    variables: Record<string, any>
  ): boolean {
    // Variables de contexte
    const contextVars = {
      has_plots: context.farm.plots.length > 0,
      has_materials: context.farm.materials.length > 0,
      has_conversions: context.farm.conversions.length > 0,
      many_plots: context.farm.plots.length > 5,
      few_plots: context.farm.plots.length <= 2,
      first_time_user: context.farm.plots.length === 0 && context.farm.materials.length === 0
    };

    // Vérifier dans variables custom
    if (variables.hasOwnProperty(condition)) {
      return Boolean(variables[condition]);
    }

    // Vérifier dans variables contextuelles
    if (contextVars.hasOwnProperty(condition)) {
      return contextVars[condition as keyof typeof contextVars];
    }

    return false;
  }

  /**
   * Traitement des fonctions helper
   */
  private processHelperFunctions(
    template: string, 
    context: AgentContext, 
    variables: Record<string, any>
  ): string {
    let result = template;

    // Pattern {{functionName parameter}}
    const helperPattern = /\{\{(\w+)\s+([^}]+)\}\}/g;
    
    result = result.replace(helperPattern, (match, functionName, parameter) => {
      const helperFn = this.helperFunctions.get(functionName);
      if (helperFn) {
        try {
          return helperFn(parameter, context, variables);
        } catch (error) {
          console.error(`❌ Helper function error: ${functionName}`, error);
          return match; // Retourner original si erreur
        }
      }
      return match;
    });

    return result;
  }

  /**
   * Initialisation des fonctions helper
   */
  private initializeHelpers(): void {
    // Formatage de date
    this.helperFunctions.set('formatDate', (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } catch {
        return dateStr;
      }
    });

    // Formatage de nombre
    this.helperFunctions.set('formatNumber', (num: string) => {
      const parsed = parseFloat(num);
      return isNaN(parsed) ? num : parsed.toLocaleString('fr-FR');
    });

    // Pluralisation française
    this.helperFunctions.set('pluralize', (count: string, singular: string, plural?: string) => {
      const num = parseInt(count);
      if (num <= 1) return singular;
      return plural || singular + 's';
    });

    // Limitation de longueur avec ellipsis
    this.helperFunctions.set('truncate', (text: string, lengthStr: string = '100') => {
      const length = parseInt(lengthStr);
      return text.length > length ? text.substring(0, length) + '...' : text;
    });

    // Formatage liste avec virgules françaises
    this.helperFunctions.set('joinList', (items: string) => {
      try {
        const array = JSON.parse(items);
        if (array.length === 0) return '';
        if (array.length === 1) return array[0];
        if (array.length === 2) return array.join(' et ');
        return array.slice(0, -1).join(', ') + ' et ' + array[array.length - 1];
      } catch {
        return items;
      }
    });
  }

  /**
   * Nettoyage final du template
   */
  private finalCleanup(template: string): string {
    // Supprimer les variables non remplacées  
    let cleaned = template.replace(/\{\{[^}]+\}\}/g, '');
    
    // Nettoyer les lignes vides multiples
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Trim global
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Description des tools pour formatage
   */
  private getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      'create_observation': 'Créer une observation agricole (maladie, ravageur, problème)',
      'create_task_done': 'Enregistrer une tâche agricole réalisée',  
      'create_task_planned': 'Planifier une tâche agricole future',
      'create_harvest': 'Créer une récolte avec quantités et qualité',
      'manage_plot': 'Gérer les parcelles (créer, modifier, lister)',
      'help': 'Obtenir de l\'aide sur l\'utilisation de l\'application'
    };

    return descriptions[toolName] || 'Tool agricole spécialisé';
  }

  /**
   * Traduction des catégories de matériel
   */
  private translateCategory(category: string): string {
    const translations: Record<string, string> = {
      'tracteurs': 'Tracteurs',
      'outils_tracteur': 'Outils tracteur', 
      'outils_manuels': 'Outils manuels',
      'materiel_marketing': 'Matériel marketing',
      'petit_equipement': 'Petit équipement',
      'autre': 'Autre'
    };

    return translations[category] || category;
  }

  /**
   * Groupement par propriété (helper utility)
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Validation d'un template
   */
  validateTemplate(template: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier les variables mal fermées
    const unmatchedOpen = (template.match(/\{\{[^}]*$/g) || []).length;
    const unmatchedClose = (template.match(/^[^{]*\}\}/g) || []).length;
    
    if (unmatchedOpen > 0 || unmatchedClose > 0) {
      errors.push('Variables mal fermées détectées');
    }

    // Vérifier les conditions non fermées
    const ifCount = (template.match(/\{\{#if\s+/g) || []).length;
    const endifCount = (template.match(/\{\{\/if\}\}/g) || []).length;
    
    if (ifCount !== endifCount) {
      errors.push('Conditions if/endif non équilibrées');
    }

    // Vérifier longueur raisonnable
    if (template.length > 10000) {
      warnings.push('Template très long - considérer la compaction');
    }

    if (template.length < 100) {
      warnings.push('Template court - vérifier complétude');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Ajout d'une fonction helper personnalisée
   */
  addHelper(name: string, fn: Function): void {
    this.helperFunctions.set(name, fn);
    console.log(`✅ Helper function "${name}" added`);
  }

  /**
   * Statistiques du moteur de templates
   */
  getEngineStats(): {
    helpers_count: number;
    helpers_available: string[];
  } {
    return {
      helpers_count: this.helperFunctions.size,
      helpers_available: Array.from(this.helperFunctions.keys())
    };
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
