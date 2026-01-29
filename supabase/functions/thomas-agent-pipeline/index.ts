import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function Thomas Agent Pipeline
 * Architecture sophistiquée avec séquençage LLM multi-étapes
 * 
 * Workflow:
 * 1. Context Engineering
 * 2. Intent Classification (LLM)
 * 3. Tool Selection (LLM)
 * 4. Tool Execution Loop
 * 5. Response Synthesis (LLM)
 */

console.log('🚀 Thomas Agent Pipeline Edge Function loaded')

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { message, session_id, user_id, farm_id, use_pipeline = true } = await req.json()

    console.log('📨 [PIPELINE-EDGE] Request received:', {
      message: message?.substring(0, 50),
      session_id,
      user_id,
      farm_id,
      use_pipeline
    })

    // Validation
    if (!message || !session_id || !user_id || !farm_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: message, session_id, user_id, farm_id'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get OpenAI API key
    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    console.log('✅ [PIPELINE-EDGE] Environment configured')

    // Import AgentPipeline dynamically
    // Note: En production Deno Edge Functions, il faudra bundler le code TypeScript
    // Pour l'instant, on utilise une implémentation simplifiée inline

    const startTime = Date.now()

    // ÉTAPE 1: Build Context
    console.log('🧠 [1/5] Building context...')
    const context = await buildUserContext(supabase, user_id, farm_id)

    // ÉTAPE 2: Intent Classification via LLM
    console.log('🎯 [2/5] Classifying intent...')
    const intent = await classifyIntent(supabase, openAIKey, message)

    // ÉTAPE 3: Tool Selection via LLM
    console.log('🛠️ [3/5] Selecting tools...')
    const toolPlans = await selectTools(supabase, openAIKey, message, intent)

    // ÉTAPE 4: Execute Tools
    console.log('⚡ [4/5] Executing tools...')
    const toolResults = await executeTools(supabase, toolPlans, context)

    // ÉTAPE 5: Response Synthesis
    console.log('💬 [5/5] Synthesizing response...')
    const finalResponse = await synthesizeResponse(supabase, openAIKey, toolResults, message, context)

    const processingTime = Date.now() - startTime

    // Log execution
    await logExecution(supabase, {
      session_id,
      user_id,
      farm_id,
      message,
      intent: intent.intent,
      tools_used: toolPlans.map(tp => tp.tool_name),
      success: true,
      processing_time_ms: processingTime
    })

    console.log(`✅ [PIPELINE-EDGE] Completed in ${processingTime}ms`)

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          type: 'actions',
          content: finalResponse,
          actions: toolResults.filter(tr => tr.success).map(tr => ({
            type: tr.action_type || 'action',
            title: tr.message || 'Action exécutée',
            data: tr.data
          })),
          confidence: intent.confidence,
          suggestions: []
        },
        metadata: {
          processing_time_ms: processingTime,
          agent_version: 'thomas_pipeline_v1.0',
          intent_detected: intent.intent,
          tools_executed: toolResults.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ [PIPELINE-EDGE] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        data: {
          type: 'error',
          content: 'Erreur lors du traitement de votre message. Veuillez réessayer.',
          actions: [],
          suggestions: ['Reformuler le message', 'Vérifier la connexion', 'Réessayer']
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function buildUserContext(supabase: any, userId: string, farmId: number) {
  console.log('📊 Building user context...')
  
  // Load plots
  const { data: plots } = await supabase
    .from('plots')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  // Load materials
  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  // Load conversions
  const { data: conversions } = await supabase
    .from('user_conversion_units')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  return {
    user: { id: userId },
    farm: { id: farmId, plots: plots || [], materials: materials || [], conversions: conversions || [] },
    current_date: new Date().toLocaleDateString('fr-FR'),
    current_date_iso: new Date().toISOString().split('T')[0]
  }
}

// Fonction utilitaire pour remplacer les variables de date dans les prompts
function replaceDateVariables(content: string, context: any): string {
  return content
    .replace(/\{\{current_date_iso\}\}/g, context.current_date_iso)
    .replace(/\{\{current_date\}\}/g, context.current_date)
}

async function classifyIntent(supabase: any, openAIKey: string, message: string) {
  console.log('🎯 Calling OpenAI for intent classification...')
  
  // Get prompt v3.0
  const { data: prompt } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('name', 'intent_classification')
    .eq('version', '3.0')
    .eq('is_active', true)
    .single()

  if (!prompt) {
    throw new Error('Intent classification prompt v3.0 not found')
  }

  const systemPrompt = prompt.content.replace('{{user_message}}', message)

  // Call OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  })

  const data = await response.json()
  const content = data.choices[0]?.message?.content || '{}'
  
  console.log('🤖 Intent response:', content.substring(0, 200))
  
  return JSON.parse(content)
}

async function selectTools(supabase: any, openAIKey: string, message: string, intent: any) {
  console.log('🛠️ Calling OpenAI for tool selection...')
  
  // Get prompt v3.0
  const { data: prompt } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('name', 'tool_selection')
    .eq('version', '3.0')
    .eq('is_active', true)
    .single()

  if (!prompt) {
    throw new Error('Tool selection prompt v3.0 not found')
  }

  // TODO: Get available tools descriptions
  const availableTools = [
    { name: 'create_observation', description: 'Créer observation terrain' },
    { name: 'create_task_done', description: 'Enregistrer tâche accomplie' },
    { name: 'create_harvest', description: 'Enregistrer récolte' },
    { name: 'help', description: 'Fournir aide' }
  ]

  const systemPrompt = prompt.content
    .replace('{{intent}}', intent.intent)
    .replace('{{user_message}}', message)
    .replace('{{available_tools}}', JSON.stringify(availableTools, null, 2))

  // Call OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })
  })

  const data = await response.json()
  const content = data.choices[0]?.message?.content || '{"tools":[]}'
  
  console.log('🤖 Tools response:', content.substring(0, 200))
  
  const parsed = JSON.parse(content)
  return parsed.tools || []
}

async function executeTools(supabase: any, toolPlans: any[], context: any) {
  console.log(`⚡ Executing ${toolPlans.length} tools...`)
  
  // Simplified execution - in real implementation, use actual Tools
  const results = []
  
  for (const plan of toolPlans) {
    console.log(`🔧 Executing: ${plan.tool_name}`)
    
    // Simplified tool execution
    // TODO: Use actual AgentTools implementation
    
    if (plan.tool_name === 'create_observation') {
      // Helper to capitalize first letter
      const capitalizeFirst = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      
      // Create observation with clean title format: "Problème Culture" or just "Problème"
      const title = plan.parameters.crop
        ? `${capitalizeFirst(plan.parameters.issue)} ${capitalizeFirst(plan.parameters.crop)}`
        : capitalizeFirst(plan.parameters.issue);
      
      const { data, error } = await supabase
        .from('observations')
        .insert({
          farm_id: context.farm.id,
          user_id: context.user.id,
          title: title,
          category: 'maladie_ravageur',
          nature: plan.parameters.issue,
          crop: plan.parameters.crop,
          status: 'active'
        })
        .select()
        .single()

      results.push({
        success: !error,
        message: error ? error.message : `Observation créée: ${plan.parameters.issue}`,
        data,
        action_type: 'observation'
      })
    } else {
      results.push({
        success: true,
        message: `Tool ${plan.tool_name} executed`,
        action_type: 'action'
      })
    }
  }
  
  return results
}

async function synthesizeResponse(supabase: any, openAIKey: string, toolResults: any[], message: string, context: any) {
  console.log('💬 Synthesizing natural response...')
  
  // Get main prompt with date context
  const { data: prompt } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('name', 'thomas_agent_system')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!prompt) {
    // Fallback simple
    const successful = toolResults.filter(tr => tr.success)
    return successful.length > 0 
      ? `✅ ${successful.length} action(s) traitée(s) avec succès.`
      : 'Je n\'ai pas pu traiter votre message. Veuillez reformuler.'
  }

  // Replace date variables in prompt
  const promptWithDates = replaceDateVariables(prompt.content, context)
  
  const systemPrompt = promptWithDates + `

## RÉSULTATS D'EXÉCUTION
${JSON.stringify(toolResults, null, 2)}

Synthétise une réponse naturelle en français confirmant les actions créées.`

  // Call OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(toolResults) }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  })

  const data = await response.json()
  return data.choices[0]?.message?.content || 'Action traitée.'
}

async function logExecution(supabase: any, log: any) {
  try {
    await supabase
      .from('chat_agent_executions')
      .insert({
        session_id: log.session_id,
        user_id: log.user_id,
        farm_id: log.farm_id,
        message: log.message,
        intent_detected: log.intent,
        tools_used: log.tools_used,
        success: log.success,
        processing_time_ms: log.processing_time_ms,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('⚠️ Failed to log execution:', error)
  }
}

