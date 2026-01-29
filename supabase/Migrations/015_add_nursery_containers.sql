-- Migration 015: Contenants de pépinière (catégorie consommable)
-- Ajouter des contenants spécifiques à la pépinière selon le point 23 du test 261126

-- Ajouter les contenants de pépinière avec la catégorie "consommable"
INSERT INTO containers (name, category, type, description, typical_capacity_kg, typical_capacity_l, material, dimensions_cm, color, slugs) VALUES

-- CONTENANTS PÉPINIÈRE - CATÉGORIE CONSOMMABLE
-- Pots individuels
('Pot 1L', 'consommable', 'pot', 'Pot individuel de 1 litre pour plants', 1.0, 1.0, 'plastique', 'Ø12x12', '#228B22', 
 ARRAY['pot', '1L', 'litre', 'plant', 'pépinière', 'individuel', 'plastique']),

('Pot 0.5L', 'consommable', 'pot', 'Pot individuel de 0.5 litre pour jeunes plants', 0.5, 0.5, 'plastique', 'Ø10x10', '#228B22', 
 ARRAY['pot', '0.5L', 'demi-litre', 'jeune plant', 'pépinière', 'petit']),

('Pot 2L', 'consommable', 'pot', 'Pot individuel de 2 litres pour plants développés', 2.0, 2.0, 'plastique', 'Ø15x15', '#228B22', 
 ARRAY['pot', '2L', 'deux litres', 'plant développé', 'pépinière', 'grand']),

('Pot 3L', 'consommable', 'pot', 'Pot individuel de 3 litres pour gros plants', 3.0, 3.0, 'plastique', 'Ø18x18', '#228B22', 
 ARRAY['pot', '3L', 'trois litres', 'gros plant', 'pépinière', 'très grand']),

('Pot 5L', 'consommable', 'pot', 'Pot individuel de 5 litres pour arbustes', 5.0, 5.0, 'plastique', 'Ø22x22', '#228B22', 
 ARRAY['pot', '5L', 'cinq litres', 'arbuste', 'pépinière', 'extra grand']),

-- Plaques de semis
('Plaque semis 77 alvéoles', 'consommable', 'plaque', 'Plaque de semis avec 77 alvéoles', 0.5, 0.77, 'plastique', '35x21x5', '#32CD32', 
 ARRAY['plaque', 'semis', '77', 'alvéoles', 'pépinière', 'multiplication']),

('Plaque semis 104 alvéoles', 'consommable', 'plaque', 'Plaque de semis avec 104 alvéoles', 0.3, 0.52, 'plastique', '35x21x4', '#32CD32', 
 ARRAY['plaque', 'semis', '104', 'alvéoles', 'pépinière', 'petites graines']),

('Plaque semis 40 alvéoles', 'consommable', 'plaque', 'Plaque de semis avec 40 alvéoles', 1.0, 1.6, 'plastique', '35x21x6', '#32CD32', 
 ARRAY['plaque', 'semis', '40', 'alvéoles', 'pépinière', 'grosses graines']),

('Plaque semis 24 alvéoles', 'consommable', 'plaque', 'Plaque de semis avec 24 alvéoles', 1.5, 2.4, 'plastique', '35x21x8', '#32CD32', 
 ARRAY['plaque', 'semis', '24', 'alvéoles', 'pépinière', 'très grosses graines']),

-- Godets individuels
('Godet 8cm', 'consommable', 'godet', 'Godet carré de 8cm pour repiquage', 0.3, 0.3, 'plastique', '8x8x8', '#90EE90', 
 ARRAY['godet', '8cm', 'carré', 'repiquage', 'pépinière', 'petit']),

('Godet 10cm', 'consommable', 'godet', 'Godet carré de 10cm pour plants moyens', 0.5, 0.5, 'plastique', '10x10x10', '#90EE90', 
 ARRAY['godet', '10cm', 'carré', 'plant moyen', 'pépinière', 'standard']),

('Godet rond 9cm', 'consommable', 'godet', 'Godet rond de 9cm de diamètre', 0.4, 0.4, 'plastique', 'Ø9x9', '#90EE90', 
 ARRAY['godet', '9cm', 'rond', 'diamètre', 'pépinière', 'classique']),

-- Pots biodégradables
('Pot tourbe 6cm', 'consommable', 'pot_bio', 'Pot biodégradable en tourbe de 6cm', 0.2, 0.2, 'tourbe', 'Ø6x6', '#8B4513', 
 ARRAY['pot', 'tourbe', '6cm', 'biodégradable', 'pépinière', 'écologique']),

('Pot tourbe 8cm', 'consommable', 'pot_bio', 'Pot biodégradable en tourbe de 8cm', 0.3, 0.3, 'tourbe', 'Ø8x8', '#8B4513', 
 ARRAY['pot', 'tourbe', '8cm', 'biodégradable', 'pépinière', 'écologique']),

('Pot coco 7cm', 'consommable', 'pot_bio', 'Pot biodégradable en fibre de coco de 7cm', 0.25, 0.25, 'coco', 'Ø7x7', '#D2691E', 
 ARRAY['pot', 'coco', '7cm', 'biodégradable', 'fibre', 'pépinière', 'écologique']),

-- Bacs de culture
('Bac pépinière 40L', 'consommable', 'bac', 'Bac de culture pour pépinière de 40L', 10.0, 40.0, 'plastique', '60x40x17', '#006400', 
 ARRAY['bac', 'pépinière', '40L', 'culture', 'grand', 'multiplication']),

('Bac semis 20L', 'consommable', 'bac', 'Bac pour semis directs de 20L', 5.0, 20.0, 'plastique', '50x30x13', '#006400', 
 ARRAY['bac', 'semis', '20L', 'direct', 'moyen', 'pépinière']),

-- Contenants spécialisés
('Sac de culture 10L', 'consommable', 'sac_culture', 'Sac de culture en géotextile de 10L', 2.0, 10.0, 'geotextile', 'Ø25x25', '#2F4F4F', 
 ARRAY['sac', 'culture', '10L', 'géotextile', 'pépinière', 'respirant']),

('Sac de culture 20L', 'consommable', 'sac_culture', 'Sac de culture en géotextile de 20L', 4.0, 20.0, 'geotextile', 'Ø35x30', '#2F4F4F', 
 ARRAY['sac', 'culture', '20L', 'géotextile', 'pépinière', 'grand', 'respirant']),

('Plateau de germination', 'consommable', 'plateau', 'Plateau avec couvercle pour germination', 0.2, 1.0, 'plastique', '38x24x6', '#FFE4B5', 
 ARRAY['plateau', 'germination', 'couvercle', 'pépinière', 'semis', 'mini-serre'])

ON CONFLICT (name, farm_id) DO NOTHING;

-- Commentaire pour traçabilité
COMMENT ON TABLE containers IS 'Table des contenants incluant maintenant la catégorie consommable pour les contenants de pépinière (migration 015)';

