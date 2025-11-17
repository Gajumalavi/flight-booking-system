-- Add airline column to flights table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'flights'
        AND column_name = 'airline'
    ) THEN
        ALTER TABLE flights ADD COLUMN airline VARCHAR(255) NOT NULL DEFAULT 'Unknown Airline';
        RAISE NOTICE 'Added airline column to flights table';
    ELSE
        RAISE NOTICE 'Column airline already exists in flights table';
    END IF;
END $$; 