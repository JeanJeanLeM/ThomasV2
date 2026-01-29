-- Migration 036: Ajout du profil "Tropical" aux préférences de cultures
-- Cette migration ajoute le support pour le profil "Tropical" sans modifier les migrations précédentes

-- 1. Modifier la contrainte CHECK pour inclure 'tropical'
-- On doit d'abord supprimer l'ancienne contrainte et en créer une nouvelle
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_culture_preferences_profile_type_check'
  ) THEN
    ALTER TABLE user_culture_preferences 
    DROP CONSTRAINT user_culture_preferences_profile_type_check;
  END IF;
  
  -- Créer la nouvelle contrainte avec 'tropical' inclus
  ALTER TABLE user_culture_preferences 
  ADD CONSTRAINT user_culture_preferences_profile_type_check 
  CHECK (profile_type IN ('maraichage', 'pepiniere', 'floriculture', 'arboriculture', 'grande_culture', 'tropical', 'custom'));
END $$;

-- 2. Mettre à jour la fonction get_profile_culture_ids pour inclure le cas 'tropical'
CREATE OR REPLACE FUNCTION get_profile_culture_ids(profile VARCHAR)
RETURNS INTEGER[] AS $$
DECLARE
  result INTEGER[];
BEGIN
  CASE profile
    WHEN 'maraichage' THEN
      -- Maraîchage: légumes fruits, légumes feuilles, légumes racines, aromates
      SELECT ARRAY_AGG(id) INTO result
      FROM cultures
      WHERE type IN ('legume_fruit', 'legume_feuille', 'legume_racine', 'aromate')
        AND farm_id IS NULL;
    
    WHEN 'pepiniere' THEN
      -- Pépinière: fleurs, aromates, jeunes plants (on inclut fleurs et aromates pour la diversité)
      SELECT ARRAY_AGG(id) INTO result
      FROM cultures
      WHERE type IN ('fleur', 'aromate', 'legume_fruit')
        AND farm_id IS NULL
      LIMIT 15; -- Limiter pour la pépinière
    
    WHEN 'floriculture' THEN
      -- Floriculture: uniquement les fleurs
      SELECT ARRAY_AGG(id) INTO result
      FROM cultures
      WHERE type = 'fleur'
        AND farm_id IS NULL;
    
    WHEN 'arboriculture' THEN
      -- Arboriculture: fruits
      SELECT ARRAY_AGG(id) INTO result
      FROM cultures
      WHERE type = 'fruit'
        AND farm_id IS NULL;
    
    WHEN 'grande_culture' THEN
      -- Grande culture: céréales et légumineuses
      SELECT ARRAY_AGG(id) INTO result
      FROM cultures
      WHERE type IN ('cereale', 'legumineuse')
        AND farm_id IS NULL;
    
    WHEN 'tropical' THEN
      -- Tropical: cultures avec filière Tropical
      SELECT ARRAY_AGG(id) INTO result
      FROM cultures
      WHERE filiere = 'Tropical'
        AND farm_id IS NULL;
    
    ELSE
      -- Profil personnalisé: liste vide
      result := ARRAY[]::INTEGER[];
  END CASE;
  
  RETURN COALESCE(result, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql;

-- 3. Mettre à jour le commentaire
COMMENT ON COLUMN user_culture_preferences.profile_type IS 'Type de profil: maraichage, pepiniere, floriculture, arboriculture, grande_culture, tropical, ou custom';
COMMENT ON FUNCTION get_profile_culture_ids IS 'Retourne les IDs de cultures par défaut pour un profil donné';
