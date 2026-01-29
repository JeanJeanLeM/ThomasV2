-- Migration: Ajout de la table documents
-- Date: 2024-11-21
-- Description: Création de la table pour stocker les documents des utilisateurs

-- Table des documents
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  farm_id integer NOT NULL,
  user_id uuid NOT NULL,
  name character varying NOT NULL CHECK (char_length(name::text) >= 2 AND char_length(name::text) <= 200),
  description text,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY[
    'analyse-sol'::character varying, 
    'certifications'::character varying, 
    'assurance'::character varying, 
    'contrats'::character varying, 
    'recus'::character varying, 
    'photos'::character varying, 
    'cartes'::character varying, 
    'manuels'::character varying, 
    'rapports'::character varying,
    'autre'::character varying
  ]::text[])),
  file_name character varying NOT NULL,
  file_type character varying NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  file_path character varying NOT NULL,
  mime_type character varying,
  storage_bucket character varying DEFAULT 'documents'::character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE,
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_documents_farm_id ON public.documents(farm_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs ne peuvent voir que les documents de leurs fermes
CREATE POLICY "Users can view documents from their farms" ON public.documents
  FOR SELECT USING (
    farm_id IN (
      SELECT fm.farm_id 
      FROM public.farm_members fm 
      WHERE fm.user_id = auth.uid() AND fm.is_active = true
    )
  );

-- Politique RLS : Les utilisateurs peuvent insérer des documents dans leurs fermes
CREATE POLICY "Users can insert documents in their farms" ON public.documents
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT fm.farm_id 
      FROM public.farm_members fm 
      WHERE fm.user_id = auth.uid() AND fm.is_active = true
    )
    AND user_id = auth.uid()
  );

-- Politique RLS : Les utilisateurs peuvent modifier leurs propres documents
CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Politique RLS : Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (user_id = auth.uid());

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_documents_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE public.documents IS 'Table des documents uploadés par les utilisateurs';
COMMENT ON COLUMN public.documents.category IS 'Catégorie du document (analyse-sol, certifications, etc.)';
COMMENT ON COLUMN public.documents.file_size IS 'Taille du fichier en bytes';
COMMENT ON COLUMN public.documents.storage_bucket IS 'Bucket Supabase Storage où est stocké le fichier';


