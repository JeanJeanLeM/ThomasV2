/**
 * Tests d'intégration End-to-End pour Pipeline Architecture
 * 
 * Valide le workflow complet:
 * 1. Router dans analyze-message
 * 2. Pipeline séquencé (5 étapes)
 * 3. Prompts v3.0
 * 4. Services matching
 * 5. Response synthesis
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'test-key'

// ============================================================================
// TEST 1: Router vers Pipeline Architecture
// ============================================================================

Deno.test("Router redirects to pipeline when use_pipeline=true", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message_id: 'test-msg-1',
      user_message: 'Test message',
      chat_session_id: 'test-session-1',
      user_id: 'test-user',
      farm_id: 1,
      use_pipeline: true  // Force pipeline
    })
  })

  assertEquals(response.ok, true)
  const data = await response.json()
  assertExists(data.metadata)
  assertEquals(data.metadata.agent_version, 'thomas_pipeline_v1.0')
})

// ============================================================================
// TEST 2: Pipeline - Message Observation
// ============================================================================

Deno.test("Pipeline classifies observation correctly", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/thomas-agent-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message: "J'ai observé des pucerons sur mes tomates dans la serre 1",
      session_id: 'test-session-2',
      user_id: 'test-user',
      farm_id: 1
    })
  })

  assertEquals(response.ok, true)
  const data = await response.json()
  
  assertExists(data.metadata)
  assertEquals(data.metadata.intent_detected, 'observation')
  assertExists(data.data.actions)
  assertEquals(data.data.actions.length > 0, true)
})

// ============================================================================
// TEST 3: Pipeline - Message Récolte
// ============================================================================

Deno.test("Pipeline handles harvest with quantity", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/thomas-agent-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message: "J'ai récolté 10 kg de tomates",
      session_id: 'test-session-3',
      user_id: 'test-user',
      farm_id: 1
    })
  })

  assertEquals(response.ok, true)
  const data = await response.json()
  
  assertEquals(data.metadata.intent_detected, 'harvest')
  assertExists(data.data.content)
})

// ============================================================================
// TEST 4: Pipeline - Message Aide
// ============================================================================

Deno.test("Pipeline detects help requests", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/thomas-agent-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message: "Comment créer une nouvelle parcelle ?",
      session_id: 'test-session-4',
      user_id: 'test-user',
      farm_id: 1
    })
  })

  assertEquals(response.ok, true)
  const data = await response.json()
  
  assertEquals(data.metadata.intent_detected, 'help')
})

// ============================================================================
// TEST 5: Legacy Fallback
// ============================================================================

Deno.test("Legacy architecture works when use_pipeline=false", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message_id: 'test-msg-2',
      user_message: "J'ai observé des pucerons",
      chat_session_id: 'test-session-5',
      use_pipeline: false  // Force legacy
    })
  })

  assertEquals(response.ok, true)
  const data = await response.json()
  assertExists(data)
})

// ============================================================================
// TEST 6: Pipeline Error Handling
// ============================================================================

Deno.test("Pipeline handles errors gracefully", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/thomas-agent-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      // Missing required fields
      message: "Test"
    })
  })

  assertEquals(response.status, 400)
  const data = await response.json()
  assertEquals(data.success, false)
  assertExists(data.error)
})

// ============================================================================
// TEST 7: Multi-Action Message
// ============================================================================

Deno.test("Pipeline handles multi-action messages", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/thomas-agent-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message: "J'ai observé des pucerons sur les tomates et récolté 5 kg de courgettes",
      session_id: 'test-session-6',
      user_id: 'test-user',
      farm_id: 1
    })
  })

  assertEquals(response.ok, true)
  const data = await response.json()
  
  // Should detect multiple actions
  assertExists(data.data.actions)
  // Note: Actual multi-action detection depends on LLM
})

// ============================================================================
// TEST 8: Performance Check
// ============================================================================

Deno.test("Pipeline completes within reasonable time", async () => {
  const startTime = Date.now()
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/thomas-agent-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      message: "J'ai récolté des tomates",
      session_id: 'test-session-7',
      user_id: 'test-user',
      farm_id: 1
    })
  })

  const endTime = Date.now()
  const processingTime = endTime - startTime

  assertEquals(response.ok, true)
  
  // Pipeline should complete in < 10 seconds (with 3 LLM calls)
  assertEquals(processingTime < 10000, true)
  
  const data = await response.json()
  console.log(`⏱️ Pipeline processing time: ${data.metadata.processing_time_ms}ms`)
})

console.log('✅ All pipeline integration tests defined')

