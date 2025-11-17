-- Database Schema Update Script (For Reference Only)
-- This script was used to add the 'booked' column to the seats table
-- and set default values. Keep for documentation purposes.

-- Check if booked column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'seats' 
        AND column_name = 'booked'
    ) THEN
        ALTER TABLE seats ADD COLUMN booked BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Added booked column to seats table';
    ELSE
        RAISE NOTICE 'Column booked already exists in seats table';
    END IF;
END $$;

-- Update any NULL values to false
UPDATE seats SET booked = false WHERE booked IS NULL;

-- Reset all seats to available and not booked (for testing)
-- UPDATE seats SET available = true, booked = false; 