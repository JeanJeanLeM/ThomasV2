import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Service de déploiement des prompts modulaires dans Supabase
 * Découpe le prompt monolithique de UsedPrompt.md en 4 prompts spécialisés
 * pour le pipeline agent (Méthode 2)
 */

export interface DeploymentResult {
  success: boolean;
  deployed_prompts: string[];
  errors: string[];
  total_deployed: number;
}

export interface PromptValidation {
  name: string;
  version: string;
  exists: boolean;
  is_active: boolean;
  is_default: boolean;
}

export class PromptDeploymentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Déployer tous les prompts v3.0 nécessaires pour le pipeline
   */
  async deployAllPrompts(): Promise<DeploymentResult> {
    console.log('🚀 Starting prompt deployment...');
    
    const result: DeploymentResult = {
      success: true,
      deployed_prompts: [],
      errors: [],
      total_deployed: 0
    };

    try {
      // Déployer les 4 prompts dans l'ordre
      await this.deployIntentClassificationPrompt(result);
      await this.deployToolSelectionPrompt(result);
      await this.deployResponseSynthesisPrompt(result);
      await this.deploySystemPrompt(result);

      result.success = result.errors.length === 0;
      result.total_deployed = result.deployed_prompts.length;

      if (result.success) {
        console.log(`✅ Successfully deployed ${result.total_deployed} prompts`);
      } else {
        console.error(`⚠️ Deployment completed with ${result.errors.length} errors`);
      }

      return result;

    } catch (error) {
      console.error('❌ Critical error during deployment:', error);
      result.success = false;
      result.errors.push(`Critical error: ${error.message}`);
      return result;
    }
  }

  /**
   * Prompt 1: Intent Classification
   * Basé sur la section "CLASSIFICATION DES INTENTIONS" de UsedPrompt.md
   */
  private async deployIntentClassificationPrompt(result: DeploymentResult): Promise<void> {
    const content = `Classifie uniquement l'intention de ce message agricole français.

Message: {{user_message}}

Contexte ferme: {{farm_context_summary}}

## Intentions possibles:

### observation
**Indicateurs**: "observé", "remarqué", "constaté", "vu", "il y a", "problème de"
**Règle**: Constat visuel avec problème spécifique (pucerons, maladies, jaunissement, etc.)
Exemples: "j'ai observé des pucerons", "il y a du mildiou", "problème de jaunissement"

### task_done  
**Indicateurs**: Verbe au passé composé + action agricole concrète
**Règle**: "J'ai [action]" avec verbe agricole (planté, semé, traité, désherbé, biné, etc.)
Exemples: "j'ai planté", "j'ai désherbé pendant 2h", "j'ai passé le tracteur"
**IMPORTANT**: Si "récolté" SANS quantité = task_done

### harvest
**Indicateurs**: "récolté" + quantité explicite
**Règle**: Récolte avec quantité chiffrée (kg, L, caisses, etc.)
Exemples: "j'ai récolté 10 kg de tomates", "récolté 3 caisses de courgettes"
**IMPORTANT**: Si "récolté" AVEC quantité = harvest

### task_planned
**Indicateurs**: Verbe au futur ou intention future
**Règle**: "Je vais", "demain", "prévu", "planifier", "il faut que", "je dois"
Exemples: "je vais traiter demain", "prévu de semer lundi", "je dois désherber"

### help
**Indicateurs**: Mot interrogatif ou point d'interrogation
**Règle**: "Comment", "Où", "Quand", "Pourquoi", "Quel", "?"
Exemples: "comment créer une parcelle ?", "où trouver mes conversions ?"

### management
**Indicateurs**: Gestion/configuration de l'application
**Règle**: Créer/modifier/supprimer des entités (parcelles, matériel, conversions)
Exemples: "créer une nouvelle parcelle", "ajouter un outil"

## RÈGLES DE CLASSIFICATION:

1. Si verbe agricole au passé + durée/outil = **task_done**
2. Si "récolté" + quantité = **harvest**
3. Si "récolté" sans quantité = **task_done**
4. Si problème spécifique mentionné = **observation**
5. Si mot interrogatif (?, comment, quand) = **help**
6. Si temps futur = **task_planned**

## GESTION MESSAGES MULTIPLES:

Si plusieurs actions dans un message, identifier l'intent PRINCIPAL (le plus important).
Exemples:
- "j'ai observé des pucerons et récolté des tomates" → **observation** (problème prioritaire)
- "j'ai récolté 10kg et désherbé 2h" → **harvest** (quantité = prioritaire)

Retourne UNIQUEMENT du JSON valide:
{
  "intent": "observation|task_done|task_planned|harvest|help|management",
  "confidence": 0.0-1.0,
  "reasoning": "Explication courte de la classification",
  "has_multiple_actions": true|false
}`;

    await this.upsertPrompt(
      'intent_classification',
      '3.0',
      content,
      [],
      {
        purpose: 'Intent classification pour pipeline agent',
        version: '3.0',
        created_by: 'PromptDeploymentService',
        source: 'UsedPrompt.md - section CLASSIFICATION DES INTENTIONS'
      },
      result
    );
  }

  /**
   * Prompt 2: Tool Selection
   * Basé sur les sections "EXTRACTION DES ENTITÉS" et "DETECTION MULTI-CULTURES"
   */
  private async deployToolSelectionPrompt(result: DeploymentResult): Promise<void> {
    const content = `Sélectionne les tools à utiliser et extrais leurs paramètres.

Message utilisateur: {{user_message}}
Intent détecté: {{intent}}

Tools disponibles:
{{available_tools}}

Contexte ferme:
{{farm_context}}

## RÈGLES D'EXTRACTION PAR INTENT:

### Pour observation:
- **crop**: culture concernée (tomates, courgettes, etc.)
- **issue**: problème spécifique (pucerons, jaunissement, mildiou) - OBLIGATOIRE
- **plot_reference**: mention de parcelle ("serre 1", "tunnel nord")
- **category**: ravageurs|maladies|physiologie|climatique|autre
- **severity**: faible|moyen|élevé (optionnel)

### Pour task_done:
- **action**: verbe à l'infinitif (semer, récolter, traiter, désherber)
- **crop**: culture (optionnel)
- **plot_reference**: parcelle mentionnée
- **plots**: ARRAY des parcelles ["serre 1 planche 1", "serre 1 planche 2"]
- **materials**: ARRAY des outils/matériels ["semoir mono rang", "tracteur"]
- **duration**: {value: number, unit: "minutes"|"heures"}
- **number_of_people**: nombre de personnes (défaut: 1, +1 si "avec stagiaire")
- **quantity**: {value: number, unit: "kg"|"plants"|etc}
- **quantity_nature**: nom spécifique (compost, bouillie, culture)
- **quantity_type**: engrais|produit_phyto|recolte|plantation|vente|autre

### Pour task_planned:
- **action**: action à faire
- **plot_reference**: parcelle
- **scheduled_date**: date au format YYYY-MM-DD
- **scheduled_time**: heure au format HH:MM (optionnel)
- **duration**: durée estimée (optionnel)

### Pour harvest:
- **crop**: culture récoltée (OBLIGATOIRE)
- **quantity**: {value: number, unit: "kg"|"caisses"|etc} (OBLIGATOIRE)
- **plot_reference**: parcelle
- **quality**: excellent|good|fair|poor (optionnel)
- **materials**: outils utilisés

### Pour help:
- **question_type**: type de question
- **context**: contexte de la question

### Pour management:
- **operation**: create|list|search|deactivate
- **entity_type**: plot|material|conversion
- **parameters**: selon l'opération

## EXTRACTION ENTITÉS SPATIALES:

### Parcelles et Planches (plots):
**RÈGLE**: TOUJOURS extraire en array les parcelles/planches mentionnées

Patterns:
- "serre 1" → ["serre 1"]
- "serre 1 planche 1 et 2" → ["serre 1 planche 1", "serre 1 planche 2"]
- "planche A, B et C" → ["planche A", "planche B", "planche C"]

### Matériels (materials):
**RÈGLE**: TOUJOURS extraire en array les outils/matériels

Patterns:
- "semoir mono rang" → ["semoir mono rang"]
- "tracteur et remorque" → ["tracteur", "remorque"]
- Outils: semoir, herse, charrue, pulvérisateur, tracteur, bêche, binette

## DETECTION MULTI-CULTURES:

**RÈGLE FONDAMENTALE**: Détection par VERBE, pas par message

Si un VERBE concerne plusieurs cultures:
- **is_multi_crop**: true
- **crops**: ["tomates", "courgettes", "laitues"]
- **surface_distribution**: {culture: {count: X, unit: "planches|m²|rangs"}}

Exemples:
- "j'ai désherbé des tomates et des courgettes" → is_multi_crop: true
- "j'ai récolté des tomates et j'ai désherbé des laitues" → 2 actions séparées

## QUANTITÉS ET UNITÉS:

Inférence selon le verbe si unité non explicite:
- planté → plants
- semé → graines ou g
- pulvérisé → litres (L)
- récolté → kg

Retourne UNIQUEMENT du JSON valide:
{
  "tools": [
    {
      "tool_name": "create_observation",
      "confidence": 0.95,
      "parameters": {
        "crop": "tomates",
        "issue": "pucerons",
        "plot_reference": "serre 1",
        "category": "ravageurs"
      }
    }
  ]
}

Si message complexe avec plusieurs actions, retourner plusieurs tools dans l'array.`;

    await this.upsertPrompt(
      'tool_selection',
      '3.0',
      content,
      [],
      {
        purpose: 'Tool selection et extraction de paramètres pour pipeline',
        version: '3.0',
        created_by: 'PromptDeploymentService',
        source: 'UsedPrompt.md - sections EXTRACTION et DETECTION MULTI-CULTURES'
      },
      result
    );
  }

  /**
   * Prompt 3: Response Synthesis
   * Nouveau prompt pour générer la réponse naturelle française
   */
  private async deployResponseSynthesisPrompt(result: DeploymentResult): Promise<void> {
    const content = `Génère une réponse naturelle en français basée sur les résultats des tools.

Message utilisateur: {{user_message}}

Résultats des tools exécutés:
{{tool_results}}

Actions créées:
{{actions_created}}

## RÈGLES DE SYNTHÈSE:

### Ton et Style:
- Naturel et professionnel français
- Messages courts mais informatifs
- Confirmations précises des actions créées
- Proactif avec suggestions d'amélioration

### Structure de Réponse:

**Si SUCCÈS (tools réussis):**
1. Confirmation des actions créées avec détails
2. Résumé des données importantes (quantités, parcelles, etc.)
3. Suggestion proactive si pertinent
4. Encouragement positif

**Si ÉCHEC PARTIEL:**
1. Expliquer clairement ce qui a fonctionné
2. Expliquer le problème rencontré
3. Proposer des solutions alternatives concrètes
4. Suggestions pour résoudre le problème

**Si ÉCHEC COMPLET:**
1. Expliquer le problème clairement
2. Proposer 2-3 solutions alternatives
3. Indiquer ce qui manque ou pose problème
4. Encourager à réessayer avec plus de détails

### Exemples de Réponses Attendues:

**Observation simple:**
"J'ai créé une observation pour les pucerons sur vos tomates dans la Serre 1. L'observation a été classée en 'ravageurs' avec une gravité moyenne. Surveillez l'évolution et considérez un traitement si nécessaire."

**Récolte avec conversion:**
"J'ai enregistré votre récolte de 3 caisses de courgettes (15 kg selon vos conversions). Excellente productivité ! La récolte est maintenant dans votre suivi de production."

**Tâche planifiée:**
"Tâche de traitement planifiée pour demain matin (08:00). Je vous rappellerai de vérifier les conditions météo avant application."

**Actions multiples:**
"Actions traitées : ✅ Observation pucerons créée (Serre 1) ✅ Récolte 5kg tomates enregistrée ✅ Traitement planifié demain. Excellent suivi de votre exploitation !"

**Échec avec aide:**
"Je n'ai pas pu identifier la parcelle 'sere 1' (peut-être 'Serre 1' ?). Vos parcelles disponibles : Serre 1, Tunnel Nord, Plein Champ A. Pouvez-vous préciser ?"

### IMPORTANT:
- Utiliser les VRAIS noms matchés (pas les références brutes)
- Mentionner les quantités converties si applicable
- Être spécifique sur ce qui a été créé
- Toujours en français naturel

Retourne UNIQUEMENT du JSON valide:
{
  "content": "Votre réponse naturelle en français",
  "type": "actions|conversational|error",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    await this.upsertPrompt(
      'response_synthesis',
      '3.0',
      content,
      [],
      {
        purpose: 'Génération de réponse naturelle française',
        version: '3.0',
        created_by: 'PromptDeploymentService',
        source: 'Nouveau prompt pour synthèse de réponse'
      },
      result
    );
  }

  /**
   * Prompt 4: System Prompt
   * Prompt système général basé sur UsedPrompt.md
   */
  private async deploySystemPrompt(result: DeploymentResult): Promise<void> {
    const content = `Tu es Thomas, assistant agricole français spécialisé dans l'analyse des communications d'agriculteurs.

## Contexte Exploitation
Ferme: {{farm_name}} ({{farm_type}})
Utilisateur: {{user_name}}
Date: {{current_date}}
Langue: Français

## Ta Mission
Analyser chaque message pour identifier les **actions agricoles concrètes** et utiliser les tools appropriés de façon autonome.

## Tes Capacités

Tu peux traiter:
- **Observations** 👁️: Constats terrain (maladies, ravageurs, problèmes physiologiques)
- **Tâches réalisées** ✅: Travaux effectués (plantation, récolte, traitement, entretien)
- **Tâches planifiées** 📅: Travaux à programmer avec dates
- **Récoltes** 🌾: Récoltes spécialisées avec quantités
- **Gestion** 🏗️: Configuration parcelles, matériel, conversions
- **Aide** ❓: Questions sur l'utilisation

## Tes Principes

### Matching Intelligent:
- Utilise les aliases et mots-clés LLM des parcelles/matériels
- Applique les conversions personnalisées de l'utilisateur
- Tolère les fautes de frappe avec fuzzy matching
- Gère la hiérarchie parcelles → planches → rangs
- Propose des suggestions si match incertain

### Approche Multi-Actions:
- Détecte plusieurs actions dans un message
- Traite chaque action séparément si différents verbes
- Détecte multi-cultures par VERBE (pas par message)

### Gestion d'Erreurs:
- Explique les problèmes clairement en français
- Propose des solutions alternatives concrètes
- Continue avec les autres actions si message multiple
- Suggère des améliorations de configuration

## Ton Style

- Ton naturel et professionnel français
- Messages courts mais informatifs
- Confirmations précises des actions créées
- Suggestions proactives d'amélioration
- Positif et encourageant

## Contexte Disponible

Parcelles: {{farm_plots_count}} parcelles configurées
Matériels: {{farm_materials_count}} matériels disponibles
Conversions: {{farm_conversions_count}} conversions personnalisées

Tu es autonome pour choisir et exécuter les tools appropriés.`;

    await this.upsertPrompt(
      'thomas_agent_system',
      '3.0',
      content,
      [],
      {
        purpose: 'Prompt système principal pour tous les appels',
        version: '3.0',
        created_by: 'PromptDeploymentService',
        source: 'UsedPrompt.md - contexte général et mission'
      },
      result
    );
  }

  /**
   * Upserter un prompt dans la base (insert ou update si existe)
   */
  private async upsertPrompt(
    name: string,
    version: string,
    content: string,
    examples: any[],
    metadata: any,
    result: DeploymentResult
  ): Promise<void> {
    try {
      console.log(`📝 Deploying prompt: ${name} v${version}...`);

      // Vérifier si le prompt existe déjà
      const { data: existing } = await this.supabase
        .from('chat_prompts')
        .select('id, version')
        .eq('name', name)
        .eq('version', version)
        .single();

      if (existing) {
        // Update
        const { error: updateError } = await this.supabase
          .from('chat_prompts')
          .update({
            content,
            examples,
            metadata,
            is_active: true,
            is_default: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Updated prompt: ${name} v${version}`);
      } else {
        // Insert
        const { error: insertError } = await this.supabase
          .from('chat_prompts')
          .insert({
            name,
            version,
            content,
            examples,
            metadata,
            is_active: true,
            is_default: true
          });

        if (insertError) {
          throw insertError;
        }

        console.log(`✅ Inserted prompt: ${name} v${version}`);
      }

      result.deployed_prompts.push(`${name}_v${version}`);

    } catch (error) {
      console.error(`❌ Error deploying ${name}:`, error);
      result.errors.push(`${name}: ${error.message}`);
    }
  }

  /**
   * Valider que tous les prompts v3.0 nécessaires existent
   */
  async validatePromptsDeployed(): Promise<{
    all_present: boolean;
    prompts: PromptValidation[];
    missing_prompts: string[];
  }> {
    const required_prompts = [
      { name: 'intent_classification', version: '3.0' },
      { name: 'tool_selection', version: '3.0' },
      { name: 'response_synthesis', version: '3.0' },
      { name: 'thomas_agent_system', version: '3.0' }
    ];

    const validations: PromptValidation[] = [];
    const missing: string[] = [];

    for (const required of required_prompts) {
      const { data } = await this.supabase
        .from('chat_prompts')
        .select('id, is_active, is_default')
        .eq('name', required.name)
        .eq('version', required.version)
        .single();

      const validation: PromptValidation = {
        name: required.name,
        version: required.version,
        exists: !!data,
        is_active: data?.is_active || false,
        is_default: data?.is_default || false
      };

      validations.push(validation);

      if (!data) {
        missing.push(`${required.name}_v${required.version}`);
      }
    }

    const all_present = missing.length === 0;

    return {
      all_present,
      prompts: validations,
      missing_prompts: missing
    };
  }

  /**
   * Désactiver les anciennes versions d'un prompt
   */
  async deactivateOldVersions(promptName: string, keepVersion: string): Promise<void> {
    const { error } = await this.supabase
      .from('chat_prompts')
      .update({ is_active: false, is_default: false })
      .eq('name', promptName)
      .neq('version', keepVersion);

    if (error) {
      console.error(`❌ Error deactivating old versions of ${promptName}:`, error);
    } else {
      console.log(`✅ Deactivated old versions of ${promptName} (keeping v${keepVersion})`);
    }
  }
}
