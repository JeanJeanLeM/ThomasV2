-- Migration: Add is_active columns for soft delete functionality
-- Date: 2026-01-07
-- Description: Add is_active boolean columns to tasks and observations tables for soft delete

-- Add is_active column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active column to observations table  
ALTER TABLE observations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_observations_is_active ON observations(is_active);

-- Update existing records to be active by default
UPDATE tasks SET is_active = true WHERE is_active IS NULL;
UPDATE observations SET is_active = true WHERE is_active IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN tasks.is_active IS 'Soft delete flag - false means deleted, true means active';
COMMENT ON COLUMN observations.is_active IS 'Soft delete flag - false means deleted, true means active';

