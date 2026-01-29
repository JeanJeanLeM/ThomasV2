import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * ROUTER: Architecture Pipeline vs Legacy
 * 
 * - use_pipeline=true (default) : Utilise nouvelle architecture séquencée
 * - use_pipeline=false : Utilise ancienne architecture (fallback)
 */
const USE_PIPELINE_BY_DEFAULT = true

// Fonction pour convertir les dates relatives en format ISO
function convertRelativeDateToISO(dateStr: string): string {
  const today = new Date()
  const todayISO = today.toISOString().split('T')[0]
  
  if (!dateStr || typeof dateStr !== 'string') {
    return todayISO
  }
  
  const lowerDate = dateStr.toLowerCase().trim()
  
  // Si c'est déjà au format ISO (YYYY-MM-DD), on le garde
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Conversion des termes relatifs
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
      // Pour les autres cas (lundi dernier, etc.), on utilise aujourd'hui par défaut
      console.log(`⚠️ [DATE-CONVERSION] Date relative non reconnue: "${dateStr}" → utilisation d'aujourd'hui`)
      return todayISO
  }
}

/**
 * Normalise un mot français (pluriel → singulier, accents, casse)
 * @param word Mot à normaliser
 * @returns Mot normalisé (singulier de préférence)
 */
function normalizeFrenchWord(word: string): string {
  if (!word) return '';
  
  const lower = word.toLowerCase().trim();
  
  // Dictionnaire de normalisations spécifiques (pluriel → singulier)
  const normalizations: Record<string, string> = {
    // Contenants
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
    
    // Cultures communes
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
    'radis': 'radis', // Invariant
  };
  
  // Si dans le dictionnaire, retourner la forme normalisée
  if (normalizations[lower]) {
    return normalizations[lower];
  }
  
  // Règles générales pour les pluriels français
  // Pluriel en -s (le plus commun)
  if (lower.endsWith('s') && lower.length > 1) {
    const singular = lower.slice(0, -1);
    // Vérifier que ce n'est pas un mot qui se termine naturellement par 's'
    const wordsEndingInS = ['radis', 'frais', 'gris', 'bras', 'tas'];
    if (!wordsEndingInS.includes(lower)) {
      return singular;
    }
  }
  
  // Pluriel en -x (choux, hiboux, etc.)
  if (lower.endsWith('x') && lower.length > 1) {
    // Vérifier quelques cas connus
    if (lower === 'choux') return 'chou';
    if (lower === 'hiboux') return 'hibou';
  }
  
  // Retourner le mot tel quel si pas de normalisation
  return lower;
}

/**
 * Match flexible entre deux termes (gère pluriels, variations)
 * @param term1 Premier terme
 * @param term2 Deuxième terme
 * @returns true si les termes matchent après normalisation
 */
function matchConversionFlexible(term1: string, term2: string): boolean {
  if (!term1 || !term2) return false;
  
  const norm1 = normalizeFrenchWord(term1);
  const norm2 = normalizeFrenchWord(term2);
  
  // Match exact après normalisation
  if (norm1 === norm2) return true;
  
  // Match partiel (un terme contient l'autre)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Vérifier que la différence n'est pas trop grande (éviter faux positifs)
    const minLength = Math.min(norm1.length, norm2.length);
    const maxLength = Math.max(norm1.length, norm2.length);
    if (maxLength <= minLength * 1.5) { // Pas plus de 50% de différence
      return true;
    }
  }
  
  // Similarité simple (pour erreurs de frappe légères)
  const similarity = calculateStringSimilarity(norm1, norm2);
  if (similarity >= 0.85) { // 85% de similarité minimum
    return true;
  }
  
  return false;
}

// Fonction pour appliquer les conversions utilisateur
function applyUserConversions(extractedData: any, conversions: any[]): any {
  if (!extractedData.quantity || !conversions.length) {
    return extractedData
  }
  
  const quantityUnit = extractedData.quantity.unit.toLowerCase()
  const crop = extractedData.crop?.toLowerCase()
  
  console.log(`🔍 [CONVERSION] Recherche pour: ${extractedData.quantity.value} ${quantityUnit} (culture: ${crop || 'non spécifiée'})`)
  
  // 1. Recherche exacte (container_name + crop)
  let matchedConversion = conversions.find(c => 
    c.container_name.toLowerCase() === quantityUnit &&
    (!crop || !c.crop_name || c.crop_name.toLowerCase() === crop)
  )
  
  // 2. Recherche par slugs/aliases
  if (!matchedConversion) {
    matchedConversion = conversions.find(c => 
      c.slugs?.some((slug: string) => slug.toLowerCase() === quantityUnit) &&
      (!crop || !c.crop_name || c.crop_name.toLowerCase() === crop)
    )
  }
  
  // 3. Recherche flexible avec normalisation (pluriels/singuliers, variations)
  if (!matchedConversion && crop) {
    matchedConversion = conversions.find(c => 
      matchConversionFlexible(quantityUnit, c.container_name) &&
      matchConversionFlexible(crop, c.crop_name || '')
    )
    if (matchedConversion) {
      console.log(`✅ [CONVERSION] Match flexible trouvé: ${quantityUnit} → ${matchedConversion.container_name}, ${crop} → ${matchedConversion.crop_name}`)
    }
  }
  
  // 4. Recherche partielle avec normalisation
  if (!matchedConversion) {
    matchedConversion = conversions.find(c => {
      const containerMatch = matchConversionFlexible(quantityUnit, c.container_name) ||
        (c.container_name.toLowerCase().includes(quantityUnit) || 
         quantityUnit.includes(c.container_name.toLowerCase()))
      const cropMatch = !crop || !c.crop_name || matchConversionFlexible(crop, c.crop_name)
      return containerMatch && cropMatch
    })
  }
  
  // 5. Recherche générale (sans culture spécifique) avec normalisation
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
    console.log(`   Conversions disponibles: ${conversions.map(c => `${c.container_name}${c.crop_name ? ` (${c.crop_name})` : ''}`).join(', ')}`)
  }
  
  return extractedData
}

interface AnalyzeMessageRequest {
  message_id: string
  user_message: string
  chat_session_id: string
}

interface UserContext {
  user_id: string
  plots: Array<{id: number, name: string, aliases: string[], llm_keywords: string[], is_active: boolean}>
  surface_units: Array<{id: number, name: string, plot_name: string}>
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
  preferences: {
    auto_validate_threshold: number
    preferred_units: Record<string, string>
    default_plot_ids: number[]
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`🔍 [DEBUG] === DÉBUT ANALYSE ===`)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    const { 
      message_id, 
      user_message, 
      chat_session_id,
      use_pipeline = USE_PIPELINE_BY_DEFAULT 
    } = requestBody

    console.log(`🤖 [ANALYZE] Démarrage analyse - Message ID: ${message_id}`)
    console.log(`🔍 [ANALYZE] Session ID: ${chat_session_id}`)
    console.log(`📝 [ANALYZE] Message: ${user_message?.substring(0, 100)}...`)
    console.log(`🔀 [ROUTER] Architecture: ${use_pipeline ? 'PIPELINE (new)' : 'LEGACY (fallback)'}`)

    // ROUTER: Redirect to Pipeline architecture if enabled
    if (use_pipeline) {
      console.log('➡️ [ROUTER] Redirecting to thomas-agent-pipeline...')
      
      try {
        const pipelineUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/thomas-agent-pipeline`
        
        const pipelineResponse = await fetch(pipelineUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            message: user_message,
            session_id: chat_session_id,
            user_id: requestBody.user_id,
            farm_id: requestBody.farm_id,
            use_pipeline: true
          })
        })

        if (!pipelineResponse.ok) {
          console.error('❌ [ROUTER] Pipeline call failed, falling back to legacy...')
          // Continue with legacy below
        } else {
          console.log('✅ [ROUTER] Pipeline response received')
          const pipelineData = await pipelineResponse.json()
          
          return new Response(
            JSON.stringify(pipelineData),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } catch (pipelineError) {
        console.error('❌ [ROUTER] Pipeline error, falling back to legacy:', pipelineError)
        // Continue with legacy below
      }
    }

    // LEGACY ARCHITECTURE (fallback)
    console.log('🔄 [ROUTER] Using LEGACY architecture...')

    // Vérifier clé OpenAI avant tout
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    console.log(`🔑 [ANALYZE] OpenAI Key présente: ${openaiKey ? 'OUI (' + openaiKey.substring(0, 10) + '...)' : 'NON'}`)

    // 1. Obtenir l'utilisateur et la ferme depuis la session de chat
    console.log(`📡 [ANALYZE] Étape 1/6: Récupération session chat...`)
    const { data: chatSession, error: sessionError } = await supabaseClient
      .from('chat_sessions')
      .select('user_id, farm_id')
      .eq('id', chat_session_id)
      .single()

    if (sessionError) {
      console.error(`❌ [ANALYZE] Erreur session: ${JSON.stringify(sessionError)}`)
      throw new Error(`Session de chat introuvable: ${sessionError.message}`)
    }
    
    if (!chatSession) {
      console.error(`❌ [ANALYZE] Session null pour ID: ${chat_session_id}`)
      throw new Error('Session de chat introuvable')
    }

    const { user_id, farm_id } = chatSession
    console.log(`✅ [ANALYZE] Session trouvée - User: ${user_id}, Farm: ${farm_id}`)

    // 2. Construire le contexte utilisateur
    console.log(`📡 [ANALYZE] Étape 2/6: Construction contexte utilisateur...`)
    const userContext = await buildUserContext(supabaseClient, user_id, farm_id)
    console.log(`✅ [ANALYZE] Contexte construit - ${userContext.plots?.length || 0} parcelles, ${userContext.materials?.length || 0} matériaux`)

    // 3. Obtenir le prompt d'analyse
    console.log(`📡 [ANALYZE] Étape 3/6: Récupération prompt système...`)
    
    const { data: promptData, error: promptError } = await supabaseClient
      .from('chat_prompts')
      .select('*')
      .eq('name', 'thomas_agent_system')
      .eq('is_active', true)
      .limit(1)
    
    if (promptError || !promptData || promptData.length === 0) {
      throw new Error(`Prompt d'analyse introuvable`)
    }
    
    const prompt = promptData[0]
    console.log(`✅ [ANALYZE] Prompt trouvé: ${prompt.name} (v${prompt.version})`)
    console.log(`📋 [ANALYZE] Prompt ID: ${prompt.id}`)
    console.log(`📊 [ANALYZE] Prompt longueur: ${prompt.content.length} caractères`)

    // 4. Construire et exécuter la requête OpenAI
    console.log(`📡 [ANALYZE] Étape 4/6: Appel OpenAI GPT-4o-mini...`)
    const startTime = Date.now()
    
    const analysisResult = await analyzeWithOpenAI(prompt, user_message, userContext)
    console.log(`✅ [ANALYZE] OpenAI répondu en ${Date.now() - startTime}ms`)
    
    const processingTime = Date.now() - startTime

    // 5. Sauvegarder l'analyse
    console.log(`📡 [ANALYZE] Étape 5/6: Sauvegarde analyse en DB...`)
    const { data: analysis, error: analysisError } = await supabaseClient
      .from('chat_message_analyses')
      .insert({
        session_id: chat_session_id,
        message_id,
        user_message,
        analysis_result: {
          ...analysisResult.parsed,
          _meta: {
            prompt_id: prompt.id,
            prompt_version: prompt.version,
            prompt_name: prompt.name
          }
        },
        confidence_score: analysisResult.confidence,
        processing_time_ms: processingTime,
        model_used: 'gpt-4o-mini'
      })
      .select()
      .single()

    if (analysisError) {
      console.error(`❌ [ANALYZE] Erreur sauvegarde analyse: ${JSON.stringify(analysisError)}`)
      throw analysisError
    }
    
    console.log(`✅ [ANALYZE] Analyse sauvegardée - ID: ${analysis.id}`)

    // 6. Créer les actions analysées
    console.log(`📡 [ANALYZE] Étape 6/6: Création actions analysées...`)
    const analyzedActions = []
    const actions = analysisResult.parsed?.actions || []
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      console.log(`   🔄 Action ${i + 1}/${actions.length}: ${action.action_type}`)
      
      // Contextualiser l'action avec les données de l'exploitation
      console.log(`\n🔍 [DEBUG] ====== AVANT CONTEXTUALISATION ACTION ${i + 1} ======`)
      console.log(`   Type: ${action.action_type}`)
      console.log(`   Texte: "${action.decomposed_text || action.original_text}"`)
      console.log(`   Données extraites:`, JSON.stringify(action.extracted_data, null, 2))
      
      const contextualizedAction = await contextualizeAction(supabaseClient, action, userContext, farm_id)
      
      console.log(`\n✅ [DEBUG] ====== APRÈS CONTEXTUALISATION ACTION ${i + 1} ======`)
      console.log(`   Context retourné:`, JSON.stringify(contextualizedAction.context, null, 2))
      console.log(`   Extracted data retourné:`, JSON.stringify(contextualizedAction.extracted_data, null, 2))
      
      const { data: analyzedAction, error: actionError } = await supabaseClient
        .from('chat_analyzed_actions')
        .insert({
          analysis_id: analysis.id,
          action_type: action.action_type || 'observation',
          action_data: {
            original_text: action.original_text,
            decomposed_text: await decomposeAction(action),
            context: contextualizedAction.context,
            extracted_data: contextualizedAction.extracted_data
          },
          matched_entities: contextualizedAction.context,
          confidence_score: action.confidence || 0.8,
          status: 'pending'
        })
        .select()
        .single()

      if (actionError) {
        console.error(`   ❌ Erreur action ${i + 1}: ${JSON.stringify(actionError)}`)
      } else {
        console.log(`   ✅ Action ${i + 1} créée - ID: ${analyzedAction.id}`)
        analyzedActions.push(analyzedAction)
      }
    }
    
    console.log(`✅ [ANALYZE] ${analyzedActions.length}/${actions.length} actions créées`)

    // Transformer les actions pour le frontend
    const actionsForFrontend = analyzedActions.map((dbAction: any) => {
      const action = {
        id: dbAction.id,
        action_type: dbAction.action_type,
        confidence_score: dbAction.confidence_score,
        status: dbAction.status,
        original_text: dbAction.action_data?.original_text || '',
        decomposed_text: dbAction.action_data?.decomposed_text || dbAction.action_data?.original_text || '',
        extracted_data: dbAction.action_data?.extracted_data || {},
        matched_entities: dbAction.matched_entities || dbAction.action_data?.context || {},
        action_data: dbAction.action_data,
        created_at: dbAction.created_at
      }
      
      // Validation finale des dates
      if (action.extracted_data && action.extracted_data.date) {
        const originalDate = action.extracted_data.date
        const validDate = convertRelativeDateToISO(originalDate)
        if (originalDate !== validDate) {
          console.log(`🔄 [FINAL-DATE-FIX] Action ${action.id}: "${originalDate}" → "${validDate}"`)
          action.extracted_data.date = validDate
          if (action.action_data?.extracted_data) {
            action.action_data.extracted_data.date = validDate
          }
        }
      }
      
      return action
    })

    console.log(`🎉 [ANALYZE] ANALYSE TERMINÉE AVEC SUCCÈS !`)

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: analysis.id,
        actions: actionsForFrontend,
        confidence: analysisResult.confidence,
        processing_time_ms: Date.now() - startTime,
        message: `Analyse terminée avec ${actionsForFrontend.length} action(s) détectée(s)`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error(`❌ [ANALYZE] ERREUR FATALE: ${error.message}`)
    console.error(`❌ [ANALYZE] Stack: ${error.stack}`)
    
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

/**
 * Construire le contexte utilisateur pour l'IA
 */
async function buildUserContext(supabase: any, userId: string, farmId: number): Promise<UserContext> {
  // Parcelles et planches
  const { data: plots } = await supabase
    .from('plots')
    .select('id, name, aliases, llm_keywords')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const { data: surfaceUnits } = await supabase
    .from('surface_units')
    .select(`
      id, name, 
      plots!inner(name)
    `)
    .eq('plots.farm_id', farmId)
    .eq('is_active', true)

  // Matériel (avec llm_keywords pour matching sophistiqué)
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, category, llm_keywords, is_active')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  // Conversions personnalisées (partagées au niveau de la ferme)
  const { data: conversions } = await supabase
    .from('user_conversion_units')
    .select('id, container_name, crop_name, conversion_value, conversion_unit, slugs, description, is_active')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  // Préférences utilisateur
  const { data: preferences } = await supabase
    .from('user_ai_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  return {
    user_id: userId,
    plots: plots || [],
    surface_units: (surfaceUnits || []).map((su: any) => ({
      id: su.id,
      name: su.name,
      plot_name: su.plots.name
    })),
    materials: materials || [],
    conversions: conversions || [],
    preferences: preferences || {
      auto_validate_threshold: 0.85,
      preferred_units: { weight: 'kg', volume: 'litres', area: 'm2' },
      default_plot_ids: []
    }
  }
}

/**
 * Analyser le message avec OpenAI GPT-4 mini
 */
async function analyzeWithOpenAI(prompt: any, userMessage: string, context: UserContext) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('Clé API OpenAI non configurée')
  }

  // Construire le prompt avec le contexte (incluant le contexte temporel)
  const today = new Date()
  const currentDate = today.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const currentTime = today.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  const contextString = `
Contexte de l'exploitation:
- Parcelles: ${context.plots.map(p => `${p.name} (${p.aliases?.join(', ') || 'aucun alias'})`).join(', ') || 'Aucune parcelle'}
- Planches: ${context.surface_units.map(su => `${su.name} (${su.plot_name})`).join(', ') || 'Aucune planche'}
- Matériel: ${context.materials.map(m => `${m.name} (${m.category})`).join(', ') || 'Aucun matériel'}
- Conversions: ${context.conversions.map(c => `${c.container_name} → ${c.conversion_value} ${c.conversion_unit}${c.crop_name ? ` (${c.crop_name})` : ''}`).join(', ') || 'Conversions par défaut'}

Contexte temporel:
- Date actuelle: ${currentDate}
- Heure actuelle: ${currentTime}
- Date ISO: ${today.toISOString().split('T')[0]}

IMPORTANT: Utilise TOUJOURS la date actuelle comme référence pour interpréter les expressions temporelles:
- "hier" = ${new Date(today.getTime() - 24*60*60*1000).toISOString().split('T')[0]}
- "aujourd'hui" = ${today.toISOString().split('T')[0]}
- "demain" = ${new Date(today.getTime() + 24*60*60*1000).toISOString().split('T')[0]}
- Pour toute action sans date explicite, utilise la date actuelle: ${today.toISOString().split('T')[0]}
`

  const promptContent = prompt.content || prompt.template
  if (!promptContent) {
    throw new Error('Prompt sans contenu valide')
  }

  let systemPrompt = promptContent
    .replace('{{farm_context}}', contextString)
    .replace('{user_context}', contextString)
    .replace('{{user_message}}', userMessage)

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage || 'Message vide' }
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.1,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const rawResponse = data.choices[0].message.content

  console.log(`📊 [OPENAI] Tokens utilisés: ${data.usage?.total_tokens || 0}`)
  console.log(`📝 [OPENAI] Longueur réponse: ${rawResponse.length} caractères`)
  console.log(`📄 [OPENAI] Réponse brute (premiers 1000 chars):`)
  console.log(rawResponse.substring(0, 1000))

  // Parsing JSON
  let parsedResponse: any = null
  
  try {
    parsedResponse = JSON.parse(rawResponse)
    console.log(`✅ [OPENAI] JSON parsé directement`)
  } catch (e) {
    console.log(`⚠️ [OPENAI] Échec parsing direct, tentative extraction...`)
    // Tentative d'extraction JSON
    let jsonString = rawResponse
    
    if (jsonString.includes('```json')) {
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    }
    
    const firstBrace = jsonString.indexOf('{')
    const lastBrace = jsonString.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1)
      try {
        parsedResponse = JSON.parse(jsonString)
        console.log(`✅ [OPENAI] JSON extrait avec succès`)
      } catch (e2) {
        console.error(`❌ [OPENAI] Impossible d'extraire le JSON`)
        console.error(`📄 [OPENAI] String JSON tentée:`, jsonString.substring(0, 500))
      }
    }
  }

  console.log(`🔍 [OPENAI] parsedResponse existe: ${!!parsedResponse}`)
  console.log(`🔍 [OPENAI] parsedResponse.actions existe: ${!!(parsedResponse?.actions)}`)
  
  // Adapter le format : si parsedResponse est une action directe, la wrapper dans un array
  if (parsedResponse) {
    let actions = []
    
    // Cas 1: Format avec array d'actions (format attendu)
    if (parsedResponse.actions && Array.isArray(parsedResponse.actions)) {
      actions = parsedResponse.actions
      console.log(`✅ [OPENAI] Format standard détecté: ${actions.length} actions`)
    }
    // Cas 2: Une seule action directe (format alternatif)
    else if (parsedResponse.action_type) {
      actions = [parsedResponse]
      console.log(`✅ [OPENAI] Format action directe détecté, wrapper en array`)
      // Reconstruire parsedResponse avec le format standard
      parsedResponse = {
        actions: actions,
        response: "Action identifiée avec succès"
      }
    }
    
    if (actions.length > 0) {
      console.log(`📋 [OPENAI] === DÉTAIL DES ACTIONS EXTRAITES PAR LE LLM ===`)
      actions.forEach((action: any, index: number) => {
        console.log(`\n🎯 [OPENAI] Action ${index + 1}/${actions.length}:`)
        console.log(`   - Type: ${action.action_type}`)
        console.log(`   - Confiance: ${action.confidence || 0.8}`)
        console.log(`   - Texte décomposé: "${action.decomposed_text}"`)
        console.log(`   - Extracted data complet:`, JSON.stringify(action.extracted_data, null, 2))
        
        // Logs spécifiques pour les champs clés du matching
        if (action.extracted_data) {
          console.log(`\n   🔍 [OPENAI] Champs clés pour matching:`)
          console.log(`      - plots: ${JSON.stringify(action.extracted_data.plots || 'NON EXTRAIT')}`)
          console.log(`      - materials: ${JSON.stringify(action.extracted_data.materials || 'NON EXTRAIT')}`)
          console.log(`      - surface_distribution: ${JSON.stringify(action.extracted_data.surface_distribution || 'NON EXTRAIT')}`)
          console.log(`      - quantity_type: ${action.extracted_data.quantity_type || 'NON EXTRAIT'}`)
          console.log(`      - quantity_nature: ${action.extracted_data.quantity_nature || 'NON EXTRAIT'}`)
        }
      })
      console.log(`\n📋 [OPENAI] === FIN DÉTAIL ACTIONS ===\n`)
      
      const avgConfidence = actions.reduce((sum: number, action: any) => sum + (action.confidence || 0.8), 0) / actions.length

      return {
        raw: data,
        parsed: parsedResponse,
        confidence: avgConfidence,
        tokens: data.usage?.total_tokens || 0
      }
    }
  }

  // Fallback
  console.log(`⚠️ [OPENAI] FALLBACK ACTIVÉ - Retour par défaut "help" avec 50% confiance`)
  console.log(`📄 [OPENAI] Raison: parsedResponse ou parsedResponse.actions manquant`)
  
  const fallbackAction = {
    action_type: 'help',
    original_text: userMessage,
    decomposed_text: userMessage,
    confidence: 0.5,
    extracted_data: {}
  }

  return {
    raw: data,
    parsed: { 
      actions: [fallbackAction],
      intent: 'help',
      response: rawResponse || 'J\'ai analysé votre message.',
    },
    confidence: 0.5,
    tokens: data.usage?.total_tokens || 0
  }
}

/**
 * Matching sophistiqué des parcelles avec multi-niveaux
 * Inspiré de PlotMatchingService client-side
 */
async function matchPlots(mentions: string[], context: UserContext, supabase: any) {
  console.log(`\n🎯 [MATCH-PLOTS] ========================================`)
  console.log(`🎯 [MATCH-PLOTS] Début matching parcelles`)
  console.log(`🎯 [MATCH-PLOTS] ========================================`)
  console.log(`🎯 [MATCH-PLOTS] Nombre de mentions: ${mentions.length}`)
  console.log(`🎯 [MATCH-PLOTS] Mentions reçues:`, JSON.stringify(mentions))
  console.log(`🎯 [MATCH-PLOTS] Contexte parcelles disponibles: ${context.plots?.length || 0}`)
  if (context.plots && context.plots.length > 0) {
    console.log(`🎯 [MATCH-PLOTS] Liste des parcelles:`, context.plots.map(p => p.name).join(', '))
  }
  console.log(`🎯 [MATCH-PLOTS] Contexte surface units disponibles: ${context.surface_units?.length || 0}`)
  if (context.surface_units && context.surface_units.length > 0) {
    console.log(`🎯 [MATCH-PLOTS] Liste des surface units:`, context.surface_units.map(su => `${su.name} (${su.plot_name})`).join(', '))
  }
  
  const results = {
    plot_ids: [],
    surface_unit_ids: [],
    matched_plots: [],
    matched_surface_units: []
  }
  
  if (!mentions || mentions.length === 0) {
    console.log(`⚠️ [MATCH-PLOTS] Aucune mention à traiter, retour résultat vide`)
    return results
  }
  
  for (const mention of mentions) {
    const mentionLower = mention.toLowerCase().trim()
    console.log(`🔍 [MATCH-PLOTS] Traitement mention: "${mention}"`)
    
    let bestMatch = null
    let bestConfidence = 0
    let matchType = 'none'
    
    // Détecter si c'est une mention de surface unit (planche, rang, ligne)
    const isSurfaceUnit = /\b(planche|rang|ligne|bande)\b/i.test(mention)
    
    for (const plot of context.plots) {
      // Niveau 1: Match exact
      if (plot.name.toLowerCase() === mentionLower) {
        bestMatch = plot
        bestConfidence = 1.0
        matchType = 'exact'
        break
      }
      
      // Niveau 2: Match partiel (contains)
      if (plot.name.toLowerCase().includes(mentionLower) || 
          mentionLower.includes(plot.name.toLowerCase())) {
        if (0.9 > bestConfidence) {
          bestMatch = plot
          bestConfidence = 0.9
          matchType = 'partial'
        }
      }
      
      // Niveau 3: Match aliases
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
      
      // Niveau 4: Match LLM keywords
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
      
      // Niveau 5: Fuzzy match (similarité simple)
      const similarity = calculateStringSimilarity(mentionLower, plot.name.toLowerCase())
      if (similarity >= 0.7 && similarity > bestConfidence) {
        bestMatch = plot
        bestConfidence = similarity
        matchType = 'fuzzy'
      }
    }
    
    if (bestMatch) {
      console.log(`✅ [MATCH-PLOTS] Match trouvé: ${bestMatch.name} (${matchType}, confiance: ${bestConfidence.toFixed(2)})`)
      
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
      
      // Si mention de surface unit, chercher dans les planches de cette parcelle
      if (isSurfaceUnit) {
        const surfaceUnits = context.surface_units.filter(su => su.plot_name === bestMatch.name)
        
        for (const su of surfaceUnits) {
          // Match simple sur le nom de la surface unit
          if (su.name.toLowerCase().includes(mentionLower) || 
              mentionLower.includes(su.name.toLowerCase())) {
            if (!results.surface_unit_ids.includes(su.id)) {
              results.surface_unit_ids.push(su.id)
              results.matched_surface_units.push({
                original: mention,
                matched: su.name,
                id: su.id,
                plot_name: su.plot_name,
                confidence: 0.85
              })
              console.log(`✅ [MATCH-PLOTS] Surface unit trouvée: ${su.name} dans ${su.plot_name}`)
            }
          }
        }
      }
    } else {
      console.log(`❌ [MATCH-PLOTS] Aucun match pour: "${mention}"`)
    }
  }
  
  console.log(`\n📊 [MATCH-PLOTS] ========================================`)
  console.log(`📊 [MATCH-PLOTS] Résultat final matching parcelles`)
  console.log(`📊 [MATCH-PLOTS] ========================================`)
  console.log(`📊 [MATCH-PLOTS] Parcelles matchées: ${results.plot_ids.length}`)
  console.log(`📊 [MATCH-PLOTS] Surface units matchées: ${results.surface_unit_ids.length}`)
  console.log(`📊 [MATCH-PLOTS] Détails:`, JSON.stringify(results, null, 2))
  return results
}

/**
 * Calcul de similarité entre deux chaînes (algorithme simple pour Edge Function)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  if (str1.length === 0 || str2.length === 0) return 0.0
  
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  // Si la chaîne courte est contenue dans la longue
  if (longer.includes(shorter)) {
    return shorter.length / longer.length
  }
  
  // Calcul de similarité par caractères communs
  let matches = 0
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      matches++
    }
  }
  
  return matches / Math.max(str1.length, str2.length)
}

/**
 * Matching sophistiqué des matériels avec multi-niveaux
 * Inspiré de MaterialMatchingService client-side
 */
async function matchMaterials(mentions: string[], context: UserContext) {
  console.log(`\n🔧 [MATCH-MATERIALS] ========================================`)
  console.log(`🔧 [MATCH-MATERIALS] Début matching matériels`)
  console.log(`🔧 [MATCH-MATERIALS] ========================================`)
  console.log(`🔧 [MATCH-MATERIALS] Nombre de mentions: ${mentions.length}`)
  console.log(`🔧 [MATCH-MATERIALS] Mentions reçues:`, JSON.stringify(mentions))
  console.log(`🔧 [MATCH-MATERIALS] Contexte matériels disponibles: ${context.materials?.length || 0}`)
  if (context.materials && context.materials.length > 0) {
    console.log(`🔧 [MATCH-MATERIALS] Liste des matériels:`, context.materials.map(m => `${m.name} [${m.category}]`).join(', '))
  }
  
  const results = {
    material_ids: [],
    matched_materials: []
  }
  
  if (!mentions || mentions.length === 0) {
    console.log(`⚠️ [MATCH-MATERIALS] Aucune mention à traiter, retour résultat vide`)
    return results
  }
  
  // Synonymes français pour matériels agricoles
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
    const mentionLower = mention.toLowerCase().trim()
    console.log(`🔍 [MATCH-MATERIALS] Traitement mention: "${mention}"`)
    
    let bestMatch = null
    let bestConfidence = 0
    let matchType = 'none'
    
    for (const material of context.materials) {
      if (!material.is_active) continue
      
      const materialNameLower = material.name.toLowerCase()
      
      // Niveau 1: Match exact
      if (materialNameLower === mentionLower) {
        bestMatch = material
        bestConfidence = 1.0
        matchType = 'exact'
        break
      }
      
      // Niveau 2: Match partiel bidirectionnel
      if (materialNameLower.includes(mentionLower) || 
          mentionLower.includes(materialNameLower)) {
        if (0.9 > bestConfidence) {
          bestMatch = material
          bestConfidence = 0.9
          matchType = 'partial'
        }
      }
      
      // Niveau 3: Match LLM keywords
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
      
      // Niveau 4: Match par synonymes
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
      
      // Niveau 5: Match par catégorie (pour matériels non paramétrés)
      const category = detectMaterialCategory(mentionLower)
      if (category && material.category === category) {
        const similarity = calculateStringSimilarity(mentionLower, materialNameLower)
        if (similarity >= 0.6 && similarity > bestConfidence) {
          bestMatch = material
          bestConfidence = similarity
          matchType = 'category'
        }
      }
      
      // Niveau 6: Fuzzy match
      const similarity = calculateStringSimilarity(mentionLower, materialNameLower)
      if (similarity >= 0.7 && similarity > bestConfidence) {
        bestMatch = material
        bestConfidence = similarity
        matchType = 'fuzzy'
      }
    }
    
    if (bestMatch) {
      console.log(`✅ [MATCH-MATERIALS] Match trouvé: ${bestMatch.name} (${matchType}, confiance: ${bestConfidence.toFixed(2)})`)
      
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
    } else {
      console.log(`❌ [MATCH-MATERIALS] Aucun match pour: "${mention}"`)
    }
  }
  
  console.log(`\n📊 [MATCH-MATERIALS] ========================================`)
  console.log(`📊 [MATCH-MATERIALS] Résultat final matching matériels`)
  console.log(`📊 [MATCH-MATERIALS] ========================================`)
  console.log(`📊 [MATCH-MATERIALS] Matériels matchés: ${results.material_ids.length}`)
  console.log(`📊 [MATCH-MATERIALS] Détails:`, JSON.stringify(results, null, 2))
  return results
}

/**
 * Détecter la catégorie d'un matériel depuis sa mention
 */
function detectMaterialCategory(mention: string): string | null {
  const mentionLower = mention.toLowerCase()
  
  // Catégories avec mots-clés
  if (/tracteur|tractor|engin/.test(mentionLower)) return 'tracteurs'
  if (/charrue|cultivateur|herse|semoir|épandeur|faucheuse|pulvérisateur/.test(mentionLower)) return 'outils_tracteur'
  if (/bêche|râteau|serfouette|arrosoir|sécateur|transplantoir/.test(mentionLower)) return 'outils_manuels'
  if (/brouette|panier|caisse|seau|bâche|voile/.test(mentionLower)) return 'petit_equipement'
  
  return null
}

/**
 * Normaliser une chaîne pour le matching
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/[^\w\s]/g, ' ') // Remplacer ponctuation
    .replace(/\s+/g, ' ') // Normaliser espaces
    .trim()
}

/**
 * Matching sophistiqué des produits phytosanitaires
 * Inspiré de PhytosanitaryMatchingService client-side
 */
async function matchPhytosanitaryProduct(
  productName: string, 
  farmId: number, 
  userId: string, 
  supabase: any
): Promise<{ amm: string; name: string; confidence: number } | null> {
  
  if (!productName || !productName.trim()) {
    return null
  }
  
  console.log(`🌿 [MATCH-PHYTO] Matching produit phytosanitaire: "${productName}"`)
  
  try {
    // 1. Charger les produits de l'utilisateur
    const { data: preferences, error: prefsError } = await supabase
      .from('user_phytosanitary_preferences')
      .select('product_amms')
      .eq('farm_id', farmId)
      .eq('user_id', userId)
      .single()
    
    if (prefsError || !preferences?.product_amms?.length) {
      console.log(`⚠️ [MATCH-PHYTO] Aucun produit utilisateur trouvé`)
      return null
    }
    
    // 2. Charger les détails des produits
    const { data: products, error: productsError } = await supabase
      .from('phytosanitary_products')
      .select('amm, name')
      .in('amm', preferences.product_amms)
    
    if (productsError || !products || products.length === 0) {
      console.log(`⚠️ [MATCH-PHYTO] Erreur chargement produits`)
      return null
    }
    
    console.log(`📦 [MATCH-PHYTO] ${products.length} produits utilisateur chargés`)
    
    // 3. Normaliser le nom recherché
    const normalizedSearch = normalizeString(productName)
    
    let bestMatch = null
    let bestConfidence = 0
    let matchType = 'none'
    
    for (const product of products) {
      const normalizedProductName = normalizeString(product.name)
      
      // Niveau 1: Match exact
      if (normalizedProductName === normalizedSearch) {
        bestMatch = product
        bestConfidence = 1.0
        matchType = 'exact'
        break
      }
      
      // Niveau 2: Match partiel (contains bidirectionnel)
      if (normalizedProductName.includes(normalizedSearch) || 
          normalizedSearch.includes(normalizedProductName)) {
        if (0.9 > bestConfidence) {
          bestMatch = product
          bestConfidence = 0.9
          matchType = 'partial'
        }
      }
      
      // Niveau 3: Match par mots (si plusieurs mots dans le nom)
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
      
      // Niveau 4: Fuzzy match
      const similarity = calculateStringSimilarity(normalizedSearch, normalizedProductName)
      if (similarity >= 0.7 && similarity > bestConfidence) {
        bestMatch = product
        bestConfidence = similarity
        matchType = 'fuzzy'
      }
    }
    
    if (bestMatch && bestConfidence >= 0.7) {
      console.log(`✅ [MATCH-PHYTO] Match trouvé: ${bestMatch.name} (${matchType}, confiance: ${bestConfidence.toFixed(2)})`)
      return {
        amm: bestMatch.amm,
        name: bestMatch.name,
        confidence: bestConfidence
      }
    }
    
    console.log(`❌ [MATCH-PHYTO] Aucun match pour: "${productName}"`)
    return null
    
  } catch (error) {
    console.error(`❌ [MATCH-PHYTO] Erreur:`, error)
    return null
  }
}

/**
 * Contextualiser une action avec les données de l'exploitation
 */
async function contextualizeAction(supabase: any, action: any, context: UserContext, farmId: number) {
  console.log(`\n🔍 [CONTEXT] ========================================`)
  console.log(`🔍 [CONTEXT] === DÉBUT CONTEXTUALISATION ACTION ===`)
  console.log(`🔍 [CONTEXT] ========================================`)
  console.log(`🔍 [CONTEXT] Action type: ${action.action_type}`)
  console.log(`🔍 [CONTEXT] Decomposed text: "${action.decomposed_text}"`)
  
  try {
    const contextData: any = {}
    const extractedData = { ...action.extracted_data }

    console.log(`\n📦 [CONTEXT] Données extraites complètes:`, JSON.stringify(extractedData, null, 2))
    console.log(`\n🔍 [CONTEXT] Vérification champs pour matching:`)
    console.log(`   - extractedData.plots présent: ${!!extractedData.plots}`)
    console.log(`   - extractedData.plots valeur: ${JSON.stringify(extractedData.plots)}`)
    console.log(`   - extractedData.materials présent: ${!!extractedData.materials}`)
    console.log(`   - extractedData.materials valeur: ${JSON.stringify(extractedData.materials)}`)
    console.log(`   - extractedData.quantity_type: ${extractedData.quantity_type || 'NON DÉFINI'}`)
    console.log(`   - extractedData.quantity_nature: ${extractedData.quantity_nature || 'NON DÉFINI'}`)

    // Matching sophistiqué des parcelles/planches (UNIFIED)
    console.log(`\n🔍 [CONTEXT] Test condition matching parcelles:`)
    console.log(`   - extractedData.plots existe: ${!!extractedData.plots}`)
    console.log(`   - extractedData.plots valeur: ${JSON.stringify(extractedData.plots)}`)
    
    if (extractedData.plots) {
      console.log(`✅ [CONTEXT] Condition parcelles validée, lancement matchPlots...`)
      const plotMentions = Array.isArray(extractedData.plots) ? extractedData.plots : [extractedData.plots]
      console.log(`   Mentions transformées en array: ${JSON.stringify(plotMentions)}`)
      
      const plotMatches = await matchPlots(plotMentions, context, supabase)
      console.log(`   Résultat matchPlots:`, JSON.stringify(plotMatches, null, 2))
      
      Object.assign(contextData, plotMatches)
    } else {
      console.log(`⚠️ [CONTEXT] extractedData.plots absent ou vide, skip matching parcelles`)
    }

    // Matching sophistiqué des matériels (UNIFIED)
    console.log(`\n🔍 [CONTEXT] Test condition matching matériels:`)
    console.log(`   - extractedData.materials existe: ${!!extractedData.materials}`)
    console.log(`   - extractedData.materials est array: ${Array.isArray(extractedData.materials)}`)
    console.log(`   - extractedData.materials valeur: ${JSON.stringify(extractedData.materials)}`)
    
    if (extractedData.materials && Array.isArray(extractedData.materials)) {
      console.log(`✅ [CONTEXT] Condition matériels validée, lancement matchMaterials...`)
      const materialMatches = await matchMaterials(extractedData.materials, context)
      console.log(`   Résultat matchMaterials:`, JSON.stringify(materialMatches, null, 2))
      
      Object.assign(contextData, materialMatches)
    } else {
      console.log(`⚠️ [CONTEXT] extractedData.materials absent, vide ou pas un array, skip matching matériels`)
    }
    
    // Matching sophistiqué des produits phytosanitaires (NOUVEAU)
    console.log(`\n🔍 [CONTEXT] Test condition matching produits phyto:`)
    console.log(`   - extractedData.quantity_type: ${extractedData.quantity_type || 'NON DÉFINI'}`)
    console.log(`   - extractedData.quantity_nature: ${extractedData.quantity_nature || 'NON DÉFINI'}`)
    
    if (extractedData.quantity_type === 'produit_phyto' && extractedData.quantity_nature) {
      console.log(`✅ [CONTEXT] Condition produit phyto validée`)
      console.log(`🌿 [CONTEXT] Lancement matchPhytosanitaryProduct pour: "${extractedData.quantity_nature}"`)
      
      const productMatch = await matchPhytosanitaryProduct(
        extractedData.quantity_nature,
        farmId,
        context.user_id,
        supabase
      )
      
      if (productMatch) {
        console.log(`✅ [CONTEXT] Produit phyto matché: ${productMatch.name} (AMM: ${productMatch.amm})`)
        contextData.phytosanitary_product_amm = productMatch.amm
        contextData.phytosanitary_product_name = productMatch.name
        // Mettre à jour quantity_nature avec le nom exact du produit
        extractedData.quantity_nature = productMatch.name
      } else {
        console.log(`⚠️ [CONTEXT] Aucun produit phyto matché`)
      }
    } else {
      console.log(`⚠️ [CONTEXT] Conditions produit phyto non remplies, skip matching`)
    }

    // Conversion des quantités utilisateur
    const finalExtractedData = applyUserConversions(extractedData, context.conversions)

    // Log récapitulatif du matching avec confiance
    console.log(`✅ [CONTEXT] Contextualisation terminée - Résumé matching:`)
    console.log(`   📍 Parcelles: ${contextData.plot_ids?.length || 0} matchées`)
    if (contextData.matched_plots?.length > 0) {
      contextData.matched_plots.forEach(p => {
        console.log(`      - "${p.original}" → ${p.matched} (${p.match_type}, ${(p.confidence * 100).toFixed(0)}%)`)
      })
    }
    console.log(`   📐 Surface units: ${contextData.surface_unit_ids?.length || 0} matchées`)
    if (contextData.matched_surface_units?.length > 0) {
      contextData.matched_surface_units.forEach(su => {
        console.log(`      - "${su.original}" → ${su.matched} dans ${su.plot_name} (${(su.confidence * 100).toFixed(0)}%)`)
      })
    }
    console.log(`   🔧 Matériels: ${contextData.material_ids?.length || 0} matchés`)
    if (contextData.matched_materials?.length > 0) {
      contextData.matched_materials.forEach(m => {
        console.log(`      - "${m.original}" → ${m.matched} [${m.category}] (${m.match_type}, ${(m.confidence * 100).toFixed(0)}%)`)
      })
    }
    if (contextData.phytosanitary_product_amm) {
      console.log(`   🌿 Produit phyto: ${contextData.phytosanitary_product_name} (AMM: ${contextData.phytosanitary_product_amm})`)
    }
    console.log(`   📊 Conversions: ${finalExtractedData.quantity_converted ? 'Appliquée' : 'Aucune'}`)
    
    return {
      context: contextData,
      extracted_data: finalExtractedData
    }
  } catch (error) {
    console.error(`❌ [DEBUG-CONTEXT] ERREUR dans contextualizeAction:`, error.message)
    console.error(`❌ [DEBUG-CONTEXT] Stack:`, error.stack)
    throw error
  }
}

/**
 * Décomposer une action en phrase simple
 */
async function decomposeAction(action: any): Promise<string> {
  const { action_type, extracted_data } = action
  
  switch (action_type) {
    case 'observation':
      return `J'ai observé ${extracted_data.issue || 'quelque chose'} sur ${extracted_data.crop || 'mes cultures'}`
    
    case 'task_done':
      const quantity = extracted_data.quantity ? ` ${extracted_data.quantity.value} ${extracted_data.quantity.unit} de` : ''
      return `J'ai ${extracted_data.action || 'effectué une tâche sur'}${quantity} ${extracted_data.crop || 'mes cultures'}`
    
    case 'task_planned':
      return `Je prévois de ${extracted_data.action || 'effectuer une tâche sur'} ${extracted_data.crop || 'mes cultures'}`
    
    case 'harvest':
      const harvestQuantity = extracted_data.quantity ? ` ${extracted_data.quantity.value} ${extracted_data.quantity.unit} de` : ''
      return `J'ai récolté${harvestQuantity} ${extracted_data.crop || 'mes cultures'}`
    
    default:
      return action.original_text
  }
}