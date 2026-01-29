-- Script pour mettre à jour les profils de cultures
-- À exécuter après avoir rempli docs/features/CULTURE_PROFILES.md
-- Ce script met à jour la fonction get_profile_culture_ids pour utiliser les listes spécifiques

-- Fonction helper pour obtenir les IDs de cultures par noms
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

-- Fonction mise à jour pour obtenir les cultures d'un profil prédéfini
-- Utilise maintenant les listes spécifiques de noms de cultures
CREATE OR REPLACE FUNCTION get_profile_culture_ids(profile VARCHAR)
RETURNS INTEGER[] AS $$
DECLARE
  result INTEGER[];
BEGIN
  CASE profile
    WHEN 'maraichage' THEN
      -- Liste spécifique pour Maraîchage
      SELECT get_culture_ids_by_names(ARRAY[
        'Tomate', 'Courgette', 'Aubergine', 'Poivron', 'Concombre',
        'Salade', 'Épinard', 'Chou', 'Blette',
        'Carotte', 'Radis', 'Betterave', 'Navet',
        'Haricot vert', 'Petit pois', 'Fève',
        'Basilic', 'Persil', 'Thym'
      ]) INTO result;
    
    WHEN 'pepiniere' THEN
      -- Liste spécifique pour Pépinière
      SELECT get_culture_ids_by_names(ARRAY[
        'Salade', 'Épinard', 'Chou', 'Blette',
        'Basilic', 'Persil', 'Thym',
        'Tomate', 'Courgette', 'Concombre',
        'Tournesol', 'Œillet'
      ]) INTO result;
    
    WHEN 'floriculture' THEN
      -- Liste spécifique pour Floriculture
      SELECT get_culture_ids_by_names(ARRAY[
        'Tournesol', 'Œillet'
      ]) INTO result;
    
    WHEN 'arboriculture' THEN
      -- Liste spécifique pour Arboriculture
      SELECT get_culture_ids_by_names(ARRAY[
        'Pomme', 'Poire', 'Fraise'
      ]) INTO result;
    
    WHEN 'grande_culture' THEN
      -- Liste spécifique pour Grande culture
      SELECT get_culture_ids_by_names(ARRAY[
        'Blé', 'Orge', 'Avoine',
        'Haricot vert', 'Petit pois', 'Fève'
      ]) INTO result;
    
    WHEN 'tropical' THEN
      -- Liste spécifique pour Tropical (basé sur filière)
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

-- Commentaire
COMMENT ON FUNCTION get_profile_culture_ids IS 'Retourne les IDs de cultures par défaut pour un profil donné, basé sur les listes spécifiques définies dans CULTURE_PROFILES.md';
