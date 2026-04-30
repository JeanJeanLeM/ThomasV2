import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * THOMAS AGENT PIPELINE - Architecture Complète
 * 
 * Pipeline séquencé en 5 étapes avec 3 appels LLM:
 * 1. Context Engineering - Construction contexte optimisé
 * 2. Intent Classification - LLM classifie l'intention (prompt v3.0)
 * 3. Tool Selection - LLM sélectionne les tools et extrait paramètres (prompt v3.0)
 * 4. Tool Execution - Création réelle des actions avec matching sophistiqué
 * 5. Response Synthesis - LLM synthétise la réponse naturelle (prompt v3.0)
 */

console.log('🚀 Thomas Agent Pipeline v2.0 - Real Implementation')

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

interface UserContext {
  user_id: string
  members: Array<{
    user_id: string
    first_name: string
    last_name: string
    full_name: string
    role: string
  }>
  plots: Array<{id: number, name: string, aliases: string[], llm_keywords: string[], is_active: boolean}>
  surface_units: Array<{id: number, name: string, plot_id: number, plot_name: string}>
  materials: Array<{id: number, name: string, category: string, llm_keywords?: string[], is_active: boolean}>
  conversions: Array<{
    id: string, 
    container_name: string, 
    crop_name: string, 
    conversion_value: number, 
    conversion_unit: string, 
    slugs: string[], 
    description: string,
    is_active: boolean
  }>
  customers: Array<{id: string, company_name: string, contact_name?: string}>
  suppliers: Array<{id: string, company_name: string, contact_name?: string}>
  products: Array<{id: string, name: string, unit: string}>
  preferences: {
    auto_validate_threshold: number
    preferred_units: Record<string, string>
    default_plot_ids: number[]
  }
}

interface SurfaceSelector {
  original: string
  prefix: string
  numbers: number[]
  select_all: boolean
}

// ============================================================================
// MAIN SERVE FUNCTION
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('🔍 [PIPELINE] === DÉBUT PIPELINE AGENT ===')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    const { 
      message_id, 
      user_message, 
      chat_session_id,
      user_id,
      farm_id
    } = requestBody

    console.log(`🤖 [PIPELINE] Message ID: ${message_id}`)
    console.log(`📝 [PIPELINE] Message: ${user_message?.substring(0, 100)}...`)

    // Vérifier clé OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY non configurée')
    }

    // 1. Obtenir session et IDs
    const { data: chatSession, error: sessionError } = await supabaseClient
      .from('chat_sessions')
      .select('user_id, farm_id')
      .eq('id', chat_session_id)
      .single()

    if (sessionError || !chatSession) {
      throw new Error('Session de chat introuvable')
    }

    const sessionUserId = user_id || chatSession.user_id
    const sessionFarmId = farm_id || chatSession.farm_id

    // 2. ÉTAPE 1: Context Engineering
    console.log(`🧠 [PIPELINE] ÉTAPE 1/6: Construction contexte...`)
    const userContext = await buildUserContext(supabaseClient, sessionUserId, sessionFarmId)
    console.log(`✅ [PIPELINE] Contexte: ${userContext.plots?.length || 0} parcelles, ${userContext.materials?.length || 0} matériaux`)

    // 3. ÉTAPE 2: Intent Classification (LLM 1) - Multi-Intent v4.0
    console.log(`🎯 [PIPELINE] ÉTAPE 2/6: Classification intention (LLM)...`)
    const intentResult = await classifyIntent(supabaseClient, openaiKey, user_message, userContext)
    console.log(`✅ [PIPELINE] ${intentResult.intents.length} intent(s): ${intentResult.intents.map(i => i.intent).join(', ')}`)

    // 4. ÉTAPE 3: Tool Selection (LLM 2) - Pour chaque intent avec son reconstructed_message
    console.log(`🛠️ [PIPELINE] ÉTAPE 3/6: Sélection tools (LLM)...`)
    let toolPlans: any[] = []
    
    for (const intentItem of intentResult.intents) {
      // Utiliser reconstructed_message pour l'extraction (contient le contexte propagé)
      const messageForExtraction = intentItem.reconstructed_message || user_message
      console.log(`🔍 [PIPELINE] Tool selection pour intent "${intentItem.intent}": ${messageForExtraction.substring(0, 60)}...`)
      
      let plans = await selectTools(supabaseClient, openaiKey, messageForExtraction, intentItem, userContext)

      // Garde-fou: pour un intent help, garantir un tool help avec help_topic spécifique.
      if (intentItem.intent === 'help') {
        const inferredHelpTopic = inferHelpTopicFromMessage(messageForExtraction, intentItem.context_inferred)
        const helpPlans = plans.filter((p: any) => p.tool_name === 'help')

        if (helpPlans.length === 0) {
          plans = [{
            tool_name: 'help',
            confidence: intentItem.confidence || 0.9,
            parameters: { help_topic: inferredHelpTopic }
          }]
          console.log(`ℹ️ [TOOLS] Intent help forcé -> tool help (${inferredHelpTopic})`)
        } else {
          plans = helpPlans.map((p: any) => {
            const requested = normalizeHelpTopic(p.parameters?.help_topic)
            const topic = requested || inferredHelpTopic
            return {
              ...p,
              parameters: {
                ...(p.parameters || {}),
                help_topic: topic
              }
            }
          })
          console.log(`ℹ️ [TOOLS] Help topic normalisé: ${plans.map((p: any) => p.parameters?.help_topic).join(', ')}`)
        }
      }
      
      // Ajouter info de contexte inféré et intent aux plans pour extraction détaillée
      for (const plan of plans) {
        plan.original_user_message = user_message
        plan.reconstructed_message = messageForExtraction
        plan.intent = intentItem.intent
        plan.intent_confidence = intentItem.confidence
        if (intentItem.context_inferred) {
          plan.context_inferred = intentItem.context_inferred
        }
      }
      
      toolPlans = toolPlans.concat(plans)
    }
    
    console.log(`✅ [PIPELINE] ${toolPlans.length} tool(s) sélectionné(s)`)

    // 5. ÉTAPE 4: Extraction détaillée (LLM pour tools avec prompt dédié)
    // Utiliser reconstructed_message de chaque plan pour une extraction précise
    const toolsWithExtractionPrompt = ['manage_plot', 'manage_conversion', 'manage_material', 'create_observation', 'create_task_done', 'create_task_planned', 'create_sale', 'create_purchase']
    const hasToolWithExtraction = toolPlans.some(tp => toolsWithExtractionPrompt.includes(tp.tool_name))
    if (hasToolWithExtraction) {
      console.log(`🔧 [PIPELINE] ÉTAPE 4/6: Extraction détaillée (LLM)...`)
      // Extraire par groupe de message reconstruit pour optimiser les appels LLM
      const enrichedPlans: any[] = []
      for (const plan of toolPlans) {
        const messageToExtract = plan.reconstructed_message || user_message
        const [enrichedPlan] = await extractDetailedParameters(supabaseClient, openaiKey, messageToExtract, [plan], userContext)
        enrichedPlans.push(enrichedPlan)
      }
      toolPlans = enrichedPlans
      console.log(`✅ [PIPELINE] Paramètres extraits`)
    }

    // 5. ÉTAPE 4.5: Matching membres (LLM) pour les tâches
    const taskPlansCount = toolPlans.filter((tp) =>
      tp?.tool_name === 'create_task_done' || tp?.tool_name === 'create_task_planned'
    ).length
    if (taskPlansCount > 0) {
      console.log(`👥 [PIPELINE] ÉTAPE 4.5/6: Matching membres (${taskPlansCount} tâche(s))...`)
      toolPlans = await enrichTaskPlansWithMemberMatching(supabaseClient, openaiKey, toolPlans, userContext)
      console.log(`✅ [PIPELINE] Matching membres appliqué`)
    }

    // 6. ÉTAPE 5: Tool Execution
    console.log(`⚡ [PIPELINE] ÉTAPE 5/6: Exécution tools...`)
    const toolResults = await executeTools(supabaseClient, toolPlans, userContext, sessionFarmId, sessionUserId, chat_session_id, message_id)
    console.log(`✅ [PIPELINE] ${toolResults.filter(tr => tr.success).length}/${toolResults.length} tools réussis`)

    // 7. ÉTAPE 6: Response Synthesis (LLM ou direct pour help)
    let finalResponse: { content: string; type: string; suggestions: string[] }
    const isOnlyHelp = toolResults.length === 1 && toolResults[0].action_type === 'help' && toolResults[0].help_content
    if (isOnlyHelp) {
      console.log(`💬 [PIPELINE] ÉTAPE 6/6: Réponse help directe (skip LLM)`)
      const helpText = buildHelpMessageFromToolResults(toolResults)
      finalResponse = { content: helpText, type: 'help', suggestions: [] }
      console.log(`✅ [PIPELINE] Réponse help générée`)
    } else {
      console.log(`💬 [PIPELINE] ÉTAPE 6/6: Synthèse réponse (LLM)...`)
      finalResponse = await synthesizeResponse(supabaseClient, openaiKey, user_message, toolResults, userContext)
      console.log(`✅ [PIPELINE] Réponse générée`)
    }

    const processingTime = Date.now() - startTime

    // 7. Log execution
    await logExecution(supabaseClient, {
      session_id: chat_session_id,
      user_id: sessionUserId,
      farm_id: sessionFarmId,
      message: user_message,
      intent_detected: intentResult.intents.map(i => i.intent).join(','),
      tools_used: toolPlans.map(tp => tp.tool_name),
      execution_steps: ['context', 'intent_classification', 'tool_selection', 'management_extraction', 'tool_execution', 'response_synthesis'],
      final_response: finalResponse.content,
      processing_time_ms: processingTime,
      success: true
    })

    console.log(`🎉 [PIPELINE] TERMINÉ en ${processingTime}ms`)

    // Mapper tous les résultats, même ceux qui ont échoué (pour afficher les cards)
    const ts = Date.now()
    const allActions = toolResults.map((tr, i) => {
      const extracted = tr.extracted_data || {}
      if (tr.card_summary) {
        extracted.card_summary = tr.card_summary
      }
      return {
        id: tr.action_id || `temp_${ts}_${i}`,
        action_type: tr.action_type,
        confidence_score: tr.confidence || intentResult.confidence,
        status: tr.success ? 'pending' : 'error',
        original_text: tr.original_text || 'Action pipeline',
        decomposed_text: tr.decomposed_text || tr.message,
        extracted_data: extracted,
        matched_entities: tr.matched_entities || {},
        record_id: tr.record_id,
        error_message: tr.success ? undefined : tr.message
      }
    })

    // Détecter si c'est une demande d'aide (intent principal = help)
    const isHelpRequest = intentResult.intents.length > 0 && intentResult.intents[0].intent === 'help'

    // Raccourci navigation pour help (card "Aller à...")
    let helpShortcut: { screen: string; label: string } | undefined
    if (isHelpRequest && toolResults[0]?.action_type === 'help' && toolResults[0].help_topic) {
      const topic = String(toolResults[0].help_topic).toLowerCase()
      if (HELP_TOPIC_TO_SCREEN[topic]) {
        helpShortcut = HELP_TOPIC_TO_SCREEN[topic]
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: toolResults[0]?.analysis_id,
        actions: allActions,
        confidence: intentResult.confidence,
        processing_time_ms: processingTime,
        message: finalResponse.content,
        is_help_request: isHelpRequest,
        ...(helpShortcut && { help_shortcut: helpShortcut }),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error(`❌ [PIPELINE] ERREUR: ${error.message}`)
    console.error(`❌ [PIPELINE] Stack: ${error.stack}`)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        debug: {
          timestamp: new Date().toISOString(),
          error_type: error.name || 'UnknownError'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// ============================================================================
// UTILITY FUNCTIONS (COPIED FROM analyze-message)
// ============================================================================

/** Normalise purchase_date pour PostgreSQL DATE : année seule "2015" → "2015-01-01" */
function normalizePurchaseDate(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (!s) return null
  // Déjà format YYYY-MM-DD valide
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Année seule (4 chiffres)
  if (/^\d{4}$/.test(s)) return `${s}-01-01`
  // Année-mois YYYY-MM ou YYYY/MM
  const ym = s.match(/^(\d{4})[-/](\d{1,2})$/)
  if (ym) return `${ym[1]}-${ym[2].padStart(2, '0')}-01`
  return null
}

function convertRelativeDateToISO(dateStr: string): string {
  const today = new Date()
  const todayISO = today.toISOString().split('T')[0]
  
  if (!dateStr || typeof dateStr !== 'string') {
    return todayISO
  }
  
  const lowerDate = dateStr.toLowerCase().trim()
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  switch (lowerDate) {
    case 'aujourd\'hui':
    case 'aujourdhui':
    case 'ce matin':
    case 'cet après-midi':
    case 'cet apres-midi':
    case 'ce soir':
    case 'maintenant':
      return todayISO
      
    case 'hier':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday.toISOString().split('T')[0]
      
    case 'demain':
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
      
    case 'avant-hier':
    case 'avant hier':
      const dayBeforeYesterday = new Date(today)
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
      return dayBeforeYesterday.toISOString().split('T')[0]
      
    case 'après-demain':
    case 'apres-demain':
    case 'apres demain':
      const dayAfterTomorrow = new Date(today)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
      return dayAfterTomorrow.toISOString().split('T')[0]
      
    default:
      return todayISO
  }
}

function normalizeFrenchWord(word: string): string {
  if (!word) return '';
  
  const lower = word.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    'caisses': 'caisse',
    'paniers': 'panier',
    'bacs': 'bac',
    'brouettes': 'brouette',
    'sacs': 'sac',
    'seaux': 'seau',
    'cagettes': 'cagette',
    'barquettes': 'barquette',
    'pots': 'pot',
    'godets': 'godet',
    'plaques': 'plaque',
    'bottes': 'botte',
    'unités': 'unité',
    'pièces': 'pièce',
    'tomates': 'tomate',
    'courgettes': 'courgette',
    'carottes': 'carotte',
    'salades': 'salade',
    'laitues': 'laitue',
    'épinards': 'épinard',
    'haricots': 'haricot',
    'poivrons': 'poivron',
    'aubergines': 'aubergine',
    'concombres': 'concombre',
    'choux': 'chou',
    'oignons': 'oignon',
    'échalotes': 'échalote',
    'radis': 'radis',
  };
  
  if (normalizations[lower]) {
    return normalizations[lower];
  }
  
  if (lower.endsWith('s') && lower.length > 1) {
    const singular = lower.slice(0, -1);
    const wordsEndingInS = ['radis', 'frais', 'gris', 'bras', 'tas'];
    if (!wordsEndingInS.includes(lower)) {
      return singular;
    }
  }
  
  if (lower.endsWith('x') && lower.length > 1) {
    if (lower === 'choux') return 'chou';
    if (lower === 'hiboux') return 'hibou';
  }
  
  return lower;
}

function matchConversionFlexible(term1: string, term2: string): boolean {
  if (!term1 || !term2) return false;
  
  const norm1 = normalizeFrenchWord(term1);
  const norm2 = normalizeFrenchWord(term2);
  
  if (norm1 === norm2) return true;
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLength = Math.min(norm1.length, norm2.length);
    const maxLength = Math.max(norm1.length, norm2.length);
    if (maxLength <= minLength * 1.5) {
      return true;
    }
  }
  
  const similarity = calculateStringSimilarity(norm1, norm2);
  if (similarity >= 0.85) {
    return true;
  }
  
  return false;
}

/**
 * Extract all numeric tokens from a string (e.g. "serre 52" → ["52"]).
 */
function extractNumbers(str: string): string[] {
  return str.match(/\d+/g) || []
}

/**
 * String similarity with a strict number-identity guard.
 *
 * Rule: if the mention contains numeric tokens AND the candidate also contains
 * numeric tokens, ALL numbers must appear identically in both strings.
 * Any mismatch (52 vs 2, 45 vs 5) immediately returns 0 so the fuzzy
 * threshold is never reached, preventing "serre 52" → "Serre 2".
 *
 * Special case: if the mention is ONLY numbers (e.g. "20 planches" when
 * "20" is a quantity) we still apply the guard so "20 planches" doesn't
 * fuzzy-match "planches" with a false score.
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  if (str1.length === 0 || str2.length === 0) return 0.0

  // --- Number-identity guard ---
  const nums1 = extractNumbers(str1)
  const nums2 = extractNumbers(str2)

  if (nums1.length > 0 && nums2.length > 0) {
    // Both sides carry numbers — they must all match (as sets, order-independent)
    const set1 = new Set(nums1)
    const set2 = new Set(nums2)
    const allMatch = [...set1].every(n => set2.has(n)) && [...set2].every(n => set1.has(n))
    if (!allMatch) return 0.0
  } else if (nums1.length > 0 && nums2.length === 0) {
    // Mention has a number but candidate has none → poor match, penalise heavily
    return 0.0
  }
  // If nums1 is empty and nums2 has numbers: candidate is more specific than
  // the mention — still let the generic similarity score decide (could be valid).

  // --- Generic character similarity ---
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.includes(shorter)) {
    return shorter.length / longer.length
  }

  let matches = 0
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      matches++
    }
  }

  return matches / Math.max(str1.length, str2.length)
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function applyUserConversions(extractedData: any, conversions: any[]): any {
  if (!extractedData.quantity || !extractedData.quantity.unit || !conversions.length) {
    return extractedData
  }
  
  const quantityUnit = extractedData.quantity.unit.toLowerCase()
  const crop = extractedData.crop?.toLowerCase()
  
  console.log(`🔍 [CONVERSION] Recherche pour: ${extractedData.quantity.value} ${quantityUnit} (culture: ${crop || 'non spécifiée'})`)
  
  let matchedConversion = conversions.find(c => 
    c.container_name.toLowerCase() === quantityUnit &&
    (!crop || !c.crop_name || c.crop_name.toLowerCase() === crop)
  )
  
  if (!matchedConversion) {
    matchedConversion = conversions.find(c => 
      c.slugs?.some((slug: string) => slug.toLowerCase() === quantityUnit) &&
      (!crop || !c.crop_name || c.crop_name.toLowerCase() === crop)
    )
  }
  
  if (!matchedConversion && crop) {
    matchedConversion = conversions.find(c => 
      matchConversionFlexible(quantityUnit, c.container_name) &&
      matchConversionFlexible(crop, c.crop_name || '')
    )
  }
  
  if (!matchedConversion) {
    matchedConversion = conversions.find(c => {
      const containerMatch = matchConversionFlexible(quantityUnit, c.container_name) ||
        (c.container_name.toLowerCase().includes(quantityUnit) || 
         quantityUnit.includes(c.container_name.toLowerCase()))
      const cropMatch = !crop || !c.crop_name || matchConversionFlexible(crop, c.crop_name)
      return containerMatch && cropMatch
    })
  }
  
  if (!matchedConversion && crop) {
    matchedConversion = conversions.find(c => 
      (matchConversionFlexible(quantityUnit, c.container_name) ||
       c.slugs?.some((slug: string) => matchConversionFlexible(quantityUnit, slug))) &&
      !c.crop_name
    )
  }
  
  if (matchedConversion) {
    const convertedValue = extractedData.quantity.value * matchedConversion.conversion_value
    console.log(`✅ [CONVERSION] Appliquée: ${extractedData.quantity.value} ${quantityUnit} → ${convertedValue} ${matchedConversion.conversion_unit}`)
    
    extractedData.quantity_converted = {
      value: convertedValue,
      unit: matchedConversion.conversion_unit,
      original: extractedData.quantity,
      conversion_id: matchedConversion.id,
      conversion_name: matchedConversion.container_name
    }
  } else {
    console.log(`❌ [CONVERSION] Aucune conversion trouvée pour: ${quantityUnit}`)
  }
  
  return extractedData
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

async function buildUserContext(supabase: any, userId: string, farmId: number): Promise<UserContext> {
  const { data: plots } = await supabase
    .from('plots')
    .select('id, name, aliases, llm_keywords')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: surfaceUnits } = await supabase
    .from('surface_units')
    .select(`
      id, name, plot_id,
      plots!inner(id, name)
    `)
    .eq('plots.farm_id', farmId)
    .eq('is_active', true)

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, category, llm_keywords, is_active')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: conversions } = await supabase
    .from('user_conversion_units')
    .select('id, container_name, crop_name, conversion_value, conversion_unit, slugs, description, is_active')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: preferences } = await supabase
    .from('user_ai_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name, contact_name')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, company_name, contact_name')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: products } = await supabase
    .from('products')
    .select('id, name, unit')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: farmMembers } = await supabase
    .from('farm_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        first_name,
        last_name,
        full_name
      )
    `)
    .eq('farm_id', farmId)
    .eq('is_active', true)

  return {
    user_id: userId,
    members: (farmMembers || [])
      .filter((member: any) => member?.user_id)
      .map((member: any) => ({
        user_id: member.user_id,
        first_name: member.profiles?.first_name || '',
        last_name: member.profiles?.last_name || '',
        full_name: member.profiles?.full_name || '',
        role: member.role || 'member'
      })),
    plots: plots || [],
    surface_units: (surfaceUnits || []).map((su: any) => ({
      id: su.id,
      name: su.name,
      plot_id: su.plot_id ?? su.plots?.id,
      plot_name: su.plots?.name
    })),
    materials: materials || [],
    conversions: conversions || [],
    customers: customers || [],
    suppliers: suppliers || [],
    products: products || [],
    preferences: preferences || {
      auto_validate_threshold: 0.85,
      preferred_units: { weight: 'kg', volume: 'litres', area: 'm2' },
      default_plot_ids: []
    }
  }
}

// ============================================================================
// MATCHING FUNCTIONS (COPIED FROM analyze-message)
// ============================================================================

async function matchPlots(mentions: string[], context: UserContext, supabase: any) {
  console.log(`\n🎯 [MATCH-PLOTS] Début matching parcelles`)
  console.log(`🎯 [MATCH-PLOTS] Mentions: ${mentions.length}`)
  
  const results: {
    plot_ids: number[]
    surface_unit_ids: number[]
    matched_plots: any[]
    matched_surface_units: any[]
  } = {
    plot_ids: [],
    surface_unit_ids: [],
    matched_plots: [],
    matched_surface_units: []
  }
  
  if (!mentions || mentions.length === 0) {
    return results
  }

  const toNumberSet = (value: string) => new Set(extractNumbers(normalizeString(value)))
  const numbersCompatible = (mentionValue: string, candidateValue: string): boolean => {
    const mentionNumbers = toNumberSet(mentionValue)
    const candidateNumbers = toNumberSet(candidateValue)

    if (mentionNumbers.size > 0 && candidateNumbers.size > 0) {
      return [...mentionNumbers].every(n => candidateNumbers.has(n)) &&
        [...candidateNumbers].every(n => mentionNumbers.has(n))
    }
    if (mentionNumbers.size > 0 && candidateNumbers.size === 0) {
      return false
    }
    return true
  }

  const detectSurfacePrefix = (value: string): string | null => {
    const normalized = normalizeString(value)
    const match = normalized.match(/\b(planche|rang|ligne|bande)s?\b/)
    return match?.[1] || null
  }

  const parseSurfaceSelectors = (rawMention: string, fallbackPrefix: string | null): SurfaceSelector[] => {
    const mention = rawMention.trim()
    if (!mention) return []

    const normalizedMention = normalizeString(mention)
    const prefix = detectSurfacePrefix(mention) || fallbackPrefix
    if (!prefix) return []

    const selectAll = /\btoutes?\s+les?\s+(planches?|rangs?|lignes?|bandes?)\b/i.test(normalizedMention)
    const numbers = new Set<number>()

    const rangeRegex = new RegExp(`\\b${prefix}s?\\b\\s*(\\d+)\\s*(?:a|à|-|au|jusqu(?:a|à))\\s*(\\d+)`, 'gi')
    for (const match of normalizedMention.matchAll(rangeRegex)) {
      const from = parseInt(match[1], 10)
      const to = parseInt(match[2], 10)
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        const start = Math.min(from, to)
        const end = Math.max(from, to)
        const maxExpanded = Math.min(end, start + 99)
        for (let i = start; i <= maxExpanded; i++) {
          numbers.add(i)
        }
      }
    }

    const afterPrefix = normalizedMention.match(new RegExp(`\\b${prefix}s?\\b\\s+(.+)$`))
    const numbersAfterPrefix = afterPrefix?.[1] ? extractNumbers(afterPrefix[1]) : []
    numbersAfterPrefix.forEach((n) => {
      const parsed = parseInt(n, 10)
      if (!Number.isNaN(parsed)) numbers.add(parsed)
    })

    if (numbers.size === 0 && /^\d+$/.test(normalizedMention)) {
      numbers.add(parseInt(normalizedMention, 10))
    }

    return [{
      original: mention,
      prefix,
      numbers: [...numbers],
      select_all: selectAll
    }]
  }

  const scoreSurfaceUnitMatch = (mentionValue: string, surfaceUnitName: string): { score: number, matchType: string } => {
    const mentionNorm = normalizeString(mentionValue)
    const candidateNorm = normalizeString(surfaceUnitName)
    if (!mentionNorm || !candidateNorm) return { score: 0, matchType: 'none' }

    if (mentionNorm === candidateNorm) {
      return { score: 1.0, matchType: 'exact' }
    }

    if (
      (candidateNorm.includes(mentionNorm) || mentionNorm.includes(candidateNorm)) &&
      numbersCompatible(mentionNorm, candidateNorm)
    ) {
      return { score: 0.9, matchType: 'partial' }
    }

    const similarity = calculateStringSimilarity(mentionNorm, candidateNorm)
    if (similarity >= 0.7) {
      return { score: similarity, matchType: 'fuzzy' }
    }

    return { score: 0, matchType: 'none' }
  }

  const surfaceRegex = /\b(planche|rang|ligne|bande)\b/i
  const detectMentionPlotIds = (mention: string): number[] => {
    const mentionNorm = normalizeString(mention)
    const ids = new Set<number>()
    for (const plot of context.plots) {
      const candidates = [plot.name, ...(Array.isArray(plot.aliases) ? plot.aliases : [])]
      for (const candidate of candidates) {
        const candidateNorm = normalizeString(candidate || '')
        if (candidateNorm && mentionNorm.includes(candidateNorm)) {
          ids.add(plot.id)
          break
        }
      }
    }
    return [...ids]
  }
  const hasSurfaceContext = mentions.some(m => typeof m === 'string' && surfaceRegex.test(m))
  const defaultSurfacePrefix = mentions
    .map(m => (typeof m === 'string' ? detectSurfacePrefix(m) : null))
    .find(Boolean) || null

  const surfaceMentions: string[] = []
  
  for (const mention of mentions) {
    if (!mention || typeof mention !== 'string') {
      continue
    }
    const mentionLower = mention.toLowerCase().trim()
    const mentionNormalized = normalizeString(mention)
    
    let bestMatch = null
    let bestConfidence = 0
    let matchType = 'none'
    
    const isSurfaceUnit =
      surfaceRegex.test(mention) ||
      (hasSurfaceContext && /^\d+$/.test(mentionNormalized))
    if (isSurfaceUnit) {
      surfaceMentions.push(mention)
    }
    
    for (const plot of context.plots) {
      if (plot.name.toLowerCase() === mentionLower) {
        bestMatch = plot
        bestConfidence = 1.0
        matchType = 'exact'
        break
      }
      
      if (plot.name.toLowerCase().includes(mentionLower) || 
          mentionLower.includes(plot.name.toLowerCase())) {
        // Guard: partial matches must not cross-match different numbers
        const plotNums = extractNumbers(plot.name.toLowerCase())
        const mentionNums = extractNumbers(mentionLower)
        const numbersCompatible = (mentionNums.length === 0 || plotNums.length === 0) ||
          (mentionNums.every((n: string) => plotNums.includes(n)) && plotNums.every((n: string) => mentionNums.includes(n)))
        if (numbersCompatible && 0.9 > bestConfidence) {
          bestMatch = plot
          bestConfidence = 0.9
          matchType = 'partial'
        }
      }
      
      if (plot.aliases && Array.isArray(plot.aliases)) {
        for (const alias of plot.aliases) {
          if (alias.toLowerCase() === mentionLower || 
              alias.toLowerCase().includes(mentionLower)) {
            if (0.85 > bestConfidence) {
              bestMatch = plot
              bestConfidence = 0.85
              matchType = 'alias'
            }
          }
        }
      }
      
      if (plot.llm_keywords && Array.isArray(plot.llm_keywords)) {
        for (const keyword of plot.llm_keywords) {
          if (keyword.toLowerCase() === mentionLower || 
              mentionLower.includes(keyword.toLowerCase())) {
            if (0.8 > bestConfidence) {
              bestMatch = plot
              bestConfidence = 0.8
              matchType = 'keyword'
            }
          }
        }
      }
      
      const similarity = calculateStringSimilarity(mentionLower, plot.name.toLowerCase())
      if (similarity >= 0.7 && similarity > bestConfidence) {
        bestMatch = plot
        bestConfidence = similarity
        matchType = 'fuzzy'
      }
    }
    
    if (bestMatch) {
      console.log(`✅ [MATCH-PLOTS] Match: ${bestMatch.name} (${matchType})`)
      
      if (!results.plot_ids.includes(bestMatch.id)) {
        results.plot_ids.push(bestMatch.id)
        results.matched_plots.push({
          original: mention,
          matched: bestMatch.name,
          id: bestMatch.id,
          confidence: bestConfidence,
          match_type: matchType
        })
      }
    }
  }

  const preferredPlotIds = new Set<number>(results.plot_ids)
  for (const mention of surfaceMentions) {
    const selectors = parseSurfaceSelectors(mention, defaultSurfacePrefix)
    const explicitPlotIds = detectMentionPlotIds(mention)
    const targetPlotIds = explicitPlotIds.length > 0
      ? explicitPlotIds
      : preferredPlotIds.size === 1
      ? [...preferredPlotIds]
      : (context.plots.length === 1 ? [context.plots[0].id] : [])

    if (selectors.length === 0 || targetPlotIds.length === 0) {
      continue
    }

    for (const selector of selectors) {
      for (const plotId of targetPlotIds) {
        const unitsInPlot = context.surface_units.filter((su) => su.plot_id === plotId)
        if (unitsInPlot.length === 0) continue

        if (selector.select_all) {
          const prefixedUnits = unitsInPlot.filter((su) =>
            new RegExp(`\\b${selector.prefix}s?\\b`, 'i').test(normalizeString(su.name))
          )
          const unitsToAdd = prefixedUnits.length > 0 ? prefixedUnits : unitsInPlot
          for (const su of unitsToAdd) {
            if (!results.surface_unit_ids.includes(su.id)) {
              results.surface_unit_ids.push(su.id)
              results.matched_surface_units.push({
                original: selector.original,
                matched: su.name,
                id: su.id,
                plot_id: su.plot_id,
                plot_name: su.plot_name,
                confidence: 0.9,
                match_type: 'select_all'
              })
            }
          }
          continue
        }

        for (const num of selector.numbers) {
          let bestSurfaceMatch: any = null
          let bestSurfaceScore = 0
          let bestSurfaceMatchType = 'none'

          const candidate = `${selector.prefix} ${num}`
          for (const su of unitsInPlot) {
            const suNorm = normalizeString(su.name)
            const suNumbers = extractNumbers(suNorm)
            if (!suNumbers.includes(String(num))) continue

            const scoreResult = scoreSurfaceUnitMatch(candidate, su.name)
            if (scoreResult.score > bestSurfaceScore) {
              bestSurfaceMatch = su
              bestSurfaceScore = scoreResult.score
              bestSurfaceMatchType = scoreResult.matchType
            }
          }

          if (bestSurfaceMatch && bestSurfaceScore >= 0.75) {
            if (!results.surface_unit_ids.includes(bestSurfaceMatch.id)) {
              results.surface_unit_ids.push(bestSurfaceMatch.id)
              results.matched_surface_units.push({
                original: selector.original,
                matched: bestSurfaceMatch.name,
                id: bestSurfaceMatch.id,
                plot_id: bestSurfaceMatch.plot_id,
                plot_name: bestSurfaceMatch.plot_name,
                confidence: bestSurfaceScore,
                match_type: bestSurfaceMatchType
              })
              console.log(`✅ [MATCH-PLOTS] Match surface unit: ${bestSurfaceMatch.name} (${bestSurfaceMatchType})`)
            }
          }
        }
      }
    }
  }
  
  console.log(`📊 [MATCH-PLOTS] Résultat: ${results.plot_ids.length} parcelles, ${results.surface_unit_ids.length} planches`)
  return results
}

async function matchMaterials(mentions: string[], context: UserContext) {
  console.log(`\n🔧 [MATCH-MATERIALS] Début matching matériels`)
  console.log(`🔧 [MATCH-MATERIALS] Mentions: ${mentions.length}`)
  
  const results: {
    material_ids: number[]
    matched_materials: any[]
  } = {
    material_ids: [],
    matched_materials: []
  }
  
  if (!mentions || mentions.length === 0) {
    return results
  }
  
  const synonyms = {
    'tracteur': ['tractor', 'engin', 'machine agricole'],
    'rateau': ['râteau', 'rake'],
    'beche': ['bêche', 'spade'],
    'serfouette': ['sarcloir', 'houe'],
    'brouette': ['wheelbarrow', 'chariot'],
    'pulverisateur': ['pulvérisateur', 'atomiseur', 'sprayer'],
    'semoir': ['seeder', 'planteuse'],
    'charrue': ['plow', 'labour'],
    'faucheuse': ['mower', 'tondeuse']
  }
  
  for (const mention of mentions) {
    if (!mention || typeof mention !== 'string') {
      continue
    }
    const mentionLower = mention.toLowerCase().trim()
    
    let bestMatch = null
    let bestConfidence = 0
    let matchType = 'none'
    
    for (const material of context.materials) {
      if (!material.is_active) continue
      
      const materialNameLower = material.name.toLowerCase()
      
      if (materialNameLower === mentionLower) {
        bestMatch = material
        bestConfidence = 1.0
        matchType = 'exact'
        break
      }
      
      if (materialNameLower.includes(mentionLower) || 
          mentionLower.includes(materialNameLower)) {
        if (0.9 > bestConfidence) {
          bestMatch = material
          bestConfidence = 0.9
          matchType = 'partial'
        }
      }
      
      if (material.llm_keywords && Array.isArray(material.llm_keywords)) {
        for (const keyword of material.llm_keywords) {
          const keywordLower = keyword.toLowerCase()
          if (keywordLower === mentionLower || 
              keywordLower.includes(mentionLower) ||
              mentionLower.includes(keywordLower)) {
            if (0.85 > bestConfidence) {
              bestMatch = material
              bestConfidence = 0.85
              matchType = 'keyword'
            }
          }
        }
      }
      
      for (const [baseWord, syns] of Object.entries(synonyms)) {
        if (mentionLower.includes(baseWord) || syns.some(s => mentionLower.includes(s))) {
          if (materialNameLower.includes(baseWord) || syns.some(s => materialNameLower.includes(s))) {
            if (0.8 > bestConfidence) {
              bestMatch = material
              bestConfidence = 0.8
              matchType = 'synonym'
            }
          }
        }
      }
      
      const category = detectMaterialCategory(mentionLower)
      if (category && material.category === category) {
        const similarity = calculateStringSimilarity(mentionLower, materialNameLower)
        if (similarity >= 0.6 && similarity > bestConfidence) {
          bestMatch = material
          bestConfidence = similarity
          matchType = 'category'
        }
      }
      
      const similarity = calculateStringSimilarity(mentionLower, materialNameLower)
      if (similarity >= 0.7 && similarity > bestConfidence) {
        bestMatch = material
        bestConfidence = similarity
        matchType = 'fuzzy'
      }
    }
    
    if (bestMatch) {
      console.log(`✅ [MATCH-MATERIALS] Match: ${bestMatch.name} (${matchType})`)
      
      if (!results.material_ids.includes(bestMatch.id)) {
        results.material_ids.push(bestMatch.id)
        results.matched_materials.push({
          original: mention,
          matched: bestMatch.name,
          id: bestMatch.id,
          category: bestMatch.category,
          confidence: bestConfidence,
          match_type: matchType
        })
      }
    }
  }
  
  console.log(`📊 [MATCH-MATERIALS] Résultat: ${results.material_ids.length} matériels`)
  return results
}

async function matchCustomer(customerName: string, farmId: number, supabase: any): Promise<{ id: string; confidence: number } | null> {
  if (!customerName?.trim()) return null
  const name = customerName.trim()
  const { data: exactMatch } = await supabase
    .from('customers')
    .select('id, company_name')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .ilike('company_name', name)
    .limit(1)
    .single()
  if (exactMatch) return { id: exactMatch.id, confidence: 1.0 }

  const { data: partialMatches } = await supabase
    .from('customers')
    .select('id, company_name')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .ilike('company_name', `%${name}%`)
    .limit(5)
  if (partialMatches?.length > 0) return { id: partialMatches[0].id, confidence: 0.7 }

  const { data: newCustomer } = await supabase
    .from('customers')
    .insert({ farm_id: farmId, company_name: name, is_active: true })
    .select('id')
    .single()
  if (newCustomer) return { id: newCustomer.id, confidence: 0.5 }
  return null
}

async function matchSupplier(supplierName: string, farmId: number, supabase: any): Promise<{ id: string; confidence: number } | null> {
  if (!supplierName?.trim()) return null
  const name = supplierName.trim()
  const { data: exactMatch } = await supabase
    .from('suppliers')
    .select('id, company_name')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .ilike('company_name', name)
    .limit(1)
    .single()
  if (exactMatch) return { id: exactMatch.id, confidence: 1.0 }

  const { data: partialMatches } = await supabase
    .from('suppliers')
    .select('id, company_name')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .ilike('company_name', `%${name}%`)
    .limit(5)
  if (partialMatches?.length > 0) return { id: partialMatches[0].id, confidence: 0.7 }

  const { data: newSupplier } = await supabase
    .from('suppliers')
    .insert({ farm_id: farmId, company_name: name, is_active: true })
    .select('id')
    .single()
  if (newSupplier) return { id: newSupplier.id, confidence: 0.5 }
  return null
}

function detectMaterialCategory(mention: string): string | null {
  const mentionLower = mention.toLowerCase()
  
  if (/tracteur|tractor|engin/.test(mentionLower)) return 'tracteurs'
  if (/charrue|cultivateur|herse|semoir|épandeur|faucheuse|pulvérisateur/.test(mentionLower)) return 'outils_tracteur'
  if (/bêche|râteau|serfouette|arrosoir|sécateur|transplantoir/.test(mentionLower)) return 'outils_manuels'
  if (/brouette|panier|caisse|seau|bâche|voile/.test(mentionLower)) return 'petit_equipement'
  
  return null
}

async function matchPhytosanitaryProduct(
  productName: string, 
  farmId: number, 
  userId: string, 
  supabase: any
): Promise<{ amm: string; name: string; confidence: number } | null> {
  
  if (!productName || !productName.trim()) {
    return null
  }
  
  console.log(`🌿 [MATCH-PHYTO] Matching: "${productName}"`)
  
  try {
    const { data: preferences } = await supabase
      .from('user_phytosanitary_preferences')
      .select('product_amms')
      .eq('farm_id', farmId)
      .eq('user_id', userId)
      .single()
    
    if (!preferences?.product_amms?.length) {
      return null
    }
    
    const { data: products } = await supabase
      .from('phytosanitary_products')
      .select('amm, name')
      .in('amm', preferences.product_amms)
    
    if (!products || products.length === 0) {
      return null
    }
    
    const normalizedSearch = normalizeString(productName)
    
    let bestMatch = null
    let bestConfidence = 0
    let matchType = 'none'
    
    for (const product of products) {
      const normalizedProductName = normalizeString(product.name)
      
      if (normalizedProductName === normalizedSearch) {
        bestMatch = product
        bestConfidence = 1.0
        matchType = 'exact'
        break
      }
      
      if (normalizedProductName.includes(normalizedSearch) || 
          normalizedSearch.includes(normalizedProductName)) {
        if (0.9 > bestConfidence) {
          bestMatch = product
          bestConfidence = 0.9
          matchType = 'partial'
        }
      }
      
      const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2)
      if (searchWords.length > 0) {
        const matchedWords = searchWords.filter(word => normalizedProductName.includes(word))
        if (matchedWords.length > 0) {
          const wordConfidence = matchedWords.length / searchWords.length * 0.85
          if (wordConfidence > bestConfidence) {
            bestMatch = product
            bestConfidence = wordConfidence
            matchType = 'words'
          }
        }
      }
      
      const similarity = calculateStringSimilarity(normalizedSearch, normalizedProductName)
      if (similarity >= 0.7 && similarity > bestConfidence) {
        bestMatch = product
        bestConfidence = similarity
        matchType = 'fuzzy'
      }
    }
    
    if (bestMatch && bestConfidence >= 0.7) {
      console.log(`✅ [MATCH-PHYTO] Match: ${bestMatch.name} (${matchType})`)
      return {
        amm: bestMatch.amm,
        name: bestMatch.name,
        confidence: bestConfidence
      }
    }
    
    return null
    
  } catch (error) {
    console.error(`❌ [MATCH-PHYTO] Erreur:`, error)
    return null
  }
}

async function contextualizeAction(supabase: any, action: any, context: UserContext, farmId: number) {
  console.log(`\n🔍 [CONTEXT] Contextualisation action ${action.action_type}`)
  
  try {
    const contextData: any = {}
    const extractedData = { ...action.extracted_data }

    const mergePlotMentions = (): string[] => {
      const mentions = new Set<string>()
      const explicitMentions = extractedData.plots
        ? (Array.isArray(extractedData.plots) ? extractedData.plots : [extractedData.plots])
        : []

      explicitMentions
        .filter((m: unknown) => typeof m === 'string' && String(m).trim().length > 0)
        .forEach((m: string) => mentions.add(m))

      const sourceText = `${action?.original_text || ''} ${action?.decomposed_text || ''}`.trim()
      if (sourceText) {
        const normalizedSource = normalizeString(sourceText)

        for (const plot of context.plots) {
          const candidates = [plot.name, ...(Array.isArray(plot.aliases) ? plot.aliases : [])]
          for (const candidate of candidates) {
            const normalizedCandidate = normalizeString(candidate || '')
            if (normalizedCandidate && normalizedSource.includes(normalizedCandidate)) {
              mentions.add(plot.name)
            }
          }
        }

        const surfacePattern = /\b(?:toutes?\s+les?\s+)?(?:planches?|rangs?|lignes?|bandes?)(?:\s+\d+(?:\s*(?:,|et)\s*\d+)*(?:\s*(?:à|a|-|au)\s*\d+)?)?/gi
        for (const match of sourceText.matchAll(surfacePattern)) {
          if (match[0]?.trim()) {
            mentions.add(match[0].trim())
          }
        }

        // Ajoute des mentions composées "parcelle + planche(s)" pour lier
        // explicitement les sous-unités à la bonne parcelle en cas de multi-parcelles.
        const surfacePatternText = '(?:toutes?\\s+les?\\s+)?(?:planches?|rangs?|lignes?|bandes?)(?:\\s+\\d+(?:\\s*(?:,|et)\\s*\\d+)*(?:\\s*(?:à|a|-|au)\\s*\\d+)?)?'
        for (const plot of context.plots) {
          const candidates = [plot.name, ...(Array.isArray(plot.aliases) ? plot.aliases : [])]
          for (const candidate of candidates) {
            const normalizedCandidate = normalizeString(candidate || '')
            if (!normalizedCandidate) continue

            let startIdx = normalizedSource.indexOf(normalizedCandidate)
            while (startIdx !== -1) {
              const endIdx = Math.min(normalizedSource.length, startIdx + normalizedCandidate.length + 90)
              const windowText = normalizedSource.slice(startIdx, endIdx)
              const localSurfaceRegex = new RegExp(surfacePatternText, 'gi')
              for (const localMatch of windowText.matchAll(localSurfaceRegex)) {
                if (localMatch[0]?.trim()) {
                  mentions.add(`${plot.name} ${localMatch[0].trim()}`)
                }
              }
              startIdx = normalizedSource.indexOf(normalizedCandidate, startIdx + normalizedCandidate.length)
            }
          }
        }
      }

      return [...mentions]
    }

    const plotMentions = mergePlotMentions()
    if (plotMentions.length > 0) {
      const plotMatches = await matchPlots(plotMentions, context, supabase)
      Object.assign(contextData, plotMatches)
    }

    if (extractedData.materials && Array.isArray(extractedData.materials)) {
      const materialMatches = await matchMaterials(extractedData.materials, context)
      Object.assign(contextData, materialMatches)
    }
    
    if (extractedData.quantity_type === 'produit_phyto' && extractedData.quantity_nature) {
      const productMatch = await matchPhytosanitaryProduct(
        extractedData.quantity_nature,
        farmId,
        context.user_id,
        supabase
      )
      
      if (productMatch) {
        contextData.phytosanitary_product_amm = productMatch.amm
        contextData.phytosanitary_product_name = productMatch.name
        extractedData.quantity_nature = productMatch.name
      }
    }

    const finalExtractedData = applyUserConversions(extractedData, context.conversions)

    console.log(`✅ [CONTEXT] Parcelles: ${contextData.plot_ids?.length || 0}, Matériels: ${contextData.material_ids?.length || 0}`)
    
    return {
      context: contextData,
      extracted_data: finalExtractedData
    }
  } catch (error) {
    console.error(`❌ [CONTEXT] Erreur:`, error.message)
    throw error
  }
}

// ============================================================================
// ÉTAPE 2: INTENT CLASSIFICATION (LLM 1) - v4.0 Multi-Intent
// ============================================================================

interface IntentResult {
  intent: string
  confidence: number
  text_span: string
  reconstructed_message: string
  context_inferred?: {
    subject_type: string
    subject: string
    plots?: string[]
    source: string
  }
}

interface IntentClassificationResult {
  intents: IntentResult[]
  has_multiple_actions: boolean
  reasoning: string
  // Rétrocompatibilité: premier intent pour le logging
  intent: string
  confidence: number
}

async function classifyIntent(supabase: any, openAIKey: string, userMessage: string, context: UserContext): Promise<IntentClassificationResult> {
  console.log('🎯 [INTENT] Chargement prompt intent_classification (plus récent actif)...')
  
  // Charger la version active la plus récente
  const { data: prompt, error: promptError } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('name', 'intent_classification')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (promptError || !prompt) {
    throw new Error('Prompt intent_classification introuvable ou inactif')
  }

  const isV4 = prompt.version.startsWith('4')
  console.log(`✅ [INTENT] Prompt chargé (v${prompt.version}): ${prompt.content.length} chars`)

  const farmContextSummary = `
Parcelles: ${context.plots.map(p => p.name).join(', ') || 'Aucune'}
Matériel: ${context.materials.map(m => m.name).join(', ') || 'Aucun'}
`.trim()

  const systemPrompt = prompt.content
    .replace('{{user_message}}', userMessage)
    .replace('{{farm_context_summary}}', farmContextSummary)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 800, // Plus de tokens pour multi-intent
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`)
  }

  const data = await response.json()
  const rawResponse = data.choices[0].message.content

  console.log(`🤖 [INTENT] Réponse brute: ${rawResponse.substring(0, 200)}`)

  let parsed: any
  try {
    parsed = JSON.parse(rawResponse)
  } catch (e) {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('Impossible de parser la réponse intent')
    }
  }

  // Gérer les deux formats (v3.0 single intent et v4.x intents array)
  if (parsed.intents && Array.isArray(parsed.intents)) {
    // Format v4.x
    const intents: IntentResult[] = parsed.intents.map((i: any) => ({
      intent: i.intent || 'unclear',
      confidence: i.confidence || 0.5,
      text_span: i.text_span || userMessage,
      reconstructed_message: i.reconstructed_message || i.text_span || userMessage,
      context_inferred: i.context_inferred
    }))

    console.log(`🎯 [INTENT] ${intents.length} intent(s) détecté(s): ${intents.map(i => i.intent).join(', ')}`)

    return {
      intents,
      has_multiple_actions: parsed.has_multiple_actions || intents.length > 1,
      reasoning: parsed.reasoning || '',
      // Rétrocompatibilité
      intent: intents[0]?.intent || 'unclear',
      confidence: intents[0]?.confidence || 0.5
    }
  } else {
    // Format v3.0 (fallback)
    const singleIntent: IntentResult = {
      intent: parsed.intent || 'unclear',
      confidence: parsed.confidence || 0.5,
      text_span: userMessage,
      reconstructed_message: userMessage
    }

    return {
      intents: [singleIntent],
      has_multiple_actions: parsed.has_multiple_actions || false,
      reasoning: parsed.reasoning || '',
      intent: singleIntent.intent,
      confidence: singleIntent.confidence
    }
  }
}

// ============================================================================
// ÉTAPE 3: TOOL SELECTION (LLM 2)
// ============================================================================

async function selectTools(supabase: any, openAIKey: string, userMessage: string, intent: any, context: UserContext) {
  console.log('🛠️ [TOOLS] Chargement prompt tool_selection (plus récent actif)...')
  
  // Charger la version active la plus récente
  const { data: prompt, error: promptError } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('name', 'tool_selection')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (promptError || !prompt) {
    throw new Error('Prompt tool_selection actif introuvable')
  }

  console.log(`✅ [TOOLS] Prompt chargé (v${prompt.version}): ${prompt.content.length} chars`)

  const availableTools = [
    { tool_name: 'create_observation', description: 'Créer une observation terrain (pucerons, maladies, problèmes)' },
    { tool_name: 'create_task_done', description: 'Enregistrer une tâche accomplie, y compris récoltes avec quantités' },
    { tool_name: 'create_task_planned', description: 'Planifier une tâche future' },
    { tool_name: 'create_sale', description: 'Enregistrer une vente (client, quantité, prix)' },
    { tool_name: 'create_purchase', description: 'Enregistrer un achat (fournisseur, quantité, prix)' },
    { tool_name: 'manage_plot', description: 'Créer ou modifier une parcelle (serre, tunnel, plein champ)' },
    { tool_name: 'manage_conversion', description: 'Configurer une conversion (ex: 1 caisse = 6 kg tomates)' },
    { tool_name: 'manage_material', description: 'Créer ou modifier un matériel (tracteur, herse, etc.)' },
    { tool_name: 'help', description: 'Fournir de l\'aide ou information' }
  ]

  const farmContext = `
Parcelles: ${context.plots.map(p => p.name).join(', ') || 'Aucune'}
Planches: ${context.surface_units.map(su => `${su.name} (${su.plot_name})`).slice(0, 10).join(', ')}${context.surface_units.length > 10 ? '...' : ''}
Matériel: ${context.materials.map(m => m.name).join(', ') || 'Aucun'}
Conversions: ${context.conversions.map(c => `${c.container_name} → ${c.conversion_value} ${c.conversion_unit}`).slice(0, 5).join(', ')}${context.conversions.length > 5 ? '...' : ''}
`.trim()

  const systemPrompt = prompt.content
    .replace('{{user_message}}', userMessage)
    .replace('{{intent}}', intent.intent)
    .replace('{{available_tools}}', JSON.stringify(availableTools, null, 2))
    .replace('{{farm_context}}', farmContext)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`)
  }

  const data = await response.json()
  const rawResponse = data.choices[0].message.content

  console.log(`🤖 [TOOLS] Réponse brute: ${rawResponse.substring(0, 200)}`)

  let parsed: any
  try {
    parsed = JSON.parse(rawResponse)
  } catch (e) {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('Impossible de parser la réponse tools')
    }
  }

  const tools = parsed.tools || []
  
  // Normaliser: le LLM peut retourner "tool", "name", ou "tool_name"
  for (const t of tools) {
    if (!t.tool_name) {
      t.tool_name = t.tool || t.name || undefined
      console.log(`⚠️ [TOOLS] Normalisation tool_name: ${t.tool_name} (depuis tool=${t.tool}, name=${t.name})`)
    }
  }
  
  console.log(`🎯 [TOOLS] ${tools.length} tool(s) sélectionné(s): ${tools.map((t: any) => t.tool_name).join(', ')}`)
  
  return tools
}

// ============================================================================
// ÉTAPE 4: EXTRACTION DÉTAILLÉE (prompts dédiés par type d'action)
// ============================================================================

async function extractDetailedParameters(
  supabase: any,
  openAIKey: string,
  userMessage: string,
  toolPlans: any[],
  context: UserContext
): Promise<any[]> {
  const promptMapping: Record<string, string> = {
    // Management
    'manage_plot': 'plot_management_extraction',
    'manage_conversion': 'conversion_management_extraction',
    'manage_material': 'material_management_extraction',
    // Tasks & Observations
    'create_task_done': 'task_extraction',
    'create_task_planned': 'task_extraction',
    'create_observation': 'observation_extraction',
    // Sales & Purchases
    'create_sale': 'sale_extraction',
    'create_purchase': 'purchase_extraction'
  }

  const farmContextBase = `
Parcelles existantes: ${context.plots?.map((p: any) => p.name).join(', ') || 'Aucune'}
Matériel existant: ${context.materials?.map((m: any) => m.name).join(', ') || 'Aucun'}
Conversions: ${context.conversions?.map((c: any) => `${c.container_name}→${c.conversion_value}${c.conversion_unit}`).slice(0, 5).join(', ') || 'Aucune'}
`.trim()
  const farmContextCommercial = `
Clients: ${context.customers?.map((c: any) => c.company_name || c.contact_name).join(', ') || 'Aucun'}
Fournisseurs: ${context.suppliers?.map((s: any) => s.company_name || s.contact_name).join(', ') || 'Aucun'}
Produits: ${context.products?.map((p: any) => `${p.name} (${p.unit})`).slice(0, 10).join(', ') || 'Aucun'}
Conversions: ${context.conversions?.map((c: any) => `${c.container_name} de ${c.crop_name}=${c.conversion_value}${c.conversion_unit}`).slice(0, 5).join(', ') || 'Aucune'}
`.trim()

  const enrichedPlans = await Promise.all(toolPlans.map(async (plan) => {
    const promptName = promptMapping[plan.tool_name]
    if (!promptName) {
      return plan // Pas un tool management, retourner tel quel
    }

    console.log(`🔍 [EXTRACT] Extraction pour ${plan.tool_name} avec prompt ${promptName}`)

    // Charger le prompt d'extraction (is_default = true en priorité, sinon is_active le plus récent)
    let prompt: any = null
    let promptError: any = null
    const defaultResult = await supabase
      .from('chat_prompts')
      .select('*')
      .eq('name', promptName)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()
    if (defaultResult.data) {
      prompt = defaultResult.data
    } else {
      const fallbackResult = await supabase
        .from('chat_prompts')
        .select('*')
        .eq('name', promptName)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      prompt = fallbackResult.data
      promptError = fallbackResult.error
    }

    if (!prompt) {
      console.warn(`⚠️ [EXTRACT] Prompt ${promptName} non trouvé, utilisation params tool_selection`, promptError)
      return plan
    }

    // Pour task_extraction : charger la liste des actions standard et injecter le catalogue
    let validStandardActionCodes: Set<string> = new Set()
    const farmContextForPrompt = (promptMapping[plan.tool_name] === 'sale_extraction' || promptMapping[plan.tool_name] === 'purchase_extraction')
      ? farmContextCommercial
      : farmContextBase

    let promptContent = prompt.content
    if (promptName === 'task_extraction') {
      const { data: standardActions } = await supabase
        .from('task_standard_actions')
        .select('code, label_fr, description, category')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true })

      if (standardActions && standardActions.length > 0) {
        validStandardActionCodes = new Set(standardActions.map((a: any) => a.code))
        const catalog = standardActions
          .map((a: any) => `- ${a.code} — ${a.label_fr}${a.description ? ` (${a.description})` : ''}`)
          .join('\n')
        promptContent = promptContent.replace('{{standard_actions_catalog}}', catalog)
        console.log(`📋 [EXTRACT] ${standardActions.length} actions standard chargées`)
      } else {
        // Fallback : supprimer le placeholder si la table est vide
        promptContent = promptContent.replace('{{standard_actions_catalog}}', '(liste non disponible — utiliser "autre")')
        console.warn('⚠️ [EXTRACT] task_standard_actions vide ou inaccessible')
      }
    }

    const systemPrompt = promptContent
      .replace('{{user_message}}', userMessage)
      .replace('{{farm_context}}', farmContextForPrompt)
      .replace('{{current_date}}', new Date().toLocaleDateString('fr-FR'))
      .replace('{{current_date_iso}}', new Date().toISOString().split('T')[0])

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        console.error(`❌ [EXTRACT] OpenAI error: ${await response.text()}`)
        return plan
      }

      const data = await response.json()
      const rawResponse = data.choices[0].message.content

      console.log(`🤖 [EXTRACT] Réponse brute: ${rawResponse.substring(0, 300)}`)

      let parsed: any
      try {
        parsed = JSON.parse(rawResponse)
      } catch (e) {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          console.warn(`⚠️ [EXTRACT] Impossible de parser la réponse`)
          return plan
        }
      }

      // Valider standard_action si présente (task_extraction uniquement)
      if (promptName === 'task_extraction' && parsed.extracted_data?.standard_action != null) {
        const rawCode = String(parsed.extracted_data.standard_action).trim()
        if (validStandardActionCodes.size > 0 && !validStandardActionCodes.has(rawCode)) {
          console.warn(`⚠️ [EXTRACT] standard_action invalide "${rawCode}" → null`)
          parsed.extracted_data.standard_action = null
        } else {
          console.log(`✅ [EXTRACT] standard_action validé: "${rawCode}"`)
        }
      }

      // Fusionner les données extraites avec le plan
      const enrichedPlan = {
        ...plan,
        original_text: parsed.original_text || userMessage,
        decomposed_text: parsed.decomposed_text,
        confidence: parsed.confidence || plan.confidence,
        parameters: {
          ...plan.parameters,
          ...parsed.extracted_data,
          surface_units_config: parsed.surface_units_config,
          card_summary: parsed.card_summary
        }
      }

      console.log(`✅ [EXTRACT] Plan enrichi pour ${plan.tool_name}:`, JSON.stringify(enrichedPlan.parameters, null, 2).substring(0, 500))

      return enrichedPlan
    } catch (error) {
      console.error(`❌ [EXTRACT] Exception:`, error.message)
      return plan
    }
  }))

  return enrichedPlans
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MEMBER_MATCHING_PROMPT_FALLBACK = `
Tu identifies les membres de ferme mentionnes dans le message utilisateur.
Retourne STRICTEMENT un JSON valide:
{
  "matched_member_ids": ["uuid", "..."],
  "detected_people_count": 2
}

Regles:
- matched_member_ids: uniquement des user_id presents dans la liste fournie.
- detected_people_count: nombre total de personnes detectees dans le message ("nous etions 4", "a deux", etc.).
- Si aucun membre n'est reconnu mais un nombre est detecte, retourne ce nombre dans detected_people_count.
- Si rien n'est detecte, retourne [] et null.
- Ne retourne aucune explication, uniquement le JSON.
`.trim()

function normalizeDetectedPeopleCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function normalizeMatchedMemberIds(rawIds: unknown, context: UserContext): string[] {
  if (!Array.isArray(rawIds)) return []
  const allowed = new Set((context.members || []).map((m) => String(m.user_id)))
  return rawIds
    .map((id) => String(id || '').trim())
    .filter((id) => UUID_REGEX.test(id) && allowed.has(id))
}

async function getMemberMatchingPrompt(supabase: any): Promise<string> {
  try {
    const defaultResult = await supabase
      .from('chat_prompts')
      .select('content')
      .eq('name', 'member_matching')
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (defaultResult.data?.content) {
      return String(defaultResult.data.content)
    }

    const fallbackResult = await supabase
      .from('chat_prompts')
      .select('content')
      .eq('name', 'member_matching')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fallbackResult.data?.content) {
      return String(fallbackResult.data.content)
    }
  } catch (error) {
    console.warn('⚠️ [MEMBER-MATCH] Prompt member_matching introuvable, fallback utilisé')
  }

  return MEMBER_MATCHING_PROMPT_FALLBACK
}

async function matchMembersForMessage(
  supabase: any,
  openAIKey: string,
  userMessage: string,
  context: UserContext
): Promise<{ matched_member_ids: string[]; detected_people_count: number | null }> {
  if (!context.members || context.members.length === 0) {
    return { matched_member_ids: [], detected_people_count: null }
  }

  const promptTemplate = await getMemberMatchingPrompt(supabase)
  const membersCatalog = context.members
    .map((member) => {
      const nameParts = [member.first_name, member.last_name].filter(Boolean).join(' ').trim()
      const fallbackName = member.full_name || nameParts || member.user_id
      return `- ${member.user_id} | ${fallbackName} | role=${member.role}`
    })
    .join('\n')

  const systemPrompt = promptTemplate
    .replace('{{members_catalog}}', membersCatalog)
    .replace('{{current_date_iso}}', new Date().toISOString().split('T')[0])

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      console.warn(`⚠️ [MEMBER-MATCH] OpenAI error: ${await response.text()}`)
      return { matched_member_ids: [], detected_people_count: null }
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    let parsed: any = {}

    try {
      parsed = JSON.parse(raw)
    } catch {
      const jsonMatch = String(raw).match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    }

    return {
      matched_member_ids: normalizeMatchedMemberIds(parsed?.matched_member_ids, context),
      detected_people_count: normalizeDetectedPeopleCount(parsed?.detected_people_count),
    }
  } catch (error) {
    console.warn(`⚠️ [MEMBER-MATCH] Exception: ${(error as Error).message}`)
    return { matched_member_ids: [], detected_people_count: null }
  }
}

async function enrichTaskPlansWithMemberMatching(
  supabase: any,
  openAIKey: string,
  toolPlans: any[],
  context: UserContext
): Promise<any[]> {
  if (!toolPlans.length) return toolPlans

  const enrichedPlans: any[] = []

  for (const plan of toolPlans) {
    const isTaskPlan = plan?.tool_name === 'create_task_done' || plan?.tool_name === 'create_task_planned'
    if (!isTaskPlan) {
      enrichedPlans.push(plan)
      continue
    }

    const matchingSource = plan.reconstructed_message || plan.original_user_message || ''
    const matching = await matchMembersForMessage(supabase, openAIKey, matchingSource, context)
    const explicitPeopleCount = normalizeDetectedPeopleCount(plan?.parameters?.number_of_people)

    const mergedParameters: Record<string, unknown> = {
      ...(plan.parameters || {}),
      matched_member_ids: matching.matched_member_ids,
    }

    if (explicitPeopleCount == null && matching.matched_member_ids.length > 0) {
      mergedParameters.number_of_people = matching.matched_member_ids.length
    } else if (explicitPeopleCount == null && matching.detected_people_count != null) {
      mergedParameters.number_of_people = matching.detected_people_count
    }

    console.log(
      `👥 [MEMBER-MATCH] ${plan.tool_name}: matched=${matching.matched_member_ids.length}, ` +
      `detected_people=${matching.detected_people_count ?? 'none'}, explicit_people=${explicitPeopleCount ?? 'none'}`
    )

    enrichedPlans.push({
      ...plan,
      parameters: mergedParameters
    })
  }

  return enrichedPlans
}

// ============================================================================
// HELP CONTENT BY TOPIC (intent help)
// ============================================================================

const HELP_CONTENT_BY_TOPIC: Record<string, { message: string; examples: string[]; app_path?: string }> = {
  manage_plot: {
    message: 'Utilise le bouton de raccourci ci-dessous pour ouvrir Profil > Configurer > Gestion des parcelles. Tu peux aussi me le demander directement dans le chat avec une phrase complète (nom, type, dimensions, planches).',
    examples: [
      'Ajoute une nouvelle parcelle, tunnel 3 de 30 m de long et 9m60 de large avec 6 planches de 30 m de long et 1 m de large',
    ],
    app_path: 'Profil > Configurer > Gestion des parcelles',
  },
  manage_material: {
    message: 'Utilise le bouton de raccourci ci-dessous pour ouvrir Profil > Configurer > Matériel. Tu peux aussi créer ou modifier un matériel en l\'écrivant directement dans le chat.',
    examples: [
      'Ajoute un nouveau matériel: semoir 6 rangs Monosem, catégorie outils tracteur',
    ],
    app_path: 'Profil > Configurer > Matériel',
  },
  manage_conversion: {
    message: 'Utilise le bouton de raccourci ci-dessous pour ouvrir Profil > Configurer > Conversions. Tu peux aussi me donner la conversion directement dans le chat en format "1 contenant = X unité".',
    examples: [
      'Ajoute la conversion: 1 bac de courgettes = 15 kg',
    ],
    app_path: 'Profil > Configurer > Conversions',
  },
  task: {
    message: 'Pour enregistrer une tâche ou une récolte, dis-moi l\'action, la culture, la zone et éventuellement la durée/quantité.',
    examples: [
      'J\'ai désherbé la serre 1 pendant 1 heure',
      'J\'ai récolté 4 caisses de concombres en serre 2',
      'Je vais planter des laitues demain matin',
      'J\'ai récolté 10 kg de tomates en serre 2',
    ],
    app_path: 'Onglet Tâches',
  },
  observation: {
    message: 'Pour créer une observation, décris le problème, la culture concernée et la localisation.',
    examples: [
      'J\'ai observé des pucerons sur les tomates de la serre 1',
      'Il y a du mildiou sur les vignes du champ nord',
      'Le tracteur fait un bruit étrange',
    ],
    app_path: 'Onglet Assistant IA (ou Tâches)',
  },
  team: {
    message: 'Pour inviter un membre: va dans Profil > Équipe de la ferme > bouton +. Saisis l\'email et choisis le rôle.',
    examples: [],
    app_path: 'Profil > Équipe de la ferme',
  },
  app_features: {
    message: 'Voici où trouver les principales fonctionnalités :',
    examples: [
      'Parcelles : Profil > Configurer  > Gestion des parcelles',
      'Matériel : Profil > Configurer  > Matériel',
      'Conversions : Profil > Configurer  > Conversions',
      'Tâches : onglet Tâches',
      'Chat IA : onglet Assistant IA',
      'Équipe : Profil > Équipe de la ferme',
      'Statistiques : onglet Statistiques',
    ],
  },
  general: {
    message: 'Je peux t\'aider pour les parcelles, le matériel, les conversions, les tâches et récoltes, les observations, et l\'équipe. Dis-moi ce que tu veux faire ou pose une question précise.',
    examples: [
      'Comment ajouter une parcelle ?',
      'Où enregistrer une récolte ?',
      'Comment inviter un membre d\'équipe ?',
    ],
  },
}

// Mapping help_topic → écran (pour la card raccourci "Aller à...")
const HELP_TOPIC_TO_SCREEN: Record<string, { screen: string; label: string }> = {
  manage_plot: { screen: 'PlotsSettings', label: 'Aller à Gestion des parcelles' },
  manage_material: { screen: 'MaterialsSettings', label: 'Aller au Matériel' },
  manage_conversion: { screen: 'ConversionsSettings', label: 'Aller aux Conversions' },
  team: { screen: 'FarmMembers', label: 'Aller à l\'équipe' },
}

function normalizeHelpTopic(rawTopic: unknown): string | null {
  if (typeof rawTopic !== 'string' || !rawTopic.trim()) return null

  const topic = normalizeString(rawTopic)
  if (!topic) return null

  const aliases: Record<string, string[]> = {
    manage_plot: ['manage_plot', 'plot', 'plots', 'parcelle', 'parcelles', 'serre', 'tunnel', 'planche', 'planches', 'surface_unit', 'surface_units'],
    manage_material: ['manage_material', 'material', 'materials', 'materiel', 'materiaux', 'equipement', 'outil', 'outils'],
    manage_conversion: ['manage_conversion', 'conversion', 'conversions', 'unite', 'unites', 'equivalence', 'poids'],
    task: ['task', 'tasks', 'tache', 'taches', 'recolte', 'recoltes', 'action'],
    observation: ['observation', 'observations', 'ravageur', 'ravageurs', 'maladie', 'maladies', 'probleme', 'problemes'],
    team: ['team', 'equipe', 'member', 'members', 'membre', 'membres'],
    app_features: ['app_features', 'fonctionnalites', 'navigation', 'ou trouver', 'menu']
  }

  for (const [canonical, values] of Object.entries(aliases)) {
    if (values.some(v => topic === v || topic.includes(v))) return canonical
  }
  return null
}

function inferHelpTopicFromMessage(rawMessage: unknown, contextInferred?: any): string {
  const subjectType = normalizeString(
    typeof contextInferred?.subject_type === 'string' ? contextInferred.subject_type : ''
  )
  if (subjectType) {
    if (/\b(material|materiel|equipment|outil)\b/.test(subjectType)) return 'manage_material'
    if (/\b(plot|parcelle|surface|surface_unit|planche)\b/.test(subjectType)) return 'manage_plot'
    if (/\b(conversion|unit|unite)\b/.test(subjectType)) return 'manage_conversion'
    if (/\b(task|tache|recolte)\b/.test(subjectType)) return 'task'
    if (/\b(observation|issue|maladie|ravageur)\b/.test(subjectType)) return 'observation'
    if (/\b(team|member|membre|equipe)\b/.test(subjectType)) return 'team'
  }

  const message = normalizeString(typeof rawMessage === 'string' ? rawMessage : '')
  if (!message) return 'general'

  if (/\b(material|materiel|outils?|equipement|tracteur|pulverisateur|herse|semoir)\b/.test(message)) return 'manage_material'
  if (/\b(parcelle|parcelles|serre|tunnel|planche|planches|rang|ligne)\b/.test(message)) return 'manage_plot'
  if (/\b(conversion|conversions|caisse|caisses|panier|paniers|equivalence|kg|poids)\b/.test(message)) return 'manage_conversion'
  if (/\b(tache|taches|recolte|recolter|planifier|desherber|traiter|planter|semer)\b/.test(message)) return 'task'
  if (/\b(observation|observer|ravageur|ravageurs|maladie|maladies|puceron|mildiou)\b/.test(message)) return 'observation'
  if (/\b(equipe|membre|membres|inviter|invitation|role|roles)\b/.test(message)) return 'team'
  if (/\b(ou|où)\b.*\b(trouver|acceder|acces|menu|fonctionnalite|fonctionnalites)\b/.test(message)) return 'app_features'

  return 'general'
}

// ============================================================================
// ÉTAPE 5: TOOL EXECUTION
// ============================================================================

async function executeTools(
  supabase: any, 
  toolPlans: any[], 
  context: UserContext,
  farmId: number,
  userId: string,
  sessionId: string,
  messageId: string
) {
  console.log(`⚡ [EXECUTE] Exécution de ${toolPlans.length} tool(s)...`)
  
  const results = []
  
  // Créer l'analyse
  const { data: analysis, error: analysisError } = await supabase
    .from('chat_message_analyses')
    .insert({
      session_id: sessionId,
      message_id: messageId,
      user_message: toolPlans[0]?.original_user_message || toolPlans[0]?.reconstructed_message || 'Pipeline execution',
      analysis_result: {
        pipeline_mode: true,
        intent: toolPlans[0]?.intent || 'unclear',
        tools_selected: toolPlans.map(tp => tp.tool_name)
      },
      confidence_score: toolPlans[0]?.intent_confidence || toolPlans[0]?.confidence || 0.8,
      processing_time_ms: 0,
      model_used: 'gpt-4o-mini-pipeline'
    })
    .select()
    .single()

  const analysisId = analysis?.id

  for (const plan of toolPlans) {
    console.log(`🔧 [EXECUTE] Tool: ${plan.tool_name}`)
    
    try {
      let result = null
      
      switch (plan.tool_name) {
        case 'create_observation':
          result = await createObservationFromTool(supabase, plan, context, farmId, userId, analysisId)
          break
          
        case 'create_task_done':
          result = await createTaskFromTool(supabase, plan, context, farmId, userId, analysisId)
          break
          
        case 'create_task_planned':
          result = await createTaskFromTool(supabase, plan, context, farmId, userId, analysisId)
          break
          
        case 'help': {
          const requestedTopic = normalizeHelpTopic(plan.parameters?.help_topic)
          const inferredTopic = inferHelpTopicFromMessage(
            `${plan.reconstructed_message || ''} ${plan.original_user_message || ''}`.trim(),
            plan.context_inferred
          )
          const topicKey = requestedTopic || inferredTopic
          const raw = HELP_CONTENT_BY_TOPIC[topicKey] ?? HELP_CONTENT_BY_TOPIC['general']
          const helpContent = raw ?? {
            message: 'Je peux t\'aider pour les parcelles, le matériel, les conversions, les tâches, les observations et l\'équipe. Dis-moi ce que tu veux faire.',
            examples: ['Comment ajouter une parcelle ?', 'Où enregistrer une récolte ?'],
          }
          console.log(`ℹ️ [HELP] topic=${topicKey} (requested=${requestedTopic || 'none'}, inferred=${inferredTopic})`)
          result = {
            success: true,
            message: helpContent.message,
            action_type: 'help',
            help_topic: topicKey,
            help_content: {
              message: helpContent.message,
              examples: helpContent.examples,
              ...(helpContent.app_path != null && { app_path: helpContent.app_path }),
            },
            analysis_id: analysisId,
          }
          break
        }

        case 'manage_plot':
          result = await createPlotFromTool(supabase, plan, context, farmId, userId, analysisId)
          break

        case 'manage_conversion':
          result = await createConversionFromTool(supabase, plan, context, farmId, userId, analysisId)
          break

        case 'manage_material':
          result = await createMaterialFromTool(supabase, plan, context, farmId, userId, analysisId)
          break

        case 'create_sale':
          result = await createSaleFromTool(supabase, plan, context, farmId, userId, analysisId)
          break

        case 'create_purchase':
          result = await createPurchaseFromTool(supabase, plan, context, farmId, userId, analysisId)
          break
          
        default:
          result = {
            success: false,
            message: `Tool ${plan.tool_name} non implémenté`,
            action_type: 'unknown'
          }
      }
      
      results.push(result)
      
    } catch (error) {
      console.error(`❌ [EXECUTE] Erreur tool ${plan.tool_name}:`, error.message)
      results.push({
        success: false,
        message: error.message,
        action_type: plan.tool_name
      })
    }
  }
  
  return results
}

async function createObservationFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const params = toolPlan.parameters || {}
  
  // Contextualiser pour matching
  const actionForContext = {
    action_type: 'observation',
    original_text: toolPlan.original_text,
    decomposed_text: toolPlan.decomposed_text,
    extracted_data: {
      issue: params.issue,
      crop: params.crop,
      plots: params.plot_reference ? [params.plot_reference] : (params.plots || []),
      materials: params.materials || []
    }
  }
  
  const contextualized = await contextualizeAction(supabase, actionForContext, context, farmId)
  
  // Créer l'observation
  const capitalizeFirst = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''
  const title = params.crop
    ? `${capitalizeFirst(params.issue)} ${capitalizeFirst(params.crop)}`
    : capitalizeFirst(params.issue)
  
  const { data: observation, error } = await supabase
    .from('observations')
    .insert({
      farm_id: farmId,
      user_id: userId,
      title: title,
      category: params.category || 'autre',
      nature: params.issue,
      crop: params.crop,
      plot_ids: contextualized.context.plot_ids || [],
      surface_unit_ids: contextualized.context.surface_unit_ids || [],
      status: 'active',
      severity: params.severity || 'moyen'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erreur création observation: ${error.message}`)
  }

  // Préparer card_summary pour UI
  const card_summary = {
    title: title,
    highlights: [
      params.issue,
      params.crop ? `Culture: ${params.crop}` : null,
      `Gravité: ${params.severity || 'moyen'}`,
      contextualized.context.plot_ids?.length > 0 
        ? `Parcelles: ${contextualized.context.matched_plots?.map((p: any) => p.name).join(', ') || contextualized.context.plot_ids.length}` 
        : null
    ].filter(Boolean)
  }

  // Créer l'action analysée
  const { data: analyzedAction } = await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: 'observation',
      action_data: {
        original_text: toolPlan.original_text || 'Observation',
        decomposed_text: `Observation: ${params.issue} sur ${params.crop || 'cultures'}`,
        context: contextualized.context,
        extracted_data: { ...contextualized.extracted_data, ...params },
        card_summary: card_summary
      },
      matched_entities: contextualized.context,
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: observation.id,
      record_type: 'observation'
    })
    .select()
    .single()

  return {
    success: true,
    message: `Observation créée: ${title}`,
    action_type: 'observation',
    action_id: analyzedAction?.id,
    record_id: observation.id,
    analysis_id: analysisId,
    extracted_data: { ...contextualized.extracted_data, ...params, card_summary },
    matched_entities: contextualized.context,
    original_text: toolPlan.original_text,
    decomposed_text: `Observation: ${params.issue}`,
    confidence: toolPlan.confidence
  }
}

async function createTaskFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const params = toolPlan.parameters || {}
  const matchedMemberIds = normalizeMatchedMemberIds(params.matched_member_ids, context)
  const explicitPeopleCount = normalizeDetectedPeopleCount(params.number_of_people)
  const resolvedPeopleCount = explicitPeopleCount != null
    ? explicitPeopleCount
    : (matchedMemberIds.length > 0 ? matchedMemberIds.length : 1)
  
  console.log(`📋 [CREATE-TASK] Paramètres reçus:`, JSON.stringify(params, null, 2))
  
  // Contextualiser pour matching
  const isPlanned = toolPlan.tool_name === 'create_task_planned'
  const actionForContext = {
    action_type: isPlanned ? 'task_planned' : 'task_done',
    original_text: toolPlan.original_text,
    decomposed_text: toolPlan.decomposed_text,
    extracted_data: {
      action: params.action,
      crop: params.crop,
      crops: params.crops || [],
      plots: params.plots || (params.plot_reference ? [params.plot_reference] : []),
      materials: params.materials || [],
      quantity: params.quantity,
      quantity_nature: params.quantity_nature,
      quantity_type: params.quantity_type,
      duration: params.duration,
      number_of_people: resolvedPeopleCount,
      date: params.date || params.scheduled_date
    }
  }
  
  const contextualized = await contextualizeAction(supabase, actionForContext, context, farmId)
  
  // Déterminer le statut
  const status = isPlanned ? 'en_attente' : 'terminee'
  
  // Préparer les données de tâche
  const category = determineTaskCategory(params.action, toolPlan.tool_name)
  console.log(`🏷️ [CREATE-TASK] Catégorie déterminée: ${category}`)
  
  const taskData: any = {
    farm_id: farmId,
    user_id: userId,
    title: `${capitalizeFirst(params.action || 'tâche')} ${capitalizeFirst(params.crop || '')}`.trim(),
    description: toolPlan.original_text || 'Tâche pipeline',
    action: params.action || 'autre',
    category: category,
    type: 'tache',
    date: convertRelativeDateToISO(isPlanned ? (params.scheduled_date || params.date || 'aujourd\'hui') : (params.date || 'aujourd\'hui')),
    time: params.scheduled_time || null,
    duration_minutes: params.duration?.value ? 
      (params.duration.unit === 'heures' || params.duration.unit === 'heure' ? params.duration.value * 60 : params.duration.value) : null,
    status: status,
    priority: 'moyenne',
    plot_ids: contextualized.context.plot_ids || [],
    surface_unit_ids: contextualized.context.surface_unit_ids || [],
    material_ids: contextualized.context.material_ids || [],
    plants: params.crops?.length > 0 ? params.crops : (params.crop ? [params.crop] : []),
    number_of_people: resolvedPeopleCount,
    ai_confidence: toolPlan.confidence || 0.9,
    standard_action: (params.standard_action && String(params.standard_action).trim()) || null
  }
  
  console.log(`📦 [CREATE-TASK] Données tâche:`, JSON.stringify(taskData, null, 2))

  // Ajouter quantités si présentes (garde-fou: pas de quantity_type si aucune quantité réelle)
  const hasQty = (params.quantity?.value != null) || (params.quantity?.unit != null && String(params.quantity.unit).trim() !== '') ||
    (params.quantity_nature != null && String(params.quantity_nature).trim() !== '') ||
    contextualized?.extracted_data?.quantity_converted?.value != null
  if (hasQty) {
    if (params.quantity?.value != null || params.quantity?.unit) {
      taskData.quantity_value = params.quantity?.value ?? null
      taskData.quantity_unit = params.quantity?.unit ?? null
    }
    taskData.quantity_nature = params.quantity_nature || params.crop || null
    taskData.quantity_type = params.quantity_type || 'autre'
    if (contextualized?.extracted_data?.quantity_converted) {
      taskData.quantity_converted_value = contextualized.extracted_data.quantity_converted.value
      taskData.quantity_converted_unit = contextualized.extracted_data.quantity_converted.unit
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  if (error) {
    console.error(`❌ [CREATE-TASK] Erreur DB:`, error)
    throw new Error(`Erreur création tâche: ${error.message}`)
  }
  
  console.log(`✅ [CREATE-TASK] Tâche créée: ${task.id}`)

  if (matchedMemberIds.length > 0) {
    const taskMembersRows = matchedMemberIds.map((memberUserId) => ({
      task_id: task.id,
      user_id: memberUserId,
      role: 'participant'
    }))

    const { error: taskMembersError } = await supabase
      .from('task_members')
      .upsert(taskMembersRows, { onConflict: 'task_id,user_id' })

    if (taskMembersError) {
      console.warn(`⚠️ [CREATE-TASK] task_members upsert error: ${taskMembersError.message}`)
    } else {
      console.log(`✅ [CREATE-TASK] task_members créés: ${matchedMemberIds.length}`)
    }
  }

  // Préparer card_summary pour UI
  const highlights = [
    params.crop ? `Culture: ${params.crop}` : null,
    params.duration ? `Durée: ${params.duration.value} ${params.duration.unit}` : null,
    params.quantity ? `Quantité: ${params.quantity.value} ${params.quantity.unit}` : null,
    contextualized.context.plot_ids?.length > 0 
      ? `Parcelles: ${contextualized.context.matched_plots?.map((p: any) => p.name).join(', ') || contextualized.context.plot_ids.length}` 
      : null
  ].filter(Boolean)

  const card_summary = {
    title: taskData.title,
    highlights: highlights.length > 0 ? highlights : undefined
  }

  // extracted_data : pas de quantity_type si aucune quantité (garde-fou)
  const rawExtracted = { ...contextualized.extracted_data, ...params }
  const extracted_data = hasQty
    ? { ...rawExtracted, number_of_people: resolvedPeopleCount, matched_member_ids: matchedMemberIds }
    : { ...rawExtracted, quantity_type: null, number_of_people: resolvedPeopleCount, matched_member_ids: matchedMemberIds }

  // Créer l'action analysée
  const { data: analyzedAction } = await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: isPlanned ? 'task_planned' : 'task_done',
      action_data: {
        original_text: toolPlan.original_text || 'Tâche',
        decomposed_text: `${params.action} ${params.crop || ''}`,
        context: contextualized.context,
        extracted_data,
        card_summary: card_summary
      },
      matched_entities: contextualized.context,
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: task.id,
      record_type: 'task'
    })
    .select()
    .single()

  return {
    success: true,
    message: `Tâche ${isPlanned ? 'planifiée' : 'créée'}: ${taskData.title}`,
    action_type: isPlanned ? 'task_planned' : 'task_done',
    action_id: analyzedAction?.id,
    record_id: task.id,
    analysis_id: analysisId,
    extracted_data: { ...extracted_data, card_summary },
    matched_entities: contextualized.context,
    original_text: toolPlan.original_text,
    decomposed_text: `${params.action} ${params.crop || ''}`,
    confidence: toolPlan.confidence
  }
}

function capitalizeFirst(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

async function createPlotFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const params = toolPlan.parameters || {}
  const name = params.name || params.plot_name
  if (!name || !name.trim()) {
    return {
      success: false,
      message: 'Nom de parcelle requis',
      action_type: 'manage_plot',
      analysis_id: analysisId
    }
  }

  const plotType = params.type || 'autre'
  const validTypes = ['serre_plastique', 'serre_verre', 'plein_champ', 'tunnel', 'hydroponique', 'pepiniere', 'autre']
  const type = validTypes.includes(plotType) ? plotType : 'autre'

  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .insert({
      farm_id: farmId,
      name: name.trim(),
      code: params.code || null,
      type,
      length: params.length || null,
      width: params.width || null,
      description: params.description || null,
      aliases: params.aliases || [],
      llm_keywords: params.llm_keywords || [name.toLowerCase().trim()],
      is_active: true
    })
    .select()
    .single()

  if (plotError) {
    console.error('❌ [CREATE-PLOT] Erreur:', plotError)
    return {
      success: false,
      message: `Erreur création parcelle: ${plotError.message}`,
      action_type: 'manage_plot',
      analysis_id: analysisId
    }
  }

  const suConfig = params.surface_units_config
  let surfaceUnitsCreated = 0
  if (suConfig && suConfig.count > 0 && plot?.id) {
    const count = Math.min(suConfig.count, 100)
    const suType = suConfig.type || 'planche'
    const start = suConfig.sequence_start ?? 1
    const pattern = suConfig.naming_pattern || `${suType} {n}`
    const suLength = suConfig['length'] != null ? Number(suConfig['length']) : null
    const suWidth = suConfig['width'] != null ? Number(suConfig['width']) : null

    for (let i = 0; i < count; i++) {
      const n = start + i
      const suName = pattern.replace('{n}', String(n)).replace('{N}', String(n))
      const insertRow: Record<string, unknown> = {
        plot_id: plot.id,
        name: suName,
        code: suName.toLowerCase().replace(/\s+/g, '-'),
        type: suType,
        sequence_number: n,
        is_active: true
      }
      if (suLength != null && suLength > 0) insertRow.length = suLength
      if (suWidth != null && suWidth > 0) insertRow.width = suWidth
      const { error: suError } = await supabase
        .from('surface_units')
        .insert(insertRow)
      if (!suError) surfaceUnitsCreated++
    }
  }

  const suConfigForCard = params.surface_units_config
  const suDimText = surfaceUnitsCreated > 0 && suConfigForCard?.['length'] != null && suConfigForCard?.['width'] != null
    ? ` • ${surfaceUnitsCreated} SU × ${Number(suConfigForCard['length'])}m × ${Number(suConfigForCard['width'])}m`
    : surfaceUnitsCreated > 0
      ? ` • ${surfaceUnitsCreated} planches créées`
      : ''
  const cardSummary = params.card_summary || {
    action_type: 'manage_plot',
    title: `Parcelle ${name} créée`,
    subtitle: `${type}${plot.length && plot.width ? ` • ${plot.length * plot.width} m²` : ''}${suDimText}`,
    highlights: [
      { label: 'Type', value: type },
      ...(plot.length && plot.width ? [{ label: 'Dimensions', value: `${plot.length}m x ${plot.width}m` }] : []),
      ...(surfaceUnitsCreated > 0
        ? [{ label: 'Planches', value: suConfigForCard?.['length'] != null && suConfigForCard?.['width'] != null
          ? `${surfaceUnitsCreated} × ${Number(suConfigForCard['length'])}m × ${Number(suConfigForCard['width'])}m`
          : `${surfaceUnitsCreated} créées` }]
        : [])
    ],
    record_type: 'plot'
  }

  const { data: analyzedAction } = await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: 'manage_plot',
      action_data: {
        original_text: toolPlan.original_text || name,
        decomposed_text: `créer parcelle ${name}`,
        context: {},
        extracted_data: { ...params, record_id: plot.id },
        card_summary: cardSummary
      },
      matched_entities: {},
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: plot.id,
      record_type: 'plot'
    })
    .select()
    .single()

  return {
    success: true,
    message: `Parcelle "${name}" créée${surfaceUnitsCreated > 0 ? ` avec ${surfaceUnitsCreated} planches` : ''}`,
    action_type: 'manage_plot',
    action_id: analyzedAction?.id,
    record_id: plot.id,
    analysis_id: analysisId,
    extracted_data: { ...params, record_id: plot.id },
    matched_entities: {},
    original_text: toolPlan.original_text,
    decomposed_text: `créer parcelle ${name}`,
    confidence: toolPlan.confidence,
    card_summary: cardSummary
  }
}

async function createConversionFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const params = toolPlan.parameters || {}
  const containerName = params.container_name || params.containerName
  const cropName = params.crop_name || params.cropName
  const conversionValue = params.conversion_value ?? params.conversionValue
  const conversionUnit = params.conversion_unit || params.conversionUnit || 'kg'

  if (!containerName || !cropName || conversionValue == null) {
    return {
      success: false,
      message: 'container_name, crop_name et conversion_value requis',
      action_type: 'manage_conversion',
      analysis_id: analysisId
    }
  }

  const { data: conversion, error } = await supabase
    .from('user_conversion_units')
    .insert({
      user_id: userId,
      farm_id: farmId,
      container_name: containerName.trim(),
      crop_name: cropName.trim(),
      conversion_value: Number(conversionValue),
      conversion_unit: conversionUnit.trim(),
      container_type: params.container_type || null,
      description: params.description || null,
      slugs: params.slugs || [`${containerName}-${cropName}`.toLowerCase().replace(/\s+/g, '-')],
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('❌ [CREATE-CONVERSION] Erreur:', error)
    return {
      success: false,
      message: `Erreur création conversion: ${error.message}`,
      action_type: 'manage_conversion',
      analysis_id: analysisId
    }
  }

  const cardSummary = params.card_summary || {
    action_type: 'manage_conversion',
    title: `Conversion ${containerName} ${cropName}`,
    subtitle: `1 ${containerName} = ${conversionValue} ${conversionUnit}`,
    highlights: [
      { label: 'Contenant', value: containerName },
      { label: 'Culture', value: cropName },
      { label: 'Équivalent', value: `${conversionValue} ${conversionUnit}` }
    ],
    record_type: 'conversion'
  }

  const { data: analyzedAction } = await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: 'manage_conversion',
      action_data: {
        original_text: toolPlan.original_text || '',
        decomposed_text: `conversion ${containerName} ${cropName}`,
        context: {},
        extracted_data: { ...params, record_id: conversion.id },
        card_summary: cardSummary
      },
      matched_entities: {},
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: conversion.id,
      record_type: 'conversion'
    })
    .select()
    .single()

  return {
    success: true,
    message: `Conversion créée: 1 ${containerName} = ${conversionValue} ${conversionUnit} de ${cropName}`,
    action_type: 'manage_conversion',
    action_id: analyzedAction?.id,
    record_id: conversion.id,
    analysis_id: analysisId,
    extracted_data: { ...params, record_id: conversion.id },
    matched_entities: {},
    original_text: toolPlan.original_text,
    decomposed_text: `conversion ${containerName} ${cropName}`,
    confidence: toolPlan.confidence,
    card_summary: cardSummary
  }
}

async function createMaterialFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const params = toolPlan.parameters || {}
  const name = params.name || params.material_name
  if (!name || !name.trim()) {
    return {
      success: false,
      message: 'Nom du matériel requis',
      action_type: 'manage_material',
      analysis_id: analysisId
    }
  }

  const category = params.category || 'autre'
  const validCategories = ['tracteurs', 'outils_tracteur', 'outils_manuels', 'materiel_marketing', 'petit_equipement', 'autre']
  const matCategory = validCategories.includes(category) ? category : 'autre'

  const { data: material, error } = await supabase
    .from('materials')
    .insert({
      farm_id: farmId,
      name: name.trim(),
      category: matCategory,
      model: params.model || null,
      brand: params.brand || null,
      description: params.description || null,
      cost: params.cost ?? null,
      purchase_date: normalizePurchaseDate(params.purchase_date) ?? null,
      supplier: params.supplier || null,
      condition_notes: params.condition_notes || null,
      custom_category: params.custom_category || null,
      llm_keywords: params.llm_keywords || [name.toLowerCase().trim()],
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('❌ [CREATE-MATERIAL] Erreur:', error)
    return {
      success: false,
      message: `Erreur création matériel: ${error.message}`,
      action_type: 'manage_material',
      analysis_id: analysisId
    }
  }

  const cardSummary = params.card_summary || {
    action_type: 'manage_material',
    title: `Matériel ${name} créé`,
    subtitle: `${matCategory}${params.brand ? ` • ${params.brand}` : ''}`,
    highlights: [
      { label: 'Catégorie', value: matCategory },
      ...(params.brand ? [{ label: 'Marque', value: params.brand }] : []),
      ...(params.model ? [{ label: 'Modèle', value: params.model }] : [])
    ],
    record_type: 'material'
  }

  const { data: analyzedAction } = await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: 'manage_material',
      action_data: {
        original_text: toolPlan.original_text || '',
        decomposed_text: `matériel ${name}`,
        context: {},
        extracted_data: { ...params, record_id: material.id },
        card_summary: cardSummary
      },
      matched_entities: {},
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: material.id,
      record_type: 'material'
    })
    .select()
    .single()

  return {
    success: true,
    message: `Matériel "${name}" créé`,
    action_type: 'manage_material',
    action_id: analyzedAction?.id,
    record_id: material.id,
    analysis_id: analysisId,
    extracted_data: { ...params, record_id: material.id },
    matched_entities: {},
    original_text: toolPlan.original_text,
    decomposed_text: `matériel ${name}`,
    confidence: toolPlan.confidence,
    card_summary: cardSummary
  }
}

async function createSaleFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const data = toolPlan.parameters || {}
  const customerName = data.customer_name
  const quantity = data.quantity
  const quantityNature = data.quantity_nature || ''
  const price = data.price || {}
  const vatRate = data.vat_rate ?? 5.5
  const paymentStatus = data.payment_status || 'to_be_paid'
  const deliveryDate = data.delivery_date
  const notes = data.notes

  if (!customerName) {
    return {
      success: false,
      message: 'Client non identifié.',
      action_type: 'sale',
      analysis_id: analysisId
    }
  }

  const cust = await matchCustomer(customerName, farmId, supabase)
  if (!cust) {
    return {
      success: false,
      message: `Impossible de créer ou retrouver le client "${customerName}".`,
      action_type: 'sale',
      analysis_id: analysisId
    }
  }

  const qtyVal = typeof quantity?.value === 'number' ? quantity.value : parseFloat(quantity?.value) || 1
  const qtyUnit = quantity?.unit || 'unité'
  let unitPriceHt = 0

  if (price?.value != null && typeof price.value === 'number') {
    const val = price.value
    const isUnit = price.is_unit_price === true
    const isTtc = price.is_ttc === true
    const rate = vatRate / 100
    if (isUnit) {
      unitPriceHt = isTtc ? val / (1 + rate) : val
    } else {
      unitPriceHt = isTtc ? (val / qtyVal) / (1 + rate) : val / qtyVal
    }
  }

  const productName = quantityNature || 'Produit'
  const status = paymentStatus === 'paid' ? 'paid' : 'sent'

  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      farm_id: farmId,
      user_id: userId,
      invoice_number: '',
      document_type: 'invoice',
      direction: 'outgoing',
      customer_id: cust.id,
      supplier_id: null,
      invoice_date: new Date().toISOString().slice(0, 10),
      delivery_date: deliveryDate || null,
      delivery_location: null,
      payment_due_date: null,
      total_ht: 0,
      total_vat: 0,
      total_ttc: 0,
      status,
      notes: notes || null
    })
    .select('id, invoice_number')
    .single()

  if (invErr || !inv) {
    return {
      success: false,
      message: `Erreur création facture: ${invErr?.message || 'unknown'}`,
      action_type: 'sale',
      analysis_id: analysisId
    }
  }

  const { error: lineErr } = await supabase
    .from('invoice_lines')
    .insert({
      invoice_id: inv.id,
      product_id: null,
      product_name: productName,
      quantity: qtyVal,
      unit: qtyUnit,
      unit_price_ht: unitPriceHt,
      vat_rate: vatRate,
      line_order: 0,
      notes: null
    })

  if (lineErr) {
    await supabase.from('invoices').delete().eq('id', inv.id)
    return {
      success: false,
      message: `Erreur création ligne: ${lineErr.message}`,
      action_type: 'sale',
      analysis_id: analysisId
    }
  }

  const { data: updated } = await supabase
    .from('invoices')
    .select('total_ht, total_vat, total_ttc')
    .eq('id', inv.id)
    .single()

  const cardSummary = {
    action_type: 'sale',
    title: `Vente enregistrée - ${customerName}`,
    subtitle: `${qtyVal} ${qtyUnit} ${productName}`,
    highlights: [
      { label: 'Client', value: customerName },
      { label: 'Montant', value: updated ? `${updated.total_ttc?.toFixed(2) ?? 0}€ TTC` : '—' },
      { label: 'Statut', value: status === 'paid' ? 'Payé' : 'À régler' }
    ],
    record_type: 'invoice'
  }

  await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: 'sale',
      action_data: {
        original_text: toolPlan.original_text || '',
        decomposed_text: `vente ${customerName}`,
        context: {},
        extracted_data: {
          customer_name: customerName,
          quantity: { value: qtyVal, unit: qtyUnit },
          quantity_nature: quantityNature,
          total_ht: updated?.total_ht,
          total_ttc: updated?.total_ttc,
          payment_status: paymentStatus
        },
        card_summary: cardSummary
      },
      matched_entities: {},
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: inv.id,
      record_type: 'invoice'
    })

  return {
    success: true,
    message: `Facture créée pour ${customerName} : ${qtyVal} ${qtyUnit} ${productName} - ${updated?.total_ttc?.toFixed(2) ?? 0}€ TTC`,
    action_type: 'sale',
    record_id: inv.id,
    analysis_id: analysisId,
    extracted_data: {
      customer_name: customerName,
      quantity: { value: qtyVal, unit: qtyUnit },
      quantity_nature: quantityNature,
      total_ht: updated?.total_ht,
      total_ttc: updated?.total_ttc,
      payment_status: paymentStatus,
      record_id: inv.id
    },
    card_summary: cardSummary
  }
}

async function createPurchaseFromTool(
  supabase: any,
  toolPlan: any,
  context: UserContext,
  farmId: number,
  userId: string,
  analysisId: string
) {
  const data = toolPlan.parameters || {}
  const supplierName = data.supplier_name
  const quantity = data.quantity
  const quantityNature = data.quantity_nature || ''
  const price = data.price || {}
  const vatRate = data.vat_rate ?? 5.5
  const paymentStatus = data.payment_status || 'to_be_paid'
  const deliveryDate = data.delivery_date
  const notes = data.notes

  if (!supplierName) {
    return {
      success: false,
      message: 'Fournisseur non identifié.',
      action_type: 'purchase',
      analysis_id: analysisId
    }
  }

  const supp = await matchSupplier(supplierName, farmId, supabase)
  if (!supp) {
    return {
      success: false,
      message: `Impossible de créer ou retrouver le fournisseur "${supplierName}".`,
      action_type: 'purchase',
      analysis_id: analysisId
    }
  }

  const qtyVal = typeof quantity?.value === 'number' ? quantity.value : parseFloat(quantity?.value) || 1
  const qtyUnit = quantity?.unit || 'unité'
  let unitPriceHt = 0

  if (price?.value != null && typeof price.value === 'number') {
    const val = price.value
    const isUnit = price.is_unit_price === true
    const isTtc = price.is_ttc === true
    const rate = vatRate / 100
    if (isUnit) {
      unitPriceHt = isTtc ? val / (1 + rate) : val
    } else {
      unitPriceHt = isTtc ? (val / qtyVal) / (1 + rate) : val / qtyVal
    }
  }

  const productName = quantityNature || 'Produit'
  const status = paymentStatus === 'paid' ? 'paid' : 'sent'

  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      farm_id: farmId,
      user_id: userId,
      invoice_number: '',
      document_type: 'invoice',
      direction: 'incoming',
      customer_id: null,
      supplier_id: supp.id,
      invoice_date: new Date().toISOString().slice(0, 10),
      delivery_date: deliveryDate || null,
      delivery_location: null,
      payment_due_date: null,
      total_ht: 0,
      total_vat: 0,
      total_ttc: 0,
      status,
      notes: notes || null
    })
    .select('id, invoice_number')
    .single()

  if (invErr || !inv) {
    return {
      success: false,
      message: `Erreur création facture: ${invErr?.message || 'unknown'}`,
      action_type: 'purchase',
      analysis_id: analysisId
    }
  }

  const { error: lineErr } = await supabase
    .from('invoice_lines')
    .insert({
      invoice_id: inv.id,
      product_id: null,
      product_name: productName,
      quantity: qtyVal,
      unit: qtyUnit,
      unit_price_ht: unitPriceHt,
      vat_rate: vatRate,
      line_order: 0,
      notes: null
    })

  if (lineErr) {
    await supabase.from('invoices').delete().eq('id', inv.id)
    return {
      success: false,
      message: `Erreur création ligne: ${lineErr.message}`,
      action_type: 'purchase',
      analysis_id: analysisId
    }
  }

  const { data: updated } = await supabase
    .from('invoices')
    .select('total_ht, total_vat, total_ttc')
    .eq('id', inv.id)
    .single()

  const cardSummary = {
    action_type: 'purchase',
    title: `Achat enregistré - ${supplierName}`,
    subtitle: `${qtyVal} ${qtyUnit} ${productName}`,
    highlights: [
      { label: 'Fournisseur', value: supplierName },
      { label: 'Montant', value: updated ? `${updated.total_ttc?.toFixed(2) ?? 0}€ TTC` : '—' },
      { label: 'Statut', value: status === 'paid' ? 'Payé' : 'À régler' }
    ],
    record_type: 'invoice'
  }

  await supabase
    .from('chat_analyzed_actions')
    .insert({
      analysis_id: analysisId,
      action_type: 'purchase',
      action_data: {
        original_text: toolPlan.original_text || '',
        decomposed_text: `achat ${supplierName}`,
        context: {},
        extracted_data: {
          supplier_name: supplierName,
          quantity: { value: qtyVal, unit: qtyUnit },
          quantity_nature: quantityNature,
          total_ht: updated?.total_ht,
          total_ttc: updated?.total_ttc,
          payment_status: paymentStatus
        },
        card_summary: cardSummary
      },
      matched_entities: {},
      confidence_score: toolPlan.confidence || 0.9,
      status: 'pending',
      record_id: inv.id,
      record_type: 'invoice'
    })

  return {
    success: true,
    message: `Facture achat créée pour ${supplierName} : ${qtyVal} ${qtyUnit} ${productName} - ${updated?.total_ttc?.toFixed(2) ?? 0}€ TTC`,
    action_type: 'purchase',
    record_id: inv.id,
    analysis_id: analysisId,
    extracted_data: {
      supplier_name: supplierName,
      quantity: { value: qtyVal, unit: qtyUnit },
      quantity_nature: quantityNature,
      total_ht: updated?.total_ht,
      total_ttc: updated?.total_ttc,
      payment_status: paymentStatus,
      record_id: inv.id
    },
    card_summary: cardSummary
  }
}

function determineTaskCategory(action: string, toolName: string): string {
  if (!action) return 'production'
  
  const actionLower = action.toLowerCase()
  
  // Toutes les tâches agricoles vont dans 'production'
  // Les catégories valides sont: production, marketing, administratif, general
  if (/plant|sem|récolt|ramass|trait|pulvér|déshab|bin|sarclage|irrigation|arros|entretien|labour|désherb/.test(actionLower)) {
    return 'production'
  }
  
  if (/vente|vendre|livr|march/.test(actionLower)) {
    return 'marketing'
  }
  
  if (/compt|admin|factur|papier/.test(actionLower)) {
    return 'administratif'
  }
  
  return 'production' // Par défaut, tout est production
}

// ============================================================================
// HELP MESSAGE BUILDER (skip LLM when action_type = help)
// ============================================================================

function buildHelpMessageFromToolResults(toolResults: any[]): string {
  const first = toolResults[0]
  if (!first || first.action_type !== 'help' || !first.help_content) return ''
  const { message, examples = [], app_path } = first.help_content
  const lines: string[] = []
  lines.push('Bien sûr !')
  lines.push(message)
  if (examples.length) {
    examples.forEach((ex: string) => lines.push(`- ${ex}`))
  }
  if (app_path) {
    lines.push('')
    lines.push(`Tu peux aussi passer par ${app_path}.`)
  }
  lines.push('')
  lines.push('Plus c\'est précis, mieux c\'est !')
  return lines.join('\n')
}

// ============================================================================
// ÉTAPE 5: RESPONSE SYNTHESIS (LLM 3)
// ============================================================================

async function synthesizeResponse(
  supabase: any,
  openAIKey: string,
  userMessage: string,
  toolResults: any[],
  context: UserContext
) {
  console.log('💬 [SYNTHESIS] Chargement prompt response_synthesis...')
  
  const { data: prompt, error: promptError } = await supabase
    .from('chat_prompts')
    .select('*')
    .eq('name', 'response_synthesis')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (promptError || !prompt) {
    console.warn('⚠️ [SYNTHESIS] Prompt non trouvé, utilisation fallback')
    const successful = toolResults.filter(tr => tr.success)
    return {
      content: successful.length > 0 
        ? `✅ ${successful.length} action(s) traitée(s) avec succès.`
        : 'Je n\'ai pas pu traiter votre message.',
      type: 'actions',
      suggestions: []
    }
  }

  console.log(`✅ [SYNTHESIS] Prompt chargé (v${prompt.version}): ${prompt.content.length} chars`)

  const actionsCreated = toolResults.map(tr => ({
    type: tr.action_type,
    success: tr.success,
    message: tr.message,
    record_id: tr.record_id,
    matched_plots: tr.matched_entities?.matched_plots || [],
    matched_materials: tr.matched_entities?.matched_materials || []
  }))

  const mappedToolResults = toolResults.map(tr => {
    const base = { 
      tool: tr.action_type, 
      action_type: tr.action_type,
      success: tr.success, 
      message: tr.message,
      matched_entities: tr.matched_entities || {},
      extracted_data: tr.extracted_data || {}
    }
    if (tr.action_type === 'help' && tr.help_content) {
      return { ...base, help_topic: tr.help_topic, help_content: tr.help_content }
    }
    return base
  })

  const systemPrompt = prompt.content
    .replace('{{user_message}}', userMessage)
    .replace('{{tool_results}}', JSON.stringify(mappedToolResults, null, 2))
    .replace('{{actions_created}}', JSON.stringify(actionsCreated, null, 2))

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Actions: ${actionsCreated.length} créées` }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`)
  }

  const data = await response.json()
  let rawResponse = data.choices[0].message.content || ''

  // Stripper éventuel bloc markdown ```json ... ``` pour ne parser que le JSON
  const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) rawResponse = jsonMatch[1].trim()

  console.log(`🤖 [SYNTHESIS] Réponse: ${rawResponse.substring(0, 150)}`)

  let parsed: any
  try {
    parsed = JSON.parse(rawResponse)
  } catch (e) {
    parsed = {
      content: rawResponse,
      type: 'actions',
      suggestions: []
    }
  }

  return parsed
}

// ============================================================================
// LOGGING
// ============================================================================

async function logExecution(supabase: any, log: any) {
  try {
    await supabase
      .from('chat_agent_executions')
      .insert({
        session_id: log.session_id,
        user_id: log.user_id,
        farm_id: log.farm_id,
        message: log.message,
        intent_detected: log.intent_detected,
        tools_used: log.tools_used,
        execution_steps: log.execution_steps,
        final_response: log.final_response,
        processing_time_ms: log.processing_time_ms,
        success: log.success
      })
    
    console.log('✅ [LOG] Execution logged')
  } catch (error) {
    console.error('⚠️ [LOG] Failed to log execution:', error)
  }
}
