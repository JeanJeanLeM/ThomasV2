-- Migration 086: Add member_matching prompt for pipeline step

UPDATE public.chat_prompts
SET is_default = false
WHERE name = 'member_matching';

INSERT INTO public.chat_prompts (
  id,
  name,
  content,
  examples,
  version,
  is_active,
  metadata,
  is_default
)
VALUES (
  gen_random_uuid(),
  'member_matching',
  $prompt$
Tu identifies les membres de ferme mentionnes dans le message utilisateur.

Contexte membres:
{{members_catalog}}

Retour attendu:
- JSON strict uniquement.
- Format:
{
  "matched_member_ids": ["uuid", "..."],
  "detected_people_count": 2
}

Regles:
- matched_member_ids: uniquement les user_id presents dans le contexte membres.
- detected_people_count: nombre total de personnes detectees ("nous etions 4", "a deux", etc.).
- Si aucun membre n''est reconnu mais un nombre est detecte, renseigner detected_people_count.
- Si aucune information, retourner [] et null.
  $prompt$,
  '[]'::jsonb,
  '1.0',
  true,
  jsonb_build_object(
    'category', 'pipeline',
    'purpose', 'match farm members from natural language',
    'output', 'json'
  ),
  true
);
