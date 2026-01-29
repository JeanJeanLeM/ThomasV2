-- 006_materials_custom_category.sql
-- Ajout d'un libellé de catégorie personnalisée pour le matériel.
-- La colonne llm_keywords (slugs pour le LLM) est déjà ajoutée dans les migrations précédentes,
-- cette migration se concentre donc uniquement sur la partie "custom_category".

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS custom_category character varying;


