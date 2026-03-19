-- Migration 052: Réponse structurée pour l'intent help
-- Date: 2026-02-05
-- Description: help_topic dans tool_selection, section help dans response_synthesis

-- ============================================================================
-- 1. MISE À JOUR tool_selection v3.0 - Extraire help_topic pour le tool help
-- ============================================================================

UPDATE chat_prompts
SET content = REPLACE(content,
  'Pour help:
- question_type: le type de question
- context: contexte de la question',
  'Pour help:
- help_topic: UNE des valeurs suivantes selon la question
  - manage_plot: "comment ajouter/modifier une parcelle", parcelle, serre, tunnel
  - manage_material: matériel, tracteur, outil, équipement
  - manage_conversion: conversion, caisse, kg, équivalent
  - task: tâche, enregistrer une action, récolte, désherbage
  - observation: observation, pucerons, maladie, constat
  - team: équipe, membre, inviter, collaborateur
  - app_features: "où trouver", paramètres, fonctionnalités
  - general: fallback si aucun des above'),
updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.0';

-- ============================================================================
-- 2. MISE À JOUR response_synthesis v3.0 - Section help
-- ============================================================================

UPDATE chat_prompts
SET content = REPLACE(content,
  '**Si ÉCHEC COMPLET:**
1. Expliquer le problème clairement
2. Proposer 2-3 solutions alternatives
3. Indiquer ce qui manque ou pose problème
4. Encourager à réessayer avec plus de détails

### Exemples de Réponses Attendues:',
  '**Si action_type = help (aide utilisateur):**
1. Utiliser le help_content reçu (message, examples, app_path)
2. Structure: accroche courte + message principal + exemples formatés (liste ou paragraphe) + chemin app si pertinent
3. Ton: accueillant, concret, incitatif à l''action
4. Ne pas inventer d''exemples: utiliser uniquement ceux fournis dans help_content

### Exemples de Réponses Attendues:'),
updated_at = NOW()
WHERE name = 'response_synthesis' AND version = '3.0';

-- Ajout d'un exemple de réponse help dans le prompt
UPDATE chat_prompts
SET content = REPLACE(content,
  '**Échec avec aide:**
"Je n''ai pas pu identifier la parcelle ''sere 1'' (peut-être ''Serre 1'' ?). Vos parcelles disponibles : Serre 1, Tunnel Nord, Plein Champ A. Pouvez-vous préciser ?"

### IMPORTANT:',
  '**Échec avec aide:**
"Je n''ai pas pu identifier la parcelle ''sere 1'' (peut-être ''Serre 1'' ?). Vos parcelles disponibles : Serre 1, Tunnel Nord, Plein Champ A. Pouvez-vous préciser ?"

**Aide parcelles (help_topic = manage_plot):**
"Tu peux utiliser le formulaire (Paramètres > Gestion des parcelles) ou me dire par exemple : *Créer une serre plastique Serre 2 de 20m x 10m avec 50 planches* ou *Ajouter un tunnel nord de 30 mètres de long et 5 de large*. Plus ta phrase est complète (type, nom, dimensions), plus je la comprends bien."

### IMPORTANT:'),
updated_at = NOW()
WHERE name = 'response_synthesis' AND version = '3.0';
