# 🚨 FIX URGENT: Erreur CORS Edge Function

## Problème

L'Edge Function `analyze-message` crash au démarrage avec erreur CORS car elle appelle `increment_agent_method_stats` qui n'existe pas encore en DB.

## Cause

La migration 047 n'a pas été exécutée, donc la fonction RPC n'existe pas.

## Solution Immédiate

### Option 1: Exécuter Migration 047 (RECOMMANDÉ)

1. Ouvrez **Supabase SQL Editor**
2. **Copiez-collez** le contenu de:
   ```
   supabase/Migrations/047_add_method_stats_function.sql
   ```
3. **Exécutez** la query
4. ✅ L'Edge Function fonctionnera immédiatement

### Option 2: Redéployer Edge Function Corrigée

1. Ouvrez **Supabase Dashboard** → Edge Functions → **analyze-message**
2. **Copiez tout** le fichier local mis à jour:
   ```
   supabase/functions/analyze-message/index.ts
   ```
3. **Collez** dans l'éditeur
4. Cliquez **"Deploy"**
5. Attendez ~30 secondes

## Code Corrigé

La fonction `recordMethodSuccess` (ligne ~1504) a été modifiée pour:
- ✅ Vérifier si la fonction RPC existe
- ✅ Skip silencieusement si pas encore déployée
- ✅ Ne pas crash l'analyse

## Test

Après la correction:
1. Rechargez votre page web (`Ctrl+F5`)
2. Envoyez un message test
3. Devrait fonctionner! ✅

## Ordre Recommandé

**MEILLEURE APPROCHE:**
1. Exécutez migration 047 MAINTENANT
2. Redéployez l'Edge Function corrigée
3. Testez

Ainsi, les stats fonctionneront dès le départ.

---

**Date**: 2026-02-03
**Status**: 🚨 URGENT - À corriger immédiatement
