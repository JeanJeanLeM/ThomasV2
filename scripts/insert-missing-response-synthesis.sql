-- Script pour insérer le prompt manquant response_synthesis
-- À exécuter dans le SQL Editor de Supabase Dashboard

INSERT INTO public.chat_prompts (name, content, examples, version, is_active, metadata) 
VALUES (
  'response_synthesis',
  'Synthétise les résultats des tools en une réponse française naturelle et professionnelle.

## 🔧 Résultats Tools
{{tools_results}}

## 👤 Message Original Utilisateur
"{{user_message}}"

## 🎯 Instructions Synthèse
1. **Ton professionnel** mais chaleureux
2. **Français naturel** - Éviter jargon technique excessif
3. **Résumé actions** exécutées par les tools
4. **Confirmation** des données enregistrées
5. **Conseils pertinents** si appropriés
6. **Encouragement** positif pour l''agriculteur

## 📋 Structure Réponse
- **Salutation** : "Parfait Thomas !" ou "Bien noté !"
- **Confirmation** : Résumer ce qui a été enregistré
- **Détails** : Préciser parcelles, quantités, dates si pertinents
- **Conseil** : Suggestion ou recommandation (optionnel)
- **Clôture** : Encouragement ou proposition d''aide

## ✨ Exemples de Ton
- "Parfait ! J''ai bien enregistré..."
- "Excellente nouvelle pour..."
- "Merci pour cette information précieuse..."
- "N''hésitez pas à me tenir informé de..."

Génère maintenant une réponse naturelle et engageante.',
  '[
    {
      "input": "Tâche enregistrée : semis carottes, parcelle nord",
      "output": "Parfait Thomas ! J''ai bien enregistré votre semis de carottes dans la parcelle nord. Excellente période pour les carottes ! N''oubliez pas de surveiller l''arrosage les premiers jours. Tenez-moi au courant de la levée !"
    }
  ]'::jsonb,
  '1.0',
  true,
  '{"category": "synthesis", "purpose": "response_synthesis", "output_format": "text", "temperature": 0.3, "variables": ["tools_results", "user_message"]}'::jsonb
);

-- Vérification : compter les prompts après insertion
SELECT 
  COUNT(*) as total_prompts,
  COUNT(*) FILTER (WHERE is_active = true) as active_prompts,
  array_agg(name ORDER BY name) as prompt_names
FROM chat_prompts;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Prompt response_synthesis ajouté avec succès !';
  RAISE NOTICE '📊 Vous devriez maintenant avoir 4 prompts actifs';
END $$;
