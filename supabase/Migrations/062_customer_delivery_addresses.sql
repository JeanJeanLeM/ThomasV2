-- Migration 062: Adresses de livraison pour les clients
-- Date: 2026-02-13
-- Description: Ajoute une colonne JSONB delivery_addresses sur customers pour gérer plusieurs adresses (ex. livraison).

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS delivery_addresses JSONB DEFAULT '[]';

COMMENT ON COLUMN customers.delivery_addresses IS 'Liste d''adresses additionnelles (ex. livraison). Format: [{"label":"Livraison","address":"...","postal_code":"...","city":"..."}]';
