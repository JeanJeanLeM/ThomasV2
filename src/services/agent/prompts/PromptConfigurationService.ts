import { SupabaseClient } from '@supabase/supabase-js';
import { AdvancedPromptManager } from './AdvancedPromptManager';
import { ChatPrompt } from '../types/AgentTypes';

/**
 * Service de configuration des prompts - Interface de base
 * Fournit les utilitaires pour gestion via Supabase Dashboard
 * Future base pour interface admin dédiée
 * 
 * Fonctionnalités:
 * - Listing prompts avec méta-informations
 * - Génération de scripts SQL pour modifications
 * - Validation en masse
 * - Export/Import configurations
 * - Backup et restauration
 */
export class PromptConfigurationService {
  constructor(
    private supabase: SupabaseClient,
    private promptManager: AdvancedPromptManager
  ) {}

  /**
   * Liste complète des prompts avec informations détaillées
   */
  async getAllPromptsWithDetails(): Promise<PromptConfigurationReport> {
    console.log('📋 Listing all prompts with configuration details...');

    try {
      const { data: prompts, error } = await this.supabase
        .from('chat_prompts')
        .select('*')
        .order('name, version', { ascending: true });

      if (error) {
        throw new Error(`Erreur récupération prompts: ${error.message}`);
      }

      const promptsData = prompts || [];
      
      // Groupement par nom
      const promptGroups = new Map<string, ChatPrompt[]>();
      promptsData.forEach(prompt => {
        if (!promptGroups.has(prompt.name)) {
          promptGroups.set(prompt.name, []);
        }
        promptGroups.get(prompt.name)!.push(prompt);
      });

      // Analyse de chaque groupe
      const promptAnalysis: PromptAnalysis[] = [];
      
      for (const [name, versions] of promptGroups.entries()) {
        const activeVersion = versions.find(v => v.is_active);
        const totalVersions = versions.length;
        const latestVersion = versions[versions.length - 1];
        
        const analysis: PromptAnalysis = {
          name,
          active_version: activeVersion?.version || 'none',
          total_versions: totalVersions,
          latest_version: latestVersion.version,
          last_updated: latestVersion.updated_at,
          content_length: activeVersion?.content.length || 0,
          has_examples: (activeVersion?.examples || []).length > 0,
          has_variables: this.hasVariables(activeVersion?.content || ''),
          has_conditions: this.hasConditions(activeVersion?.content || ''),
          metadata: activeVersion?.metadata || {},
          status: this.getPromptStatus(activeVersion, versions),
          recommendations: this.getPromptRecommendations(activeVersion, versions)
        };

        promptAnalysis.push(analysis);
      }

      return {
        total_prompts: promptGroups.size,
        total_versions: promptsData.length,
        active_prompts: promptAnalysis.filter(p => p.status !== 'inactive').length,
        prompts: promptAnalysis.sort((a, b) => a.name.localeCompare(b.name)),
        system_health: this.assessSystemHealth(promptAnalysis)
      };

    } catch (error) {
      console.error('❌ Error getting prompts details:', error);
      throw error;
    }
  }

  /**
   * Génération de script SQL pour modification prompt
   */
  generateUpdateScript(
    name: string,
    newContent: string,
    newExamples: any[] = [],
    metadata: Record<string, any> = {}
  ): string {
    
    const escapedContent = newContent.replace(/'/g, "''");
    const examplesJson = JSON.stringify(newExamples);
    const metadataJson = JSON.stringify(metadata);

    return `-- Script généré pour mise à jour prompt: ${name}
-- Date: ${new Date().toLocaleString('fr-FR')}

-- 1. Désactiver version actuelle
UPDATE public.chat_prompts 
SET is_active = false,
    updated_at = NOW()
WHERE name = '${name}' AND is_active = true;

-- 2. Créer nouvelle version
INSERT INTO public.chat_prompts (name, content, examples, version, is_active, metadata)
VALUES (
  '${name}',
  '${escapedContent}',
  '${examplesJson}'::jsonb,
  (
    SELECT COALESCE(
      (SELECT (split_part(version, '.', 1)::int || '.' || (split_part(version, '.', 2)::int + 1)::text)
       FROM chat_prompts 
       WHERE name = '${name}' 
       ORDER BY version DESC 
       LIMIT 1),
      '1.0'
    )
  ),
  true,
  '${metadataJson}'::jsonb
);

-- 3. Vérification
SELECT name, version, is_active, updated_at 
FROM chat_prompts 
WHERE name = '${name}' 
ORDER BY version DESC;`;
  }

  /**
   * Validation en masse de tous les prompts
   */
  async validateAllPrompts(): Promise<ValidationReport[]> {
    console.log('🔍 Validating all prompts...');

    const configuration = await this.getAllPromptsWithDetails();
    const validationResults: ValidationReport[] = [];

    for (const promptAnalysis of configuration.prompts) {
      try {
        const prompt = await this.promptManager.getPrompt(promptAnalysis.name);
        
        // Validation de base
        const issues: string[] = [];
        const warnings: string[] = [];

        // Vérifications critiques
        if (!prompt.is_active) {
          issues.push('Prompt inactif');
        }

        if (!prompt.content || prompt.content.length < 50) {
          issues.push('Contenu trop court');
        }

        if (prompt.content.length > 8000) {
          warnings.push('Contenu très long - impact performance possible');
        }

        // Vérifications variables
        const variables = this.extractVariables(prompt.content);
        if (variables.length > 10) {
          warnings.push('Beaucoup de variables - vérifier nécessité');
        }

        // Vérifications exemples
        if (prompt.examples.length === 0) {
          warnings.push('Aucun exemple fourni - précision réduite possible');
        }

        validationResults.push({
          prompt_name: promptAnalysis.name,
          version: promptAnalysis.active_version,
          valid: issues.length === 0,
          issues,
          warnings,
          last_check: new Date().toISOString()
        });

      } catch (error) {
        validationResults.push({
          prompt_name: promptAnalysis.name,
          version: 'unknown',
          valid: false,
          issues: [`Erreur validation: ${error.message}`],
          warnings: [],
          last_check: new Date().toISOString()
        });
      }
    }

    console.log(`✅ Validation completed: ${validationResults.filter(r => r.valid).length}/${validationResults.length} valid`);
    return validationResults;
  }

  /**
   * Export de la configuration complète
   */
  async exportConfiguration(): Promise<PromptConfigurationExport> {
    console.log('📤 Exporting prompt configuration...');

    const configuration = await this.getAllPromptsWithDetails();
    const validationResults = await this.validateAllPrompts();

    // Récupération du contenu complet des prompts actifs
    const fullPrompts: ChatPrompt[] = [];
    for (const promptInfo of configuration.prompts) {
      if (promptInfo.status !== 'inactive') {
        try {
          const prompt = await this.promptManager.getPrompt(promptInfo.name);
          fullPrompts.push(prompt);
        } catch (error) {
          console.warn(`⚠️ Could not export prompt ${promptInfo.name}:`, error);
        }
      }
    }

    return {
      export_date: new Date().toISOString(),
      thomas_agent_version: '2.0',
      configuration_summary: configuration,
      validation_results: validationResults,
      full_prompts: fullPrompts,
      deployment_scripts: {
        recreate_all: this.generateRecreateAllScript(fullPrompts),
        backup_current: this.generateBackupScript()
      }
    };
  }

  /**
   * Import et restauration d'une configuration
   */
  async importConfiguration(
    exportData: PromptConfigurationExport,
    options: ImportOptions = { overwrite: false, validate: true }
  ): Promise<ImportResult> {
    
    console.log('📥 Importing prompt configuration...');

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: []
    };

    try {
      for (const prompt of exportData.full_prompts) {
        // Validation si demandée
        if (options.validate) {
          // TODO: Ajouter validation avec PromptTemplateFactory
        }

        // Vérifier existence
        const exists = await this.checkPromptExists(prompt.name, prompt.version);
        
        if (exists && !options.overwrite) {
          result.skipped++;
          continue;
        }

        // Import
        const { error } = await this.supabase
          .from('chat_prompts')
          .upsert({
            ...prompt,
            updated_at: new Date().toISOString()
          });

        if (error) {
          result.errors.push(`${prompt.name}: ${error.message}`);
          result.success = false;
        } else {
          result.imported++;
        }
      }

      console.log(`✅ Import completed: ${result.imported} imported, ${result.skipped} skipped`);
      return result;

    } catch (error) {
      console.error('❌ Import failed:', error);
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error.message]
      };
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Vérification présence de variables
   */
  private hasVariables(content: string): boolean {
    return /\{\{[^}]+\}\}/.test(content);
  }

  /**
   * Vérification présence de conditions
   */
  private hasConditions(content: string): boolean {
    return /\{\{#if\s+\w+\}\}/.test(content);
  }

  /**
   * Détermination du statut d'un prompt
   */
  private getPromptStatus(
    activePrompt: ChatPrompt | undefined, 
    allVersions: ChatPrompt[]
  ): PromptStatus {
    if (!activePrompt) return 'inactive';
    if (allVersions.length === 1) return 'single_version';
    if (activePrompt.version === allVersions[allVersions.length - 1].version) return 'latest_active';
    return 'active_not_latest';
  }

  /**
   * Génération de recommandations pour un prompt
   */
  private getPromptRecommendations(
    activePrompt: ChatPrompt | undefined,
    allVersions: ChatPrompt[]
  ): string[] {
    const recommendations: string[] = [];

    if (!activePrompt) {
      recommendations.push('🚨 Activer une version de ce prompt');
      return recommendations;
    }

    if (activePrompt.content.length > 6000) {
      recommendations.push('⚡ Considérer compaction pour performance');
    }

    if (activePrompt.examples.length === 0) {
      recommendations.push('📚 Ajouter exemples pour meilleure précision');
    }

    if (allVersions.length > 5) {
      recommendations.push('🗑️ Nettoyer anciennes versions non utilisées');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Configuration optimale');
    }

    return recommendations;
  }

  /**
   * Évaluation santé système
   */
  private assessSystemHealth(prompts: PromptAnalysis[]): 'healthy' | 'warning' | 'critical' {
    const inactiveCount = prompts.filter(p => p.status === 'inactive').length;
    const criticalPrompts = ['thomas_agent_system', 'tool_selection', 'intent_classification'];
    const missingCritical = criticalPrompts.filter(name => 
      !prompts.some(p => p.name === name && p.status !== 'inactive')
    ).length;

    if (missingCritical > 0) return 'critical';
    if (inactiveCount > prompts.length * 0.3) return 'warning';
    return 'healthy';
  }

  /**
   * Extraction des variables d'un contenu
   */
  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}#\/\s]+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
  }

  /**
   * Vérification existence prompt
   */
  private async checkPromptExists(name: string, version: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('chat_prompts')
      .select('id')
      .eq('name', name)
      .eq('version', version)
      .single();

    return !!data;
  }

  /**
   * Génération script de recréation complète
   */
  private generateRecreateAllScript(prompts: ChatPrompt[]): string {
    const scripts = prompts.map(prompt => {
      const escapedContent = prompt.content.replace(/'/g, "''");
      const examplesJson = JSON.stringify(prompt.examples);
      const metadataJson = JSON.stringify(prompt.metadata);

      return `-- ${prompt.name} v${prompt.version}
INSERT INTO public.chat_prompts (name, content, examples, version, is_active, metadata)
VALUES (
  '${prompt.name}',
  '${escapedContent}',
  '${examplesJson}'::jsonb,
  '${prompt.version}',
  ${prompt.is_active},
  '${metadataJson}'::jsonb
) ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  examples = EXCLUDED.examples,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();`;
    });

    return `-- Script de recréation complète des prompts Thomas Agent
-- Généré le: ${new Date().toLocaleString('fr-FR')}

${scripts.join('\n\n')}

-- Validation finale
SELECT name, version, is_active, char_length(content) as content_length
FROM chat_prompts 
WHERE name IN (${prompts.map(p => `'${p.name}'`).join(', ')})
ORDER BY name, version;`;
  }

  /**
   * Génération script de sauvegarde
   */
  private generateBackupScript(): string {
    return `-- Script de sauvegarde prompts Thomas Agent
-- Généré le: ${new Date().toLocaleString('fr-FR')}

-- Créer table de sauvegarde
CREATE TABLE IF NOT EXISTS prompt_backup_${Date.now()} AS
SELECT * FROM chat_prompts 
WHERE name IN ('thomas_agent_system', 'tool_selection', 'intent_classification', 'response_synthesis');

-- Vérifier sauvegarde
SELECT 'Backup created with ' || COUNT(*) || ' prompts' as backup_status
FROM prompt_backup_${Date.now()};`;
  }

  /**
   * Génération de rapport de santé pour dashboard
   */
  async generateHealthDashboard(): Promise<string> {
    const config = await this.getAllPromptsWithDetails();
    const validation = await this.validateAllPrompts();
    
    const healthIndicators = {
      '🟢': config.system_health === 'healthy',
      '🟡': config.system_health === 'warning', 
      '🔴': config.system_health === 'critical'
    };

    const statusIcon = Object.keys(healthIndicators).find(icon => 
      healthIndicators[icon as keyof typeof healthIndicators]
    ) || '🔴';

    return `# 📊 Thomas Agent Prompts - Dashboard

## ${statusIcon} État Système: ${config.system_health.toUpperCase()}

### 📈 Statistiques Générales
- **Prompts actifs**: ${config.active_prompts}/${config.total_prompts}
- **Versions totales**: ${config.total_versions}
- **Validation**: ${validation.filter(v => v.valid).length}/${validation.length} OK

### 🎯 Prompts Critiques
${config.prompts
  .filter(p => ['thomas_agent_system', 'tool_selection', 'intent_classification'].includes(p.name))
  .map(p => `- **${p.name}** v${p.active_version} ${p.status === 'latest_active' ? '✅' : '⚠️'}`)
  .join('\n')}

### ⚠️ Actions Recommandées
${config.prompts
  .flatMap(p => p.recommendations.filter(r => r.includes('🚨')))
  .map(r => `- ${r}`)
  .join('\n') || '- ✅ Aucune action critique requise'}

### 🔧 Commandes Rapides Supabase Dashboard

\`\`\`sql
-- Voir tous les prompts actifs
SELECT name, version, char_length(content) as length, updated_at
FROM chat_prompts 
WHERE is_active = true 
ORDER BY name;

-- Désactiver un prompt
UPDATE chat_prompts SET is_active = false WHERE name = 'NOM_PROMPT';

-- Activer une version spécifique  
UPDATE chat_prompts SET is_active = true WHERE name = 'NOM_PROMPT' AND version = 'X.Y';
\`\`\`

---
*Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}*`;
  }

  /**
   * Interface de modification rapide (génération SQL)
   */
  generateQuickEditCommands(): Record<string, string> {
    return {
      'activer_prompt': `UPDATE chat_prompts SET is_active = true WHERE name = 'PROMPT_NAME' AND version = 'VERSION';`,
      'desactiver_prompt': `UPDATE chat_prompts SET is_active = false WHERE name = 'PROMPT_NAME';`,
      'voir_versions': `SELECT name, version, is_active, updated_at FROM chat_prompts WHERE name = 'PROMPT_NAME' ORDER BY version DESC;`,
      'voir_contenu': `SELECT name, version, char_length(content) as length, content FROM chat_prompts WHERE name = 'PROMPT_NAME' AND is_active = true;`,
      'nettoyer_anciennes': `DELETE FROM chat_prompts WHERE name = 'PROMPT_NAME' AND is_active = false AND version < 'MIN_VERSION';`
    };
  }
}

// ============================================================================  
// INTERFACES & TYPES
// ============================================================================

interface PromptConfigurationReport {
  total_prompts: number;
  total_versions: number;
  active_prompts: number;
  prompts: PromptAnalysis[];
  system_health: 'healthy' | 'warning' | 'critical';
}

interface PromptAnalysis {
  name: string;
  active_version: string;
  total_versions: number;
  latest_version: string;
  last_updated: string;
  content_length: number;
  has_examples: boolean;
  has_variables: boolean;
  has_conditions: boolean;
  metadata: Record<string, any>;
  status: PromptStatus;
  recommendations: string[];
}

type PromptStatus = 'latest_active' | 'active_not_latest' | 'inactive' | 'single_version';

interface ValidationReport {
  prompt_name: string;
  version: string;
  valid: boolean;
  issues: string[];
  warnings: string[];
  last_check: string;
}

interface PromptConfigurationExport {
  export_date: string;
  thomas_agent_version: string;
  configuration_summary: PromptConfigurationReport;
  validation_results: ValidationReport[];
  full_prompts: ChatPrompt[];
  deployment_scripts: {
    recreate_all: string;
    backup_current: string;
  };
}

interface ImportOptions {
  overwrite: boolean;
  validate: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

