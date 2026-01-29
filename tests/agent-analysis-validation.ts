/**
 * Script de validation de l'analyse agent
 * 
 * Test 10 scénarios variés pour identifier les points faibles
 * 
 * Usage:
 *   npm install -g tsx
 *   tsx tests/agent-analysis-validation.ts
 */

import { createClient } from '@supabase/supabase-js'

// Configuration - Charger depuis config.ts (ou variables d'environnement)
let config: any
try {
  config = require('./config').TEST_CONFIG
} catch (e) {
  console.log('⚠️  Fichier config.ts non trouvé, utilisation des variables d\'environnement')
  config = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://kvwzbofifqqytyfertkh.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY',
    TEST_USER_ID: process.env.TEST_USER_ID || 'test-user-validation',
    TEST_FARM_ID: parseInt(process.env.TEST_FARM_ID || '1')
  }
}

const SUPABASE_URL = config.SUPABASE_URL
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY
const TEST_USER_ID = config.TEST_USER_ID
const TEST_FARM_ID = config.TEST_FARM_ID

interface TestCase {
  id: string
  name: string
  message: string
  expected: {
    action_count: number
    actions: Array<{
      type: 'observation' | 'task_done' | 'task_planned' | 'harvest' | 'help'
      crop?: string
      issue?: string
      quantity?: { value: number; unit: string }
      duration?: { value: number; unit: string }
    }>
  }
}

// 🧪 10 cas de test variés
const TEST_CASES: TestCase[] = [
  {
    id: 'test-01',
    name: 'Observation simple',
    message: "J'ai observé des pucerons sur les tomates",
    expected: {
      action_count: 1,
      actions: [
        { type: 'observation', crop: 'tomates', issue: 'pucerons' }
      ]
    }
  },
  {
    id: 'test-02',
    name: 'Récolte avec quantité',
    message: "J'ai récolté 10 kg de tomates",
    expected: {
      action_count: 1,
      actions: [
        { type: 'harvest', crop: 'tomates', quantity: { value: 10, unit: 'kg' } }
      ]
    }
  },
  {
    id: 'test-03',
    name: 'Tâche avec durée',
    message: "J'ai passé la herse pendant 2 heures",
    expected: {
      action_count: 1,
      actions: [
        { type: 'task_done', duration: { value: 120, unit: 'minutes' } }
      ]
    }
  },
  {
    id: 'test-04',
    name: 'Multi-actions (2)',
    message: "J'ai récolté des tomates pendant 30 minutes et j'ai observé des mineuses sur les concombres",
    expected: {
      action_count: 2,
      actions: [
        { type: 'task_done', crop: 'tomates', duration: { value: 30, unit: 'minutes' } },
        { type: 'observation', crop: 'concombres', issue: 'mineuses' }
      ]
    }
  },
  {
    id: 'test-05',
    name: 'Question aide',
    message: "Comment créer une nouvelle parcelle ?",
    expected: {
      action_count: 1,
      actions: [
        { type: 'help' }
      ]
    }
  },
  {
    id: 'test-06',
    name: 'Récolte sans quantité',
    message: "J'ai récolté des courgettes ce matin",
    expected: {
      action_count: 1,
      actions: [
        { type: 'task_done', crop: 'courgettes' }
      ]
    }
  },
  {
    id: 'test-07',
    name: 'Multi-actions (3)',
    message: "J'ai semé des radis, observé du mildiou sur les tomates, et récolté 5 kg de courgettes",
    expected: {
      action_count: 3,
      actions: [
        { type: 'task_done', crop: 'radis' },
        { type: 'observation', crop: 'tomates', issue: 'mildiou' },
        { type: 'harvest', crop: 'courgettes', quantity: { value: 5, unit: 'kg' } }
      ]
    }
  },
  {
    id: 'test-08',
    name: 'Action complexe avec outil',
    message: "J'ai traité les tomates contre les pucerons avec le pulvérisateur pendant 45 minutes",
    expected: {
      action_count: 1,
      actions: [
        { type: 'task_done', crop: 'tomates', duration: { value: 45, unit: 'minutes' } }
      ]
    }
  },
  {
    id: 'test-09',
    name: 'Observation sans culture spécifique',
    message: "J'ai observé des limaces dans la serre",
    expected: {
      action_count: 1,
      actions: [
        { type: 'observation', issue: 'limaces' }
      ]
    }
  },
  {
    id: 'test-10',
    name: 'Récolte avec unité non-standard',
    message: "J'ai récolté 3 caisses de tomates",
    expected: {
      action_count: 1,
      actions: [
        { type: 'harvest', crop: 'tomates', quantity: { value: 3, unit: 'caisses' } }
      ]
    }
  }
]

// Types pour les résultats
interface TestResult {
  test: TestCase
  success: boolean
  actual: any
  issues: string[]
  processing_time_ms: number
}

// Fonction principale
async function runValidationTests() {
  console.log('🧪 Démarrage des tests de validation de l\'analyse agent\n')
  console.log(`📊 Nombre de tests: ${TEST_CASES.length}`)
  console.log(`🌐 Environment: ${SUPABASE_URL}`)
  console.log(`👤 User ID: ${TEST_USER_ID}`)
  console.log(`🏭 Farm ID: ${TEST_FARM_ID}\n`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const results: TestResult[] = []

  // Exécuter chaque test
  for (const testCase of TEST_CASES) {
    console.log(`\n🔍 Test ${testCase.id}: ${testCase.name}`)
    console.log(`   Message: "${testCase.message}"`)

    const startTime = Date.now()

    try {
      // Appeler l'Edge Function
      const response = await supabase.functions.invoke('analyze-message', {
        body: {
          message: testCase.message,
          session_id: `test-session-${testCase.id}`,
          user_id: TEST_USER_ID,
          farm_id: TEST_FARM_ID
        }
      })

      const processingTime = Date.now() - startTime

      console.log(`   🔍 Response full:`, JSON.stringify(response, null, 2).substring(0, 500))

      const { data, error } = response

      if (error) {
        console.log(`   ❌ Erreur: ${error.message}`)
        console.log(`      Details: ${JSON.stringify(error, null, 2)}`)
        console.log(`      Data present: ${data ? 'YES' : 'NO'}`)
        if (data) {
          console.log(`      Data content: ${JSON.stringify(data, null, 2).substring(0, 300)}`)
        }
        results.push({
          test: testCase,
          success: false,
          actual: null,
          issues: [`Erreur API: ${error.message}`],
          processing_time_ms: processingTime
        })
        continue
      }

      // Afficher la réponse brute pour debug
      console.log(`   📦 Response data:`, JSON.stringify(data, null, 2).substring(0, 200))

      // Valider les résultats
      const issues = validateResult(testCase, data)
      const success = issues.length === 0

      if (success) {
        console.log(`   ✅ SUCCÈS (${processingTime}ms)`)
      } else {
        console.log(`   ❌ ÉCHEC (${processingTime}ms)`)
        issues.forEach(issue => console.log(`      • ${issue}`))
      }

      results.push({
        test: testCase,
        success,
        actual: data,
        issues,
        processing_time_ms: processingTime
      })

    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}`)
      results.push({
        test: testCase,
        success: false,
        actual: null,
        issues: [`Exception: ${error.message}`],
        processing_time_ms: Date.now() - startTime
      })
    }
  }

  // Générer le rapport
  generateReport(results)
}

// Validation des résultats
function validateResult(testCase: TestCase, actualData: any): string[] {
  const issues: string[] = []

  // Vérifier la structure de base
  if (!actualData.success) {
    issues.push('API a retourné success=false')
    return issues
  }

  if (!actualData.data || !actualData.data.actions) {
    issues.push('Pas de data.actions dans la réponse')
    return issues
  }

  const actualActions = actualData.data.actions

  // Vérifier le nombre d'actions
  if (actualActions.length !== testCase.expected.action_count) {
    issues.push(
      `Nombre d'actions incorrect: attendu ${testCase.expected.action_count}, reçu ${actualActions.length}`
    )
  }

  // Vérifier chaque action attendue
  testCase.expected.actions.forEach((expectedAction, index) => {
    if (index >= actualActions.length) {
      issues.push(`Action ${index + 1} manquante`)
      return
    }

    const actualAction = actualActions[index]

    // Vérifier le type
    if (actualAction.type !== expectedAction.type) {
      issues.push(
        `Action ${index + 1}: type incorrect (attendu: ${expectedAction.type}, reçu: ${actualAction.type})`
      )
    }

    // Vérifier la culture si attendue
    if (expectedAction.crop) {
      const actualCrop = actualAction.data?.crop || actualAction.data?.extracted_data?.crop
      if (!actualCrop || !actualCrop.toLowerCase().includes(expectedAction.crop.toLowerCase())) {
        issues.push(
          `Action ${index + 1}: culture incorrecte (attendu: ${expectedAction.crop}, reçu: ${actualCrop || 'N/A'})`
        )
      }
    }

    // Vérifier le problème si attendu
    if (expectedAction.issue) {
      const actualIssue = actualAction.data?.issue || actualAction.data?.extracted_data?.issue
      if (!actualIssue || !actualIssue.toLowerCase().includes(expectedAction.issue.toLowerCase())) {
        issues.push(
          `Action ${index + 1}: problème incorrect (attendu: ${expectedAction.issue}, reçu: ${actualIssue || 'N/A'})`
        )
      }
    }

    // Vérifier la quantité si attendue
    if (expectedAction.quantity) {
      const actualQty = actualAction.data?.quantity || actualAction.data?.extracted_data?.quantity
      if (!actualQty || actualQty.value !== expectedAction.quantity.value) {
        issues.push(
          `Action ${index + 1}: quantité incorrecte (attendu: ${expectedAction.quantity.value}${expectedAction.quantity.unit}, reçu: ${actualQty?.value || 'N/A'})`
        )
      }
    }

    // Vérifier la durée si attendue
    if (expectedAction.duration) {
      const actualDur = actualAction.data?.duration || actualAction.data?.extracted_data?.duration
      if (!actualDur || actualDur.value !== expectedAction.duration.value) {
        issues.push(
          `Action ${index + 1}: durée incorrecte (attendu: ${expectedAction.duration.value}${expectedAction.duration.unit}, reçu: ${actualDur?.value || 'N/A'})`
        )
      }
    }
  })

  return issues
}

// Génération du rapport
function generateReport(results: TestResult[]) {
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 RAPPORT DE VALIDATION')
  console.log('='.repeat(80) + '\n')

  const successCount = results.filter(r => r.success).length
  const totalCount = results.length
  const successRate = (successCount / totalCount * 100).toFixed(1)

  // Statistiques globales
  console.log(`✅ Succès: ${successCount}/${totalCount} (${successRate}%)`)
  console.log(`❌ Échecs: ${totalCount - successCount}/${totalCount}`)
  
  const avgTime = results.reduce((sum, r) => sum + r.processing_time_ms, 0) / results.length
  console.log(`⏱️  Temps moyen: ${avgTime.toFixed(0)}ms\n`)

  // Tests échoués
  const failures = results.filter(r => !r.success)
  if (failures.length > 0) {
    console.log('❌ TESTS ÉCHOUÉS:\n')
    failures.forEach(failure => {
      console.log(`  ${failure.test.id} - ${failure.test.name}`)
      console.log(`     Message: "${failure.test.message}"`)
      failure.issues.forEach(issue => {
        console.log(`     • ${issue}`)
      })
      console.log('')
    })
  }

  // Analyse des points faibles
  console.log('\n🔍 POINTS FAIBLES IDENTIFIÉS:\n')
  
  const issueTypes: Record<string, number> = {}
  results.forEach(r => {
    r.issues.forEach(issue => {
      const type = categorizeIssue(issue)
      issueTypes[type] = (issueTypes[type] || 0) + 1
    })
  })

  if (Object.keys(issueTypes).length === 0) {
    console.log('  ✅ Aucun point faible identifié - Système performant!\n')
  } else {
    Object.entries(issueTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  • ${type}: ${count} occurrence(s)`)
      })
    console.log('')
  }

  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:\n')
  if (successRate === '100.0') {
    console.log('  🎉 Excellent! Le système fonctionne parfaitement sur tous les cas de test.')
    console.log('  → Vous pouvez passer en production avec confiance.\n')
  } else if (parseFloat(successRate) >= 80) {
    console.log('  ✅ Bon! La plupart des cas fonctionnent.')
    console.log('  → Améliorer les prompts pour les cas échoués avant production.\n')
  } else if (parseFloat(successRate) >= 60) {
    console.log('  ⚠️  Moyen. Des améliorations sont nécessaires.')
    console.log('  → Ajuster les prompts et ajouter plus d\'exemples.\n')
  } else {
    console.log('  ❌ Insuffisant. Révision majeure nécessaire.')
    console.log('  → Revoir l\'architecture des prompts et les exemples.\n')
  }

  console.log('='.repeat(80) + '\n')
}

// Catégorisation des problèmes
function categorizeIssue(issue: string): string {
  if (issue.includes('Nombre d\'actions')) return 'Détection multi-actions'
  if (issue.includes('type incorrect')) return 'Classification intent'
  if (issue.includes('culture incorrecte')) return 'Extraction culture'
  if (issue.includes('problème incorrect')) return 'Extraction problème'
  if (issue.includes('quantité incorrecte')) return 'Extraction quantité'
  if (issue.includes('durée incorrecte')) return 'Extraction durée'
  if (issue.includes('Erreur API') || issue.includes('Exception')) return 'Erreur système'
  return 'Autre'
}

// Exécution
runValidationTests().catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})

