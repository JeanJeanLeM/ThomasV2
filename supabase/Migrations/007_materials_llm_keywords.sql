-- 007_materials_llm_keywords.sql
-- Ajout de la colonne llm_keywords pour les mots-clés LLM du matériel

-- Ajouter la colonne llm_keywords si elle n'existe pas
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS llm_keywords TEXT[] DEFAULT '{}';

-- Ajouter un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_materials_llm_keywords_gin 
  ON public.materials USING gin(llm_keywords);

-- Ajouter quelques données de test pour vérifier
UPDATE public.materials 
SET llm_keywords = ARRAY['tracteur', 'machine agricole', 'véhicule']
WHERE category = 'tracteurs' AND llm_keywords = '{}';

UPDATE public.materials 
SET llm_keywords = ARRAY['outil', 'équipement', 'matériel']
WHERE category IN ('outils_tracteur', 'outils_manuels') AND llm_keywords = '{}';


