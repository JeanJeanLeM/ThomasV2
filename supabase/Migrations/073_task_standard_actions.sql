-- Migration 073: Table de référence des actions standard pour les tâches
-- Les codes sont stables (snake_case infinitif sans accent).
-- Le LLM choisit parmi cette liste ; évolutions = ajout/désactivation de lignes ici.

-- ============================================================================
-- 1. Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_standard_actions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64)   NOT NULL,
  label_fr    VARCHAR(120)  NOT NULL,
  description TEXT,                         -- synonymes / précisions pour le LLM et l'UI
  category    VARCHAR(32)   NOT NULL DEFAULT 'production'
              CHECK (category IN ('production', 'commercialisation', 'administratif', 'general')),
  sort_order  INT           NOT NULL DEFAULT 0,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT task_standard_actions_code_key UNIQUE (code)
);

CREATE INDEX idx_tsa_active_sort ON public.task_standard_actions (is_active, sort_order, code);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_task_standard_actions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_tsa_updated_at
  BEFORE UPDATE ON public.task_standard_actions
  FOR EACH ROW EXECUTE FUNCTION update_task_standard_actions_updated_at();

-- ============================================================================
-- 2. RLS — lecture pour tout utilisateur authentifié
-- ============================================================================

ALTER TABLE public.task_standard_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task_standard_actions"
  ON public.task_standard_actions
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. Seed — liste initiale des actions standard
-- (format : code, label_fr, description, category, sort_order)
-- ============================================================================

INSERT INTO public.task_standard_actions (code, label_fr, description, category, sort_order) VALUES

  -- Production — récolte
  ('recolter',           'Récolter',             'Cueillir, ramasser, couper pour récolter, récupérer la production', 'production', 10),
  ('cueillir',           'Cueillir',             'Cueillette manuelle fruit à fruit (fraises, framboises…)', 'production', 11),

  -- Production — préparation sol / semis / plantation
  ('labourer',           'Labourer',             'Labourer, retourner la terre, passer la charrue', 'production', 20),
  ('fraiser',            'Fraiser / préparer le sol', 'Passer la fraise, herse rotative, préparer le lit de semence', 'production', 21),
  ('semer',              'Semer',                'Semis direct en pleine terre ou en plateau', 'production', 22),
  ('planter',            'Planter',              'Repiquer, transplanter, mettre en place les plants', 'production', 23),

  -- Production — entretien culture
  ('desherber',          'Désherber',            'Sarclage, binage, désherbage manuel ou mécanique', 'production', 30),
  ('biner',              'Biner',                'Passage du binage inter-rang', 'production', 31),
  ('butter',             'Butter',               'Buttage, ramener de la terre autour des plantes', 'production', 32),
  ('tailler',            'Tailler',              'Tailler, ébourgeonner, enlever les gourmands, couper les branches', 'production', 33),
  ('eclaircir',          'Éclaircir',            'Éclaircissage des fruits ou plants excédentaires', 'production', 34),
  ('attacher',           'Attacher / tuteurer',  'Tuteurage, attacher, palisser, ficeler les tiges', 'production', 35),
  ('arroser',            'Arroser',              'Arrosage manuel, irrigation manuelle', 'production', 36),
  ('irriguer',           'Irriguer',             'Mise en route irrigation goutte-à-goutte, aspersion, submersion', 'production', 37),

  -- Production — protection / traitement
  ('traiter',            'Traiter',              'Application phytosanitaire, traitement fongicide, insecticide, herbicide', 'production', 40),
  ('fertiliser',         'Fertiliser',           'Épandage engrais, fertilisation, apport de nutriments', 'production', 41),
  ('amender',            'Amender le sol',       'Apport fumier, compost, chaux, amendement organique ou minéral', 'production', 42),
  ('mulcher',            'Pailler / mulcher',    'Pose de paillage, film plastique, toile de paillage', 'production', 43),

  -- Production — conduite serre / structures
  ('ouvrir_serre',       'Ouvrir la serre',      'Ouvrir les fenêtres, portes, aérer la serre', 'production', 50),
  ('fermer_serre',       'Fermer la serre',      'Fermer les ouvrants de la serre', 'production', 51),
  ('installer',          'Installer / poser',    'Poser filets, bâches, tunnels, clôtures, supports', 'production', 52),
  ('retirer',            'Retirer / enlever',    'Enlever bâches, tuteurs, filets, résidus de culture', 'production', 53),

  -- Production — nettoyage / rangement
  ('nettoyer',           'Nettoyer',             'Nettoyage serre, abri, outils, matériel, hangar', 'production', 60),
  ('trier',              'Trier',                'Triage des produits, éliminer les mauvaises herbes ramassées', 'production', 61),
  ('composter',          'Composter',            'Retourner le tas, apporter des déchets verts', 'production', 62),

  -- Production — animaux / élevage
  ('nourrir',            'Nourrir',              'Donner à manger aux animaux, distribuer la ration', 'production', 70),
  ('soigner',            'Soigner',              'Soins vétérinaires, vaccination, vermifugation', 'production', 71),
  ('recolter_oeufs',     'Ramasser les œufs',    'Ramassage quotidien des œufs', 'production', 72),
  ('tondre',             'Tondre',               'Tonte de l''herbe, passage tondeuse ou fauche', 'production', 73),
  ('faucher',            'Faucher',              'Fauchage des haies, fossés, allées', 'production', 74),

  -- Commercialisation
  ('preparer_commande',  'Préparer les commandes', 'Conditionner, peser, emballer les produits pour la vente', 'commercialisation', 80),
  ('livrer',             'Livrer',               'Livraison client, dépôt en point relais, marché', 'commercialisation', 81),
  ('vendre',             'Vendre',               'Vente directe, stand marché, vente à la ferme', 'commercialisation', 82),
  ('conditionner',       'Conditionner',         'Mise en barquette, barils, cagettes, packaging', 'commercialisation', 83),

  -- Administratif
  ('facturer',           'Facturer',             'Créer ou envoyer une facture', 'administratif', 90),
  ('inventorier',        'Inventorier',          'Faire l''inventaire du stock, compter', 'administratif', 91),
  ('declarer',           'Déclarer',             'Déclaration PAC, phyto, douane, registre', 'administratif', 92),
  ('planifier',          'Planifier',            'Planification, organisation, réunion, formation', 'administratif', 93),

  -- Général / maintenance
  ('reparer',            'Réparer',              'Réparer un outil, engin, équipement', 'general', 100),
  ('entretenir',         'Entretenir',           'Entretien préventif, vidange, graissage, contrôle', 'general', 101),
  ('transporter',        'Transporter',          'Déplacer des marchandises, matériaux, matériel', 'general', 102),
  ('surveiller',         'Surveiller',           'Surveillance, ronde, observation générale', 'general', 103),

  -- Fourre-tout (dernier recours pour le LLM)
  ('autre',              'Autre',                'Action non couverte par les codes existants', 'general', 999)

ON CONFLICT (code) DO UPDATE SET
  label_fr    = EXCLUDED.label_fr,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  sort_order  = EXCLUDED.sort_order,
  updated_at  = NOW();

-- ============================================================================
-- 4. Commentaires
-- ============================================================================

COMMENT ON TABLE  public.task_standard_actions IS 'Référentiel des actions standard pour les tâches agricoles. Le LLM choisit parmi ces codes via task_extraction.';
COMMENT ON COLUMN public.task_standard_actions.code        IS 'Identifiant stable en snake_case / infinitif sans accent (ex: recolter, tailler). Utilisé comme FK dans tasks.standard_action.';
COMMENT ON COLUMN public.task_standard_actions.label_fr    IS 'Libellé affiché à l''utilisateur';
COMMENT ON COLUMN public.task_standard_actions.description IS 'Synonymes et précisions pour guider le LLM et l''UI';
COMMENT ON COLUMN public.task_standard_actions.category    IS 'Catégorie de la tâche standard';
COMMENT ON COLUMN public.task_standard_actions.is_active   IS 'false = code retiré de la liste proposée au LLM (mais conservé pour historique)';
