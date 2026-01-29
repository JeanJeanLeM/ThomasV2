-- Migration 035: Ajout de la colonne filière et insertion des cultures par profil
-- Basé sur docs/features/CULTURE_PROFILES.md

-- 1. Ajouter la colonne filiere à la table cultures
ALTER TABLE cultures 
ADD COLUMN IF NOT EXISTS filiere VARCHAR(50);

-- Index pour la colonne filiere
CREATE INDEX IF NOT EXISTS idx_cultures_filiere ON cultures(filiere);

-- 2. Fonction helper pour déterminer le type de culture à partir du nom
CREATE OR REPLACE FUNCTION get_culture_type_from_name(culture_name TEXT)
RETURNS VARCHAR(50) AS $$
DECLARE
  name_lower TEXT := LOWER(culture_name);
BEGIN
  -- Légumes fruits
  IF name_lower IN ('tomate', 'courgette', 'aubergine', 'poivron', 'concombre', 'melon', 'pastèque', 'butternut', 'courge musquée', 'courge spaghetti', 'potimarron', 'potiron', 'pâtisson', 'patidou', 'piment', 'maïs doux') THEN
    RETURN 'legume_fruit';
  END IF;
  
  -- Légumes feuilles
  IF name_lower IN ('salade', 'laitue', 'épinard', 'chou', 'blette', 'chou chinois', 'chou frisé', 'chou kale', 'chou rouge', 'chou-fleur', 'chou de bruxelles', 'chou-rave', 'endive', 'mâche', 'roquette', 'mesclun', 'batavia', 'scarole', 'frisée', 'pak choï', 'céleri branche', 'rhubarbe') THEN
    RETURN 'legume_feuille';
  END IF;
  
  -- Légumes racines
  IF name_lower IN ('carotte', 'radis', 'betterave', 'navet', 'radis noir', 'panais', 'rutabaga', 'topinambour', 'crosne', 'pomme de terre', 'patate douce', 'manioc', 'manioc (yuca)', 'igname', 'taro', 'patate douce tropical', 'céleri-rave', 'oignon', 'échalote', 'cébette', 'ail', 'ail des ours') THEN
    RETURN 'legume_racine';
  END IF;
  
  -- Aromates
  IF name_lower IN ('basilic', 'persil', 'coriandre', 'estragon', 'thym', 'romarin', 'sauge', 'menthe', 'oseille', 'fenouil', 'poireau') THEN
    RETURN 'aromate';
  END IF;
  
  -- Légumineuses
  IF name_lower IN ('haricot vert', 'haricot beurre', 'petit pois', 'pois gourmand', 'pois protéagineux', 'fève', 'féverole', 'lupin', 'soja') THEN
    RETURN 'legumineuse';
  END IF;
  
  -- Fruits
  IF name_lower IN ('pomme', 'poire', 'pêche', 'abricot', 'cerise', 'prune', 'kiwi', 'actinidia (kiwi)', 'figue', 'kaki', 'grenade', 'citron', 'orange', 'clémentine', 'mandarine', 'pamplemousse', 'citron vert', 'fraise', 'framboise', 'mûre', 'myrtille', 'cassis', 'groseille', 'baie de goji', 'argousier', 'cranberry', 'acérola', 'noni', 'olive', 'châtaigne', 'nectarine', 'reine-claude', 'mirabelle', 'quetsche', 'noix', 'noisette', 'amande', 'banane', 'banane plantain', 'ananas', 'mangue', 'papaye', 'fruit de la passion', 'grenadille', 'litchi', 'avocat', 'goyave', 'coco', 'fruit du dragon', 'carambole', 'starfruit', 'ramboutan', 'longane', 'durian', 'jacque', 'corossol', 'soursop', 'fruit à pain', 'ackee', 'persimmon tropical', 'kumquat', 'yuzu', 'cédrat', 'jamrosat', 'asimine') THEN
    RETURN 'fruit';
  END IF;
  
  -- Fleurs
  IF name_lower IN ('tournesol', 'tournesol (coupé)', 'œillet', 'rose', 'tulipe', 'chrysanthème', 'gerbera', 'lys', 'glaïeul', 'orchidée', 'pivoine', 'dahlia', 'gypsophile', 'alstroemeria', 'lilas', 'lilas (coupé)', 'muguet', 'narcisse', 'jacinthe', 'anthurium', 'cyclamen', 'poinsettia', 'azalée fleurie', 'plante en pot fleurie', 'plante à massif', 'vivace ornementale', 'bulbe printanier', 'fleurs annuelles', 'hortensia pot', 'géranium pot', 'pétunia pot', 'bégonia pot', 'impatiens pot', 'fuchsia pot', 'plante fleurie pot', 'rosier', 'hydrangea', 'lavande', 'rhododendron', 'azalée', 'camélia', 'magnolia', 'fuchsia', 'géranium', 'pétunia', 'impatiens', 'bégonia', 'hibiscus') THEN
    RETURN 'fleur';
  END IF;
  
  -- Céréales
  IF name_lower IN ('blé', 'blé tendre', 'blé dur', 'orge', 'avoine', 'maïs grain', 'maïs fourrage', 'seigle', 'triticale', 'sorgho', 'quinoa (andain)') THEN
    RETURN 'cereale';
  END IF;
  
  -- Par défaut, si on ne peut pas déterminer, on met legume_fruit
  RETURN 'legume_fruit';
END;
$$ LANGUAGE plpgsql;

-- 3. Insertion des cultures avec filière et type
-- Les cultures sont insérées avec ON CONFLICT pour éviter les doublons
-- Si une culture existe déjà, on met à jour sa filière

-- Maraîchage
INSERT INTO cultures (name, type, category, filiere, description, color, is_custom, farm_id) VALUES
('Ail', get_culture_type_from_name('Ail'), 'recolte', 'Maraîchage', 'Ail commun', '#F1C40F', false, NULL),
('Artichaut', get_culture_type_from_name('Artichaut'), 'recolte', 'Maraîchage', 'Artichaut', '#27AE60', false, NULL),
('Asperge', get_culture_type_from_name('Asperge'), 'recolte', 'Maraîchage', 'Asperge', '#2ECC71', false, NULL),
('Aubergine', get_culture_type_from_name('Aubergine'), 'recolte', 'Maraîchage', 'Légume fruit violet', '#9B59B6', false, NULL),
('Betterave', get_culture_type_from_name('Betterave'), 'recolte', 'Maraîchage', 'Légume racine rouge foncé', '#8E44AD', false, NULL),
('Blette', get_culture_type_from_name('Blette'), 'recolte', 'Maraîchage', 'Légume feuille aux tiges colorées', '#E67E22', false, NULL),
('Brocoli', get_culture_type_from_name('Brocoli'), 'recolte', 'Maraîchage', 'Brocoli', '#27AE60', false, NULL),
('Butternut', get_culture_type_from_name('Butternut'), 'recolte', 'Maraîchage', 'Courge butternut', '#F39C12', false, NULL),
('Carotte', get_culture_type_from_name('Carotte'), 'recolte', 'Maraîchage', 'Légume racine orange', '#E67E22', false, NULL),
('Chou chinois', get_culture_type_from_name('Chou chinois'), 'recolte', 'Maraîchage', 'Chou chinois', '#16A085', false, NULL),
('Chou frisé', get_culture_type_from_name('Chou frisé'), 'recolte', 'Maraîchage', 'Chou frisé', '#16A085', false, NULL),
('Chou kale', get_culture_type_from_name('Chou kale'), 'recolte', 'Maraîchage', 'Chou kale', '#16A085', false, NULL),
('Chou rouge', get_culture_type_from_name('Chou rouge'), 'recolte', 'Maraîchage', 'Chou rouge', '#8E44AD', false, NULL),
('Chou-fleur', get_culture_type_from_name('Chou-fleur'), 'recolte', 'Maraîchage', 'Chou-fleur', '#ECF0F1', false, NULL),
('Concombre', get_culture_type_from_name('Concombre'), 'recolte', 'Maraîchage', 'Légume fruit rafraîchissant', '#2ECC71', false, NULL),
('Courge musquée', get_culture_type_from_name('Courge musquée'), 'recolte', 'Maraîchage', 'Courge musquée', '#F39C12', false, NULL),
('Courge spaghetti', get_culture_type_from_name('Courge spaghetti'), 'recolte', 'Maraîchage', 'Courge spaghetti', '#F1C40F', false, NULL),
('Courgette', get_culture_type_from_name('Courgette'), 'recolte', 'Maraîchage', 'Légume fruit allongé', '#4ECDC4', false, NULL),
('Céleri branche', get_culture_type_from_name('Céleri branche'), 'recolte', 'Maraîchage', 'Céleri branche', '#27AE60', false, NULL),
('Céleri-rave', get_culture_type_from_name('Céleri-rave'), 'recolte', 'Maraîchage', 'Céleri-rave', '#95A5A6', false, NULL),
('Endive', get_culture_type_from_name('Endive'), 'recolte', 'Maraîchage', 'Endive', '#ECF0F1', false, NULL),
('Fenouil', get_culture_type_from_name('Fenouil'), 'recolte', 'Maraîchage', 'Fenouil', '#2ECC71', false, NULL),
('Haricot vert', get_culture_type_from_name('Haricot vert'), 'recolte', 'Maraîchage', 'Légumineuse verte', '#27AE60', false, NULL),
('Laitue', get_culture_type_from_name('Laitue'), 'recolte', 'Maraîchage', 'Laitue', '#27AE60', false, NULL),
('Manioc', get_culture_type_from_name('Manioc'), 'recolte', 'Maraîchage', 'Manioc', '#95A5A6', false, NULL),
('Melon', get_culture_type_from_name('Melon'), 'recolte', 'Maraîchage', 'Melon', '#F1C40F', false, NULL),
('Mâche', get_culture_type_from_name('Mâche'), 'recolte', 'Maraîchage', 'Mâche', '#27AE60', false, NULL),
('Navet', get_culture_type_from_name('Navet'), 'recolte', 'Maraîchage', 'Légume racine blanc', '#ECF0F1', false, NULL),
('Oignon', get_culture_type_from_name('Oignon'), 'recolte', 'Maraîchage', 'Oignon', '#F39C12', false, NULL),
('Panais', get_culture_type_from_name('Panais'), 'recolte', 'Maraîchage', 'Panais', '#F1C40F', false, NULL),
('Pastèque', get_culture_type_from_name('Pastèque'), 'recolte', 'Maraîchage', 'Pastèque', '#E74C3C', false, NULL),
('Patate douce', get_culture_type_from_name('Patate douce'), 'recolte', 'Maraîchage', 'Patate douce', '#E67E22', false, NULL),
('Patidou', get_culture_type_from_name('Patidou'), 'recolte', 'Maraîchage', 'Patidou', '#F39C12', false, NULL),
('Piment', get_culture_type_from_name('Piment'), 'recolte', 'Maraîchage', 'Piment', '#E74C3C', false, NULL),
('Poireau', get_culture_type_from_name('Poireau'), 'recolte', 'Maraîchage', 'Poireau', '#27AE60', false, NULL),
('Poivron', get_culture_type_from_name('Poivron'), 'recolte', 'Maraîchage', 'Légume fruit coloré', '#F39C12', false, NULL),
('Pomme de terre', get_culture_type_from_name('Pomme de terre'), 'recolte', 'Maraîchage', 'Pomme de terre', '#95A5A6', false, NULL),
('Potimarron', get_culture_type_from_name('Potimarron'), 'recolte', 'Maraîchage', 'Potimarron', '#E67E22', false, NULL),
('Potiron', get_culture_type_from_name('Potiron'), 'recolte', 'Maraîchage', 'Potiron', '#E67E22', false, NULL),
('Pâtisson', get_culture_type_from_name('Pâtisson'), 'recolte', 'Maraîchage', 'Pâtisson', '#F1C40F', false, NULL),
('Radis', get_culture_type_from_name('Radis'), 'recolte', 'Maraîchage', 'Légume racine piquant', '#E74C3C', false, NULL),
('Roquette', get_culture_type_from_name('Roquette'), 'recolte', 'Maraîchage', 'Roquette', '#27AE60', false, NULL),
('Tomate', get_culture_type_from_name('Tomate'), 'recolte', 'Maraîchage', 'Légume fruit rouge', '#FF6B6B', false, NULL),
('Épinard', get_culture_type_from_name('Épinard'), 'recolte', 'Maraîchage', 'Légume feuille riche en fer', '#1ABC9C', false, NULL),
('Radis noir', get_culture_type_from_name('Radis noir'), 'recolte', 'Maraîchage', 'Radis noir', '#34495E', false, NULL),
('Chou-rave', get_culture_type_from_name('Chou-rave'), 'recolte', 'Maraîchage', 'Chou-rave', '#16A085', false, NULL),
('Salade', get_culture_type_from_name('Salade'), 'recolte', 'Maraîchage', 'Salade', '#27AE60', false, NULL),
('Mesclun', get_culture_type_from_name('Mesclun'), 'recolte', 'Maraîchage', 'Mesclun', '#27AE60', false, NULL),
('Cébette', get_culture_type_from_name('Cébette'), 'recolte', 'Maraîchage', 'Cébette', '#27AE60', false, NULL),
('Chou de Bruxelles', get_culture_type_from_name('Chou de Bruxelles'), 'recolte', 'Maraîchage', 'Chou de Bruxelles', '#16A085', false, NULL),
('Haricot beurre', get_culture_type_from_name('Haricot beurre'), 'recolte', 'Maraîchage', 'Haricot beurre', '#F1C40F', false, NULL),
('Maïs doux', get_culture_type_from_name('Maïs doux'), 'recolte', 'Maraîchage', 'Maïs doux', '#F1C40F', false, NULL),
('Basilic', get_culture_type_from_name('Basilic'), 'recolte', 'Maraîchage', 'Herbe aromatique méditerranéenne', '#27AE60', false, NULL),
('Persil', get_culture_type_from_name('Persil'), 'recolte', 'Maraîchage', 'Herbe aromatique commune', '#2ECC71', false, NULL),
('Coriandre', get_culture_type_from_name('Coriandre'), 'recolte', 'Maraîchage', 'Coriandre', '#27AE60', false, NULL),
('Estragon', get_culture_type_from_name('Estragon'), 'recolte', 'Maraîchage', 'Estragon', '#27AE60', false, NULL),
('Thym', get_culture_type_from_name('Thym'), 'recolte', 'Maraîchage', 'Herbe aromatique persistante', '#16A085', false, NULL),
('Romarin', get_culture_type_from_name('Romarin'), 'recolte', 'Maraîchage', 'Romarin', '#16A085', false, NULL),
('Sauge', get_culture_type_from_name('Sauge'), 'recolte', 'Maraîchage', 'Sauge', '#16A085', false, NULL),
('Menthe', get_culture_type_from_name('Menthe'), 'recolte', 'Maraîchage', 'Menthe', '#2ECC71', false, NULL),
('Oseille', get_culture_type_from_name('Oseille'), 'recolte', 'Maraîchage', 'Oseille', '#27AE60', false, NULL),
('Batavia', get_culture_type_from_name('Batavia'), 'recolte', 'Maraîchage', 'Batavia', '#27AE60', false, NULL),
('Scarole', get_culture_type_from_name('Scarole'), 'recolte', 'Maraîchage', 'Scarole', '#27AE60', false, NULL),
('Frisée', get_culture_type_from_name('Frisée'), 'recolte', 'Maraîchage', 'Frisée', '#27AE60', false, NULL),
('Pak choï', get_culture_type_from_name('Pak choï'), 'recolte', 'Maraîchage', 'Pak choï', '#27AE60', false, NULL),
('Rutabaga', get_culture_type_from_name('Rutabaga'), 'recolte', 'Maraîchage', 'Rutabaga', '#F39C12', false, NULL),
('Topinambour', get_culture_type_from_name('Topinambour'), 'recolte', 'Maraîchage', 'Topinambour', '#F39C12', false, NULL),
('Crosne', get_culture_type_from_name('Crosne'), 'recolte', 'Maraîchage', 'Crosne', '#95A5A6', false, NULL),
('Fève', get_culture_type_from_name('Fève'), 'recolte', 'Maraîchage', 'Légumineuse robuste', '#16A085', false, NULL),
('Pois gourmand', get_culture_type_from_name('Pois gourmand'), 'recolte', 'Maraîchage', 'Pois gourmand', '#2ECC71', false, NULL),
('Rhubarbe', get_culture_type_from_name('Rhubarbe'), 'recolte', 'Maraîchage', 'Rhubarbe', '#E91E63', false, NULL),
('Échalote', get_culture_type_from_name('Échalote'), 'recolte', 'Maraîchage', 'Échalote', '#F39C12', false, NULL),
('Ail des ours', get_culture_type_from_name('Ail des ours'), 'recolte', 'Maraîchage', 'Ail des ours', '#27AE60', false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  filiere = EXCLUDED.filiere,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Pépinière (arbres, arbustes, plantes ornementales)
INSERT INTO cultures (name, type, category, filiere, description, color, is_custom, farm_id) VALUES
('Rosier', 'fleur', 'recolte', 'Pépinière', 'Rosier', '#E91E63', false, NULL),
('Hydrangea', 'fleur', 'recolte', 'Pépinière', 'Hortensia', '#9B59B6', false, NULL),
('Lavande', 'fleur', 'recolte', 'Pépinière', 'Lavande', '#9B59B6', false, NULL),
('Laurier', 'aromate', 'recolte', 'Pépinière', 'Laurier', '#27AE60', false, NULL),
('Conifère', 'fleur', 'recolte', 'Pépinière', 'Conifère', '#16A085', false, NULL),
('Érable', 'fleur', 'recolte', 'Pépinière', 'Érable', '#E67E22', false, NULL),
('Chêne', 'fleur', 'recolte', 'Pépinière', 'Chêne', '#8B4513', false, NULL),
('Bouleau', 'fleur', 'recolte', 'Pépinière', 'Bouleau', '#ECF0F1', false, NULL),
('Saule', 'fleur', 'recolte', 'Pépinière', 'Saule', '#27AE60', false, NULL),
('Rhododendron', 'fleur', 'recolte', 'Pépinière', 'Rhododendron', '#E91E63', false, NULL),
('Azalée', 'fleur', 'recolte', 'Pépinière', 'Azalée', '#E91E63', false, NULL),
('Camélia', 'fleur', 'recolte', 'Pépinière', 'Camélia', '#E91E63', false, NULL),
('Magnolia', 'fleur', 'recolte', 'Pépinière', 'Magnolia', '#E91E63', false, NULL),
('Palmier', 'fleur', 'recolte', 'Pépinière', 'Palmier', '#27AE60', false, NULL),
('Bambou', 'fleur', 'recolte', 'Pépinière', 'Bambou', '#27AE60', false, NULL),
('Fuchsia', 'fleur', 'recolte', 'Pépinière', 'Fuchsia', '#E91E63', false, NULL),
('Géranium', 'fleur', 'recolte', 'Pépinière', 'Géranium', '#E91E63', false, NULL),
('Pétunia', 'fleur', 'recolte', 'Pépinière', 'Pétunia', '#9B59B6', false, NULL),
('Impatiens', 'fleur', 'recolte', 'Pépinière', 'Impatiens', '#E91E63', false, NULL),
('Bégonia', 'fleur', 'recolte', 'Pépinière', 'Bégonia', '#E91E63', false, NULL),
('Hibiscus', 'fleur', 'recolte', 'Pépinière', 'Hibiscus', '#E91E63', false, NULL),
('Olivier ornemental', 'fleur', 'recolte', 'Pépinière', 'Olivier ornemental', '#27AE60', false, NULL),
('Cyprès', 'fleur', 'recolte', 'Pépinière', 'Cyprès', '#16A085', false, NULL),
('Thuya', 'fleur', 'recolte', 'Pépinière', 'Thuya', '#16A085', false, NULL),
('If', 'fleur', 'recolte', 'Pépinière', 'If', '#16A085', false, NULL),
('Pin', 'fleur', 'recolte', 'Pépinière', 'Pin', '#16A085', false, NULL),
('Sapin', 'fleur', 'recolte', 'Pépinière', 'Sapin', '#16A085', false, NULL),
('Hêtre', 'fleur', 'recolte', 'Pépinière', 'Hêtre', '#8B4513', false, NULL),
('Charme', 'fleur', 'recolte', 'Pépinière', 'Charme', '#27AE60', false, NULL),
('Lilas', 'fleur', 'recolte', 'Pépinière', 'Lilas', '#9B59B6', false, NULL),
('Forsythia', 'fleur', 'recolte', 'Pépinière', 'Forsythia', '#F1C40F', false, NULL),
('Deutzia', 'fleur', 'recolte', 'Pépinière', 'Deutzia', '#E91E63', false, NULL),
('Spirée', 'fleur', 'recolte', 'Pépinière', 'Spirée', '#E91E63', false, NULL),
('Groseillier ornemental', 'fleur', 'recolte', 'Pépinière', 'Groseillier ornemental', '#E74C3C', false, NULL),
('Mahonia', 'fleur', 'recolte', 'Pépinière', 'Mahonia', '#F1C40F', false, NULL),
('Arbre de Judée', 'fleur', 'recolte', 'Pépinière', 'Arbre de Judée', '#9B59B6', false, NULL),
('Baguenaudier', 'fleur', 'recolte', 'Pépinière', 'Baguenaudier', '#F1C40F', false, NULL),
('Viburnum', 'fleur', 'recolte', 'Pépinière', 'Viburnum', '#E91E63', false, NULL),
('Escallonia', 'fleur', 'recolte', 'Pépinière', 'Escallonia', '#E91E63', false, NULL),
('Berberis', 'fleur', 'recolte', 'Pépinière', 'Berberis', '#E74C3C', false, NULL),
('Laurier-rose', 'fleur', 'recolte', 'Pépinière', 'Laurier-rose', '#E91E63', false, NULL),
('Clématite', 'fleur', 'recolte', 'Pépinière', 'Clématite', '#9B59B6', false, NULL),
('Chèvrefeuille', 'fleur', 'recolte', 'Pépinière', 'Chèvrefeuille', '#F1C40F', false, NULL),
('Jasmin', 'fleur', 'recolte', 'Pépinière', 'Jasmin', '#F1C40F', false, NULL),
('Lierre', 'fleur', 'recolte', 'Pépinière', 'Lierre', '#27AE60', false, NULL),
('Plante grimpante', 'fleur', 'recolte', 'Pépinière', 'Plante grimpante', '#27AE60', false, NULL),
('Succulente', 'fleur', 'recolte', 'Pépinière', 'Succulente', '#27AE60', false, NULL),
('Cactus', 'fleur', 'recolte', 'Pépinière', 'Cactus', '#27AE60', false, NULL),
('Graminée ornementale', 'fleur', 'recolte', 'Pépinière', 'Graminée ornementale', '#27AE60', false, NULL),
('Cérastium', 'fleur', 'recolte', 'Pépinière', 'Cérastium', '#ECF0F1', false, NULL),
('Mulhenbergia', 'fleur', 'recolte', 'Pépinière', 'Mulhenbergia', '#27AE60', false, NULL),
('Eragrostis', 'fleur', 'recolte', 'Pépinière', 'Eragrostis', '#27AE60', false, NULL),
('Plante vivace', 'fleur', 'recolte', 'Pépinière', 'Plante vivace', '#E91E63', false, NULL),
('Arbuste ornemental', 'fleur', 'recolte', 'Pépinière', 'Arbuste ornemental', '#27AE60', false, NULL),
('Arbre d''alignement', 'fleur', 'recolte', 'Pépinière', 'Arbre d''alignement', '#27AE60', false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  filiere = EXCLUDED.filiere,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Arboriculture (fruits et arbres fruitiers)
INSERT INTO cultures (name, type, category, filiere, description, color, is_custom, farm_id) VALUES
('Pomme', 'fruit', 'recolte', 'Arboriculture', 'Fruit à pépins classique', '#E74C3C', false, NULL),
('Poire', 'fruit', 'recolte', 'Arboriculture', 'Fruit à pépins juteux', '#F1C40F', false, NULL),
('Pêche', 'fruit', 'recolte', 'Arboriculture', 'Pêche', '#FFB6C1', false, NULL),
('Abricot', 'fruit', 'recolte', 'Arboriculture', 'Abricot', '#F39C12', false, NULL),
('Cerise', 'fruit', 'recolte', 'Arboriculture', 'Cerise', '#E74C3C', false, NULL),
('Prune', 'fruit', 'recolte', 'Arboriculture', 'Prune', '#9B59B6', false, NULL),
('Kiwi', 'fruit', 'recolte', 'Arboriculture', 'Kiwi', '#27AE60', false, NULL),
('Noix', 'fruit', 'recolte', 'Arboriculture', 'Noix', '#8B4513', false, NULL),
('Noisette', 'fruit', 'recolte', 'Arboriculture', 'Noisette', '#D4AC0D', false, NULL),
('Amande', 'fruit', 'recolte', 'Arboriculture', 'Amande', '#F1C40F', false, NULL),
('Figue', 'fruit', 'recolte', 'Arboriculture', 'Figue', '#8B4513', false, NULL),
('Kaki', 'fruit', 'recolte', 'Arboriculture', 'Kaki', '#F39C12', false, NULL),
('Grenade', 'fruit', 'recolte', 'Arboriculture', 'Grenade', '#E74C3C', false, NULL),
('Citron', 'fruit', 'recolte', 'Arboriculture', 'Citron', '#F1C40F', false, NULL),
('Orange', 'fruit', 'recolte', 'Arboriculture', 'Orange', '#F39C12', false, NULL),
('Clémentine', 'fruit', 'recolte', 'Arboriculture', 'Clémentine', '#F39C12', false, NULL),
('Mandarine', 'fruit', 'recolte', 'Arboriculture', 'Mandarine', '#F39C12', false, NULL),
('Pamplemousse', 'fruit', 'recolte', 'Arboriculture', 'Pamplemousse', '#F39C12', false, NULL),
('Fraise', 'fruit', 'recolte', 'Arboriculture', 'Petit fruit rouge', '#E91E63', false, NULL),
('Framboise', 'fruit', 'recolte', 'Arboriculture', 'Framboise', '#E91E63', false, NULL),
('Mûre', 'fruit', 'recolte', 'Arboriculture', 'Mûre', '#34495E', false, NULL),
('Myrtille', 'fruit', 'recolte', 'Arboriculture', 'Myrtille', '#3498DB', false, NULL),
('Cassis', 'fruit', 'recolte', 'Arboriculture', 'Cassis', '#34495E', false, NULL),
('Groseille', 'fruit', 'recolte', 'Arboriculture', 'Groseille', '#E74C3C', false, NULL),
('Baie de goji', 'fruit', 'recolte', 'Arboriculture', 'Baie de goji', '#E74C3C', false, NULL),
('Argousier', 'fruit', 'recolte', 'Arboriculture', 'Argousier', '#F39C12', false, NULL),
('Cranberry', 'fruit', 'recolte', 'Arboriculture', 'Cranberry', '#E74C3C', false, NULL),
('Acérola', 'fruit', 'recolte', 'Arboriculture', 'Acérola', '#E74C3C', false, NULL),
('Noni', 'fruit', 'recolte', 'Arboriculture', 'Noni', '#95A5A6', false, NULL),
('Olive', 'fruit', 'recolte', 'Arboriculture', 'Olive', '#27AE60', false, NULL),
('Châtaigne', 'fruit', 'recolte', 'Arboriculture', 'Châtaigne', '#8B4513', false, NULL),
('Nectarine', 'fruit', 'recolte', 'Arboriculture', 'Nectarine', '#FFB6C1', false, NULL),
('Reine-claude', 'fruit', 'recolte', 'Arboriculture', 'Reine-claude', '#27AE60', false, NULL),
('Mirabelle', 'fruit', 'recolte', 'Arboriculture', 'Mirabelle', '#F1C40F', false, NULL),
('Quetsche', 'fruit', 'recolte', 'Arboriculture', 'Quetsche', '#9B59B6', false, NULL),
('Poirier', 'fruit', 'recolte', 'Arboriculture', 'Poirier', '#27AE60', false, NULL),
('Pommier', 'fruit', 'recolte', 'Arboriculture', 'Pommier', '#27AE60', false, NULL),
('Pêcher', 'fruit', 'recolte', 'Arboriculture', 'Pêcher', '#FFB6C1', false, NULL),
('Abricotier', 'fruit', 'recolte', 'Arboriculture', 'Abricotier', '#F39C12', false, NULL),
('Cerisier', 'fruit', 'recolte', 'Arboriculture', 'Cerisier', '#E74C3C', false, NULL),
('Prunier', 'fruit', 'recolte', 'Arboriculture', 'Prunier', '#9B59B6', false, NULL),
('Actinidia (kiwi)', 'fruit', 'recolte', 'Arboriculture', 'Actinidia (kiwi)', '#27AE60', false, NULL),
('Noyer', 'fruit', 'recolte', 'Arboriculture', 'Noyer', '#8B4513', false, NULL),
('Noisetier', 'fruit', 'recolte', 'Arboriculture', 'Noisetier', '#D4AC0D', false, NULL),
('Amandier', 'fruit', 'recolte', 'Arboriculture', 'Amandier', '#F1C40F', false, NULL),
('Figuier', 'fruit', 'recolte', 'Arboriculture', 'Figuier', '#8B4513', false, NULL),
('Cognassier', 'fruit', 'recolte', 'Arboriculture', 'Cognassier', '#F39C12', false, NULL),
('Néflier', 'fruit', 'recolte', 'Arboriculture', 'Néflier', '#95A5A6', false, NULL),
('Sorbier', 'fruit', 'recolte', 'Arboriculture', 'Sorbier', '#E74C3C', false, NULL),
('Petit fruits rouges', 'fruit', 'recolte', 'Arboriculture', 'Petit fruits rouges', '#E74C3C', false, NULL),
('Baies diverses', 'fruit', 'recolte', 'Arboriculture', 'Baies diverses', '#E74C3C', false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  filiere = EXCLUDED.filiere,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Floriculture
INSERT INTO cultures (name, type, category, filiere, description, color, is_custom, farm_id) VALUES
('Rose', 'fleur', 'recolte', 'Floriculture', 'Rose', '#E91E63', false, NULL),
('Tulipe', 'fleur', 'recolte', 'Floriculture', 'Tulipe', '#E91E63', false, NULL),
('Chrysanthème', 'fleur', 'recolte', 'Floriculture', 'Chrysanthème', '#F1C40F', false, NULL),
('Gerbera', 'fleur', 'recolte', 'Floriculture', 'Gerbera', '#E91E63', false, NULL),
('Œillet', 'fleur', 'recolte', 'Floriculture', 'Fleur ornementale', '#E91E63', false, NULL),
('Lys', 'fleur', 'recolte', 'Floriculture', 'Lys', '#F1C40F', false, NULL),
('Glaïeul', 'fleur', 'recolte', 'Floriculture', 'Glaïeul', '#E91E63', false, NULL),
('Orchidée', 'fleur', 'recolte', 'Floriculture', 'Orchidée', '#9B59B6', false, NULL),
('Pivoine', 'fleur', 'recolte', 'Floriculture', 'Pivoine', '#E91E63', false, NULL),
('Dahlia', 'fleur', 'recolte', 'Floriculture', 'Dahlia', '#E91E63', false, NULL),
('Tournesol (coupé)', 'fleur', 'recolte', 'Floriculture', 'Tournesol coupé', '#F39C12', false, NULL),
('Gypsophile', 'fleur', 'recolte', 'Floriculture', 'Gypsophile', '#ECF0F1', false, NULL),
('Alstroemeria', 'fleur', 'recolte', 'Floriculture', 'Alstroemeria', '#E91E63', false, NULL),
('Lilas (coupé)', 'fleur', 'recolte', 'Floriculture', 'Lilas coupé', '#9B59B6', false, NULL),
('Muguet', 'fleur', 'recolte', 'Floriculture', 'Muguet', '#ECF0F1', false, NULL),
('Narcisse', 'fleur', 'recolte', 'Floriculture', 'Narcisse', '#F1C40F', false, NULL),
('Jacinthe', 'fleur', 'recolte', 'Floriculture', 'Jacinthe', '#9B59B6', false, NULL),
('Anthurium', 'fleur', 'recolte', 'Floriculture', 'Anthurium', '#E74C3C', false, NULL),
('Cyclamen', 'fleur', 'recolte', 'Floriculture', 'Cyclamen', '#E91E63', false, NULL),
('Poinsettia', 'fleur', 'recolte', 'Floriculture', 'Poinsettia', '#E74C3C', false, NULL),
('Azalée fleurie', 'fleur', 'recolte', 'Floriculture', 'Azalée fleurie', '#E91E63', false, NULL),
('Plante en pot fleurie', 'fleur', 'recolte', 'Floriculture', 'Plante en pot fleurie', '#E91E63', false, NULL),
('Plante à massif', 'fleur', 'recolte', 'Floriculture', 'Plante à massif', '#E91E63', false, NULL),
('Vivace ornementale', 'fleur', 'recolte', 'Floriculture', 'Vivace ornementale', '#E91E63', false, NULL),
('Bulbe printanier', 'fleur', 'recolte', 'Floriculture', 'Bulbe printanier', '#F1C40F', false, NULL),
('Fleurs annuelles', 'fleur', 'recolte', 'Floriculture', 'Fleurs annuelles', '#E91E63', false, NULL),
('Plante d''intérieur', 'fleur', 'recolte', 'Floriculture', 'Plante d''intérieur', '#27AE60', false, NULL),
('Fougère', 'fleur', 'recolte', 'Floriculture', 'Fougère', '#27AE60', false, NULL),
('Dracaena', 'fleur', 'recolte', 'Floriculture', 'Dracaena', '#27AE60', false, NULL),
('Ficus', 'fleur', 'recolte', 'Floriculture', 'Ficus', '#27AE60', false, NULL),
('Plante verte pot', 'fleur', 'recolte', 'Floriculture', 'Plante verte pot', '#27AE60', false, NULL),
('Succulente pot', 'fleur', 'recolte', 'Floriculture', 'Succulente pot', '#27AE60', false, NULL),
('Cactus pot', 'fleur', 'recolte', 'Floriculture', 'Cactus pot', '#27AE60', false, NULL),
('Bonsaï', 'fleur', 'recolte', 'Floriculture', 'Bonsaï', '#27AE60', false, NULL),
('Plante grasse', 'fleur', 'recolte', 'Floriculture', 'Plante grasse', '#27AE60', false, NULL),
('Hortensia pot', 'fleur', 'recolte', 'Floriculture', 'Hortensia pot', '#9B59B6', false, NULL),
('Géranium pot', 'fleur', 'recolte', 'Floriculture', 'Géranium pot', '#E91E63', false, NULL),
('Pétunia pot', 'fleur', 'recolte', 'Floriculture', 'Pétunia pot', '#9B59B6', false, NULL),
('Bégonia pot', 'fleur', 'recolte', 'Floriculture', 'Bégonia pot', '#E91E63', false, NULL),
('Impatiens pot', 'fleur', 'recolte', 'Floriculture', 'Impatiens pot', '#E91E63', false, NULL),
('Fuchsia pot', 'fleur', 'recolte', 'Floriculture', 'Fuchsia pot', '#E91E63', false, NULL),
('Plante fleurie pot', 'fleur', 'recolte', 'Floriculture', 'Plante fleurie pot', '#E91E63', false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  filiere = EXCLUDED.filiere,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Grande culture
INSERT INTO cultures (name, type, category, filiere, description, color, is_custom, farm_id) VALUES
('Blé tendre', 'cereale', 'recolte', 'Grande culture', 'Blé tendre', '#F1C40F', false, NULL),
('Blé dur', 'cereale', 'recolte', 'Grande culture', 'Blé dur', '#D4AC0D', false, NULL),
('Orge', 'cereale', 'recolte', 'Grande culture', 'Céréale rustique', '#D4AC0D', false, NULL),
('Avoine', 'cereale', 'recolte', 'Grande culture', 'Céréale nutritive', '#B7950B', false, NULL),
('Maïs grain', 'cereale', 'recolte', 'Grande culture', 'Maïs grain', '#F1C40F', false, NULL),
('Maïs fourrage', 'cereale', 'recolte', 'Grande culture', 'Maïs fourrage', '#F1C40F', false, NULL),
('Seigle', 'cereale', 'recolte', 'Grande culture', 'Seigle', '#D4AC0D', false, NULL),
('Triticale', 'cereale', 'recolte', 'Grande culture', 'Triticale', '#D4AC0D', false, NULL),
('Colza', 'cereale', 'recolte', 'Grande culture', 'Colza', '#F1C40F', false, NULL),
('Tournesol', 'cereale', 'recolte', 'Grande culture', 'Tournesol', '#F39C12', false, NULL),
('Soja', 'legumineuse', 'recolte', 'Grande culture', 'Soja', '#27AE60', false, NULL),
('Lin', 'cereale', 'recolte', 'Grande culture', 'Lin', '#3498DB', false, NULL),
('Pois protéagineux', 'legumineuse', 'recolte', 'Grande culture', 'Pois protéagineux', '#2ECC71', false, NULL),
('Féverole', 'legumineuse', 'recolte', 'Grande culture', 'Féverole', '#27AE60', false, NULL),
('Lupin', 'legumineuse', 'recolte', 'Grande culture', 'Lupin', '#9B59B6', false, NULL),
('Betterave sucrière', 'legume_racine', 'recolte', 'Grande culture', 'Betterave sucrière', '#8E44AD', false, NULL),
('Pomme de terre (industrie)', 'legume_racine', 'recolte', 'Grande culture', 'Pomme de terre industrielle', '#95A5A6', false, NULL),
('Sorgho', 'cereale', 'recolte', 'Grande culture', 'Sorgho', '#D4AC0D', false, NULL),
('Chanvre', 'cereale', 'recolte', 'Grande culture', 'Chanvre', '#27AE60', false, NULL),
('Tabac', 'cereale', 'recolte', 'Grande culture', 'Tabac', '#95A5A6', false, NULL),
('Luzerne', 'legumineuse', 'recolte', 'Grande culture', 'Luzerne', '#27AE60', false, NULL),
('Prairie temporaire', 'cereale', 'recolte', 'Grande culture', 'Prairie temporaire', '#27AE60', false, NULL),
('Jachère', 'cereale', 'recolte', 'Grande culture', 'Jachère', '#95A5A6', false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  filiere = EXCLUDED.filiere,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Tropical
INSERT INTO cultures (name, type, category, filiere, description, color, is_custom, farm_id) VALUES
('Banane', 'fruit', 'recolte', 'Tropical', 'Banane', '#F1C40F', false, NULL),
('Ananas', 'fruit', 'recolte', 'Tropical', 'Ananas', '#F1C40F', false, NULL),
('Mangue', 'fruit', 'recolte', 'Tropical', 'Mangue', '#F39C12', false, NULL),
('Papaye', 'fruit', 'recolte', 'Tropical', 'Papaye', '#F1C40F', false, NULL),
('Fruit de la passion', 'fruit', 'recolte', 'Tropical', 'Fruit de la passion', '#9B59B6', false, NULL),
('Litchi', 'fruit', 'recolte', 'Tropical', 'Litchi', '#E74C3C', false, NULL),
('Avocat', 'fruit', 'recolte', 'Tropical', 'Avocat', '#27AE60', false, NULL),
('Goyave', 'fruit', 'recolte', 'Tropical', 'Goyave', '#E74C3C', false, NULL),
('Coco', 'fruit', 'recolte', 'Tropical', 'Noix de coco', '#F1C40F', false, NULL),
('Fruit du dragon', 'fruit', 'recolte', 'Tropical', 'Fruit du dragon', '#E91E63', false, NULL),
('Carambole', 'fruit', 'recolte', 'Tropical', 'Carambole', '#F1C40F', false, NULL),
('Ramboutan', 'fruit', 'recolte', 'Tropical', 'Ramboutan', '#E74C3C', false, NULL),
('Longane', 'fruit', 'recolte', 'Tropical', 'Longane', '#F1C40F', false, NULL),
('Durian', 'fruit', 'recolte', 'Tropical', 'Durian', '#F1C40F', false, NULL),
('Jacque', 'fruit', 'recolte', 'Tropical', 'Jacque', '#F1C40F', false, NULL),
('Corossol', 'fruit', 'recolte', 'Tropical', 'Corossol', '#27AE60', false, NULL),
('Grenadille', 'fruit', 'recolte', 'Tropical', 'Grenadille', '#9B59B6', false, NULL),
('Citron vert', 'fruit', 'recolte', 'Tropical', 'Citron vert', '#2ECC71', false, NULL),
('Manioc (yuca)', 'legume_racine', 'recolte', 'Tropical', 'Manioc', '#95A5A6', false, NULL),
('Igname', 'legume_racine', 'recolte', 'Tropical', 'Igname', '#95A5A6', false, NULL),
('Taro', 'legume_racine', 'recolte', 'Tropical', 'Taro', '#95A5A6', false, NULL),
('Patate douce tropical', 'legume_racine', 'recolte', 'Tropical', 'Patate douce tropicale', '#E67E22', false, NULL),
('Banane plantain', 'fruit', 'recolte', 'Tropical', 'Banane plantain', '#F1C40F', false, NULL),
('Canne à sucre', 'cereale', 'recolte', 'Tropical', 'Canne à sucre', '#27AE60', false, NULL),
('Café', 'aromate', 'recolte', 'Tropical', 'Café', '#8B4513', false, NULL),
('Cacao', 'aromate', 'recolte', 'Tropical', 'Cacao', '#8B4513', false, NULL),
('Vanille', 'aromate', 'recolte', 'Tropical', 'Vanille', '#F1C40F', false, NULL),
('Gingembre', 'aromate', 'recolte', 'Tropical', 'Gingembre', '#F39C12', false, NULL),
('Curcuma', 'aromate', 'recolte', 'Tropical', 'Curcuma', '#F1C40F', false, NULL),
('Fruit à pain', 'fruit', 'recolte', 'Tropical', 'Fruit à pain', '#F1C40F', false, NULL),
('Ackee', 'fruit', 'recolte', 'Tropical', 'Ackee', '#F1C40F', false, NULL),
('Soursop', 'fruit', 'recolte', 'Tropical', 'Soursop', '#27AE60', false, NULL),
('Starfruit', 'fruit', 'recolte', 'Tropical', 'Starfruit', '#F1C40F', false, NULL),
('Persimmon tropical', 'fruit', 'recolte', 'Tropical', 'Persimmon tropical', '#F39C12', false, NULL),
('Kumquat', 'fruit', 'recolte', 'Tropical', 'Kumquat', '#F39C12', false, NULL),
('Yuzu', 'fruit', 'recolte', 'Tropical', 'Yuzu', '#F1C40F', false, NULL),
('Cédrat', 'fruit', 'recolte', 'Tropical', 'Cédrat', '#F1C40F', false, NULL),
('Jamrosat', 'fruit', 'recolte', 'Tropical', 'Jamrosat', '#E74C3C', false, NULL),
('Safran (exotique)', 'aromate', 'recolte', 'Tropical', 'Safran exotique', '#F1C40F', false, NULL),
('Quinoa (andain)', 'cereale', 'recolte', 'Tropical', 'Quinoa', '#F1C40F', false, NULL),
('Thé', 'aromate', 'recolte', 'Tropical', 'Thé', '#27AE60', false, NULL),
('Asimine', 'fruit', 'recolte', 'Tropical', 'Asimine', '#F1C40F', false, NULL),
('Ginseng', 'aromate', 'recolte', 'Tropical', 'Ginseng', '#8B4513', false, NULL)
ON CONFLICT (name) DO UPDATE SET 
  filiere = EXCLUDED.filiere,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Commentaire
COMMENT ON COLUMN cultures.filiere IS 'Filière professionnelle associée à la culture (Maraîchage, Pépinière, Floriculture, Arboriculture, Grande culture, Tropical)';
