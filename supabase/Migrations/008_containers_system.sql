-- Migration 008: Système de contenants prédéfinis
-- Ajouter une table pour les contenants standardisés avec slugs pour la recherche

-- Table des contenants prédéfinis
CREATE TABLE IF NOT EXISTS containers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'recolte' ou 'intrant'
  type VARCHAR(50) NOT NULL, -- 'caisse', 'sac', 'bidon', 'brouette', 'panier', etc.
  description TEXT,
  typical_capacity_kg DECIMAL(8,3), -- Capacité typique en kg
  typical_capacity_l DECIMAL(8,3), -- Capacité typique en litres
  material VARCHAR(50), -- 'plastique', 'bois', 'metal', 'carton', etc.
  dimensions_cm VARCHAR(100), -- ex: "40x30x20"
  color VARCHAR(7), -- Code couleur hex
  slugs TEXT[] DEFAULT '{}', -- Mots-clés pour la recherche (synonymes, variantes)
  is_custom BOOLEAN DEFAULT false, -- true si ajouté par un utilisateur
  farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE, -- null pour contenants globaux
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, farm_id) -- Un contenant unique par nom et ferme
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_containers_category ON containers(category);
CREATE INDEX IF NOT EXISTS idx_containers_type ON containers(type);
CREATE INDEX IF NOT EXISTS idx_containers_farm_id ON containers(farm_id);
CREATE INDEX IF NOT EXISTS idx_containers_slugs ON containers USING GIN(slugs);

-- Trigger pour updated_at
CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données prédéfinies pour les contenants courants
INSERT INTO containers (name, category, type, description, typical_capacity_kg, typical_capacity_l, material, dimensions_cm, color, slugs) VALUES

-- CONTENANTS RÉCOLTE
-- Caisses
('Caisse plastique standard', 'recolte', 'caisse', 'Caisse plastique pour fruits et légumes', 15.0, 20.0, 'plastique', '60x40x20', '#4ECDC4', 
 ARRAY['caisse', 'bac', 'cagette', 'plastique', 'standard']),
('Caisse bois petite', 'recolte', 'caisse', 'Petite caisse en bois pour fruits délicats', 5.0, 8.0, 'bois', '30x20x15', '#D4A574', 
 ARRAY['caisse', 'cagette', 'bois', 'petite', 'fruits']),
('Caisse bois grande', 'recolte', 'caisse', 'Grande caisse en bois pour légumes', 25.0, 35.0, 'bois', '80x60x25', '#D4A574', 
 ARRAY['caisse', 'cagette', 'bois', 'grande', 'légumes']),
('Cagette carton', 'recolte', 'caisse', 'Cagette en carton jetable', 3.0, 5.0, 'carton', '40x30x10', '#F4A460', 
 ARRAY['cagette', 'carton', 'jetable', 'barquette']),

-- Paniers
('Panier osier petit', 'recolte', 'panier', 'Petit panier en osier traditionnel', 2.0, 4.0, 'osier', '25x25x15', '#DEB887', 
 ARRAY['panier', 'osier', 'petit', 'traditionnel', 'vannerie']),
('Panier osier grand', 'recolte', 'panier', 'Grand panier en osier pour récolte', 8.0, 15.0, 'osier', '50x40x25', '#DEB887', 
 ARRAY['panier', 'osier', 'grand', 'récolte', 'vannerie']),
('Panier plastique', 'recolte', 'panier', 'Panier plastique ajouré', 5.0, 8.0, 'plastique', '40x30x20', '#32CD32', 
 ARRAY['panier', 'plastique', 'ajouré', 'perforé']),

-- Sacs récolte
('Sac jute petit', 'recolte', 'sac', 'Petit sac en jute naturelle', 10.0, NULL, 'jute', '40x60', '#8FBC8F', 
 ARRAY['sac', 'jute', 'toile', 'petit', 'naturel']),
('Sac jute grand', 'recolte', 'sac', 'Grand sac en jute pour céréales', 50.0, NULL, 'jute', '70x120', '#8FBC8F', 
 ARRAY['sac', 'jute', 'toile', 'grand', 'céréales', 'grains']),
('Sac filet', 'recolte', 'sac', 'Sac filet pour légumes', 5.0, NULL, 'plastique', '50x80', '#FF6347', 
 ARRAY['sac', 'filet', 'maille', 'légumes', 'oignons', 'pommes de terre']),

-- Seaux
('Seau plastique 10L', 'recolte', 'seau', 'Seau plastique avec anse', 8.0, 10.0, 'plastique', 'Ø30x25', '#4169E1', 
 ARRAY['seau', 'plastique', '10L', 'anse', 'fruits rouges']),
('Seau métal', 'recolte', 'seau', 'Seau en métal galvanisé', 12.0, 15.0, 'metal', 'Ø35x30', '#C0C0C0', 
 ARRAY['seau', 'métal', 'galvanisé', 'zinc', 'traditionnel']),

-- CONTENANTS INTRANTS
-- Sacs intrants
('Sac engrais 25kg', 'intrant', 'sac', 'Sac standard pour engrais', 25.0, NULL, 'plastique', '50x80', '#FF4500', 
 ARRAY['sac', 'engrais', '25kg', 'fertilisant', 'plastique']),
('Sac engrais 50kg', 'intrant', 'sac', 'Grand sac pour engrais', 50.0, NULL, 'plastique', '70x120', '#FF4500', 
 ARRAY['sac', 'engrais', '50kg', 'fertilisant', 'grand']),
('Sac semences', 'intrant', 'sac', 'Petit sac pour semences', 1.0, NULL, 'papier', '20x30', '#90EE90', 
 ARRAY['sac', 'semences', 'graines', 'papier', 'petit']),

-- Bidons
('Bidon plastique 5L', 'intrant', 'bidon', 'Bidon plastique avec bouchon', NULL, 5.0, 'plastique', 'Ø20x30', '#1E90FF', 
 ARRAY['bidon', 'plastique', '5L', 'liquide', 'produit']),
('Bidon plastique 20L', 'intrant', 'bidon', 'Grand bidon pour produits liquides', NULL, 20.0, 'plastique', 'Ø30x50', '#1E90FF', 
 ARRAY['bidon', 'plastique', '20L', 'liquide', 'grand', 'jerrycan']),
('Bidon métal 10L', 'intrant', 'bidon', 'Bidon métallique étanche', NULL, 10.0, 'metal', 'Ø25x40', '#708090', 
 ARRAY['bidon', 'métal', '10L', 'étanche', 'carburant']),

-- Brouettes et outils de transport
('Brouette standard', 'intrant', 'brouette', 'Brouette de chantier standard', 100.0, 80.0, 'metal', '150x60x60', '#8B4513', 
 ARRAY['brouette', 'transport', 'standard', 'chantier', 'métal']),
('Brouette légère', 'intrant', 'brouette', 'Brouette légère pour jardinage', 50.0, 40.0, 'plastique', '120x50x50', '#32CD32', 
 ARRAY['brouette', 'légère', 'jardinage', 'plastique', 'petite']),

-- Pulvérisateurs
('Pulvérisateur à dos 15L', 'intrant', 'pulverisateur', 'Pulvérisateur à porter sur le dos', NULL, 15.0, 'plastique', '40x20x60', '#FF1493', 
 ARRAY['pulvérisateur', 'dos', '15L', 'traitement', 'portable']),
('Pulvérisateur tracteur 100L', 'intrant', 'pulverisateur', 'Pulvérisateur pour tracteur', NULL, 100.0, 'plastique', '100x60x80', '#FF1493', 
 ARRAY['pulvérisateur', 'tracteur', '100L', 'grand', 'attelé']),

-- Épandeurs
('Épandeur centrifuge', 'intrant', 'epandeur', 'Épandeur centrifuge pour engrais', 300.0, NULL, 'metal', '150x100x80', '#FFD700', 
 ARRAY['épandeur', 'centrifuge', 'engrais', 'tracteur', 'fertilisant']),
('Épandeur manuel', 'intrant', 'epandeur', 'Épandeur manuel à pousser', 25.0, NULL, 'plastique', '80x40x60', '#FFD700', 
 ARRAY['épandeur', 'manuel', 'pousser', 'petit', 'jardinage'])

ON CONFLICT (name, farm_id) DO NOTHING;

-- RLS (Row Level Security)
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

-- Politique pour les contenants : tout le monde peut voir les contenants globaux, seuls les membres de la ferme voient les contenants personnalisés
CREATE POLICY "Contenants globaux visibles par tous" ON containers
  FOR SELECT USING (farm_id IS NULL);

CREATE POLICY "Contenants personnalisés visibles par les membres de la ferme" ON containers
  FOR SELECT USING (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = containers.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

CREATE POLICY "Insertion contenants personnalisés par les membres" ON containers
  FOR INSERT WITH CHECK (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = containers.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

-- Mise à jour de la table user_conversion_units pour ajouter des slugs
ALTER TABLE user_conversion_units 
ADD COLUMN IF NOT EXISTS slugs TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS container_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Index pour les slugs dans user_conversion_units
CREATE INDEX IF NOT EXISTS idx_user_conversion_units_slugs ON user_conversion_units USING GIN(slugs);



