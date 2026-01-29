-- Migration 034: Table des préférences de cultures utilisateur
-- Permet aux utilisateurs de personnaliser leur liste de cultures avec des profils prédéfinis

-- Table des préférences utilisateur
CREATE TABLE IF NOT EXISTS user_culture_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  profile_type VARCHAR(50) NOT NULL CHECK (profile_type IN ('maraichage', 'pepiniere', 'floriculture', 'arboriculture', 'grande_culture', 'tropical', 'custom')),
  culture_ids INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_culture_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_culture_preferences_user_farm_unique UNIQUE (user_id, farm_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_culture_preferences_user_id ON user_culture_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_culture_preferences_farm_id ON user_culture_preferences(farm_id);
CREATE INDEX IF NOT EXISTS idx_user_culture_preferences_profile_type ON user_culture_preferences(profile_type);

-- Trigger pour updated_at
CREATE TRIGGER update_user_culture_preferences_updated_at 
  BEFORE UPDATE ON user_culture_preferences
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE user_culture_preferences ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres préférences
CREATE POLICY "Users can view their own culture preferences" ON user_culture_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent insérer leurs propres préférences
CREATE POLICY "Users can insert their own culture preferences" ON user_culture_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent mettre à jour leurs propres préférences
CREATE POLICY "Users can update their own culture preferences" ON user_culture_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres préférences
CREATE POLICY "Users can delete their own culture preferences" ON user_culture_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Fonction helper pour obtenir les IDs de cultures par nom
CREATE OR REPLACE FUNCTION get_culture_ids_by_names(culture_names TEXT[])
RETURNS INTEGER[] AS $$
DECLARE
  result INTEGER[];
BEGIN
  SELECT ARRAY_AGG(id) INTO result
  FROM cultures
  WHERE name = ANY(culture_names)
    AND farm_id IS NULL; -- Seulement les cultures globales
  RETURN COALESCE(result, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les cultures d'un profil prédéfini
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

-- Commentaires
COMMENT ON TABLE user_culture_preferences IS 'Préférences de cultures personnalisées par utilisateur et par ferme';
COMMENT ON COLUMN user_culture_preferences.profile_type IS 'Type de profil: maraichage, pepiniere, floriculture, arboriculture, grande_culture, tropical, ou custom';
COMMENT ON COLUMN user_culture_preferences.culture_ids IS 'Array des IDs de cultures sélectionnées par l''utilisateur';
COMMENT ON FUNCTION get_profile_culture_ids IS 'Retourne les IDs de cultures par défaut pour un profil donné';
