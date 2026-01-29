-- Migration 007: Table des cultures
-- Créer une table standardisée pour les cultures avec types et variétés

-- Table des cultures principales
CREATE TABLE IF NOT EXISTS cultures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- 'legume_fruit', 'legume_feuille', 'legume_racine', 'cereale', 'fleur', 'fruit', 'legumineuse', 'aromate'
  category VARCHAR(50) NOT NULL DEFAULT 'recolte', -- 'recolte' ou 'intrant'
  description TEXT,
  color VARCHAR(7), -- Code couleur hex pour l'affichage
  is_custom BOOLEAN DEFAULT false, -- true si ajoutée par un utilisateur
  farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE, -- null pour cultures globales, farm_id pour cultures personnalisées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des variétés de cultures
CREATE TABLE IF NOT EXISTS culture_varieties (
  id SERIAL PRIMARY KEY,
  culture_id INTEGER NOT NULL REFERENCES cultures(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- ex: "Tomate cerise", "Tomate beefsteak"
  description TEXT,
  typical_weight_kg DECIMAL(8,3), -- Poids typique en kg (pour les conversions)
  typical_volume_l DECIMAL(8,3), -- Volume typique en litres
  farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE, -- null pour variétés globales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(culture_id, name, farm_id) -- Une variété unique par culture et ferme
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_cultures_type ON cultures(type);
CREATE INDEX IF NOT EXISTS idx_cultures_category ON cultures(category);
CREATE INDEX IF NOT EXISTS idx_cultures_farm_id ON cultures(farm_id);
CREATE INDEX IF NOT EXISTS idx_culture_varieties_culture_id ON culture_varieties(culture_id);
CREATE INDEX IF NOT EXISTS idx_culture_varieties_farm_id ON culture_varieties(farm_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cultures_updated_at BEFORE UPDATE ON cultures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_culture_varieties_updated_at BEFORE UPDATE ON culture_varieties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de base pour les cultures communes
INSERT INTO cultures (name, type, category, description, color) VALUES
-- Légumes fruits
('Tomate', 'legume_fruit', 'recolte', 'Légume fruit rouge, base de nombreux plats', '#FF6B6B'),
('Courgette', 'legume_fruit', 'recolte', 'Légume fruit allongé, facile à cultiver', '#4ECDC4'),
('Aubergine', 'legume_fruit', 'recolte', 'Légume fruit violet, apprécié en ratatouille', '#9B59B6'),
('Poivron', 'legume_fruit', 'recolte', 'Légume fruit coloré, riche en vitamine C', '#F39C12'),
('Concombre', 'legume_fruit', 'recolte', 'Légume fruit rafraîchissant', '#2ECC71'),

-- Légumes feuilles
('Salade', 'legume_feuille', 'recolte', 'Légume feuille croquant', '#27AE60'),
('Épinard', 'legume_feuille', 'recolte', 'Légume feuille riche en fer', '#1ABC9C'),
('Chou', 'legume_feuille', 'recolte', 'Légume feuille dense', '#16A085'),
('Blette', 'legume_feuille', 'recolte', 'Légume feuille aux tiges colorées', '#E67E22'),

-- Légumes racines
('Carotte', 'legume_racine', 'recolte', 'Légume racine orange, riche en bêta-carotène', '#E67E22'),
('Radis', 'legume_racine', 'recolte', 'Légume racine piquant', '#E74C3C'),
('Betterave', 'legume_racine', 'recolte', 'Légume racine rouge foncé', '#8E44AD'),
('Navet', 'legume_racine', 'recolte', 'Légume racine blanc', '#ECF0F1'),

-- Céréales
('Blé', 'cereale', 'recolte', 'Céréale de base pour le pain', '#F1C40F'),
('Orge', 'cereale', 'recolte', 'Céréale rustique', '#D4AC0D'),
('Avoine', 'cereale', 'recolte', 'Céréale nutritive', '#B7950B'),

-- Légumineuses
('Haricot vert', 'legumineuse', 'recolte', 'Légumineuse verte et tendre', '#27AE60'),
('Petit pois', 'legumineuse', 'recolte', 'Légumineuse sucrée', '#2ECC71'),
('Fève', 'legumineuse', 'recolte', 'Légumineuse robuste', '#16A085'),

-- Aromates
('Basilic', 'aromate', 'recolte', 'Herbe aromatique méditerranéenne', '#27AE60'),
('Persil', 'aromate', 'recolte', 'Herbe aromatique commune', '#2ECC71'),
('Thym', 'aromate', 'recolte', 'Herbe aromatique persistante', '#16A085'),

-- Fruits
('Pomme', 'fruit', 'recolte', 'Fruit à pépins classique', '#E74C3C'),
('Poire', 'fruit', 'recolte', 'Fruit à pépins juteux', '#F1C40F'),
('Fraise', 'fruit', 'recolte', 'Petit fruit rouge', '#E91E63'),

-- Fleurs
('Tournesol', 'fleur', 'recolte', 'Fleur décorative et graines comestibles', '#F39C12'),
('Œillet', 'fleur', 'recolte', 'Fleur ornementale', '#E91E63')

ON CONFLICT (name) DO NOTHING;

-- Variétés communes pour quelques cultures
INSERT INTO culture_varieties (culture_id, name, description, typical_weight_kg, typical_volume_l) VALUES
-- Tomates
((SELECT id FROM cultures WHERE name = 'Tomate'), 'Tomate cerise', 'Petite tomate ronde', 0.015, 0.020),
((SELECT id FROM cultures WHERE name = 'Tomate'), 'Tomate grappe', 'Tomate de taille moyenne', 0.080, 0.090),
((SELECT id FROM cultures WHERE name = 'Tomate'), 'Tomate beefsteak', 'Grosse tomate charnue', 0.200, 0.180),
((SELECT id FROM cultures WHERE name = 'Tomate'), 'Tomate Roma', 'Tomate allongée pour sauce', 0.060, 0.070),

-- Courgettes
((SELECT id FROM cultures WHERE name = 'Courgette'), 'Courgette verte', 'Courgette classique', 0.300, 0.350),
((SELECT id FROM cultures WHERE name = 'Courgette'), 'Courgette jaune', 'Courgette dorée', 0.280, 0.330),
((SELECT id FROM cultures WHERE name = 'Courgette'), 'Pâtisson', 'Courgette ronde aplatie', 0.400, 0.450),

-- Carottes
((SELECT id FROM cultures WHERE name = 'Carotte'), 'Carotte Nantaise', 'Carotte courte et trapue', 0.080, 0.070),
((SELECT id FROM cultures WHERE name = 'Carotte'), 'Carotte de Colmar', 'Carotte longue et effilée', 0.120, 0.100),

-- Salades
((SELECT id FROM cultures WHERE name = 'Salade'), 'Laitue batavia', 'Salade croquante', 0.250, 0.400),
((SELECT id FROM cultures WHERE name = 'Salade'), 'Laitue iceberg', 'Salade très croquante', 0.300, 0.500),
((SELECT id FROM cultures WHERE name = 'Salade'), 'Roquette', 'Salade piquante', 0.100, 0.200)

ON CONFLICT (culture_id, name, farm_id) DO NOTHING;

-- RLS (Row Level Security) pour les cultures personnalisées
ALTER TABLE cultures ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_varieties ENABLE ROW LEVEL SECURITY;

-- Politique pour les cultures : tout le monde peut voir les cultures globales, seuls les membres de la ferme voient les cultures personnalisées
CREATE POLICY "Cultures globales visibles par tous" ON cultures
  FOR SELECT USING (farm_id IS NULL);

CREATE POLICY "Cultures personnalisées visibles par les membres de la ferme" ON cultures
  FOR SELECT USING (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = cultures.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

CREATE POLICY "Insertion cultures personnalisées par les membres" ON cultures
  FOR INSERT WITH CHECK (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = cultures.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

-- Politiques similaires pour les variétés
CREATE POLICY "Variétés globales visibles par tous" ON culture_varieties
  FOR SELECT USING (farm_id IS NULL);

CREATE POLICY "Variétés personnalisées visibles par les membres de la ferme" ON culture_varieties
  FOR SELECT USING (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = culture_varieties.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

CREATE POLICY "Insertion variétés personnalisées par les membres" ON culture_varieties
  FOR INSERT WITH CHECK (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = culture_varieties.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );



