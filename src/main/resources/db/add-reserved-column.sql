-- Add reserved column to seats table with default value false
ALTER TABLE seats ADD COLUMN IF NOT EXISTS reserved BOOLEAN DEFAULT FALSE;

-- Update all existing records
UPDATE seats SET reserved = FALSE WHERE reserved IS NULL; 