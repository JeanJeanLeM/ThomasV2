-- Migration: Ajouter latest_active_farm_id au profil utilisateur
-- Cette colonne permet de mémoriser la dernière ferme active de l'utilisateur
-- pour une initialisation rapide et prévisible

-- Ajouter la colonne latest_active_farm_id avec référence vers farms
ALTER TABLE public.profiles 
ADD COLUMN latest_active_farm_id INTEGER REFERENCES public.farms(id) ON DELETE SET NULL;

-- Index pour optimiser les requêtes de récupération du profil avec ferme active
CREATE INDEX profiles_latest_active_farm_idx ON public.profiles(latest_active_farm_id);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.profiles.latest_active_farm_id IS 'ID de la dernière ferme active sélectionnée par l''utilisateur';
