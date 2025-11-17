-- Add state column to airports table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'airports'
        AND column_name = 'state'
    ) THEN
        ALTER TABLE airports ADD COLUMN state VARCHAR(255);
        RAISE NOTICE 'Added state column to airports table';
    ELSE
        RAISE NOTICE 'Column state already exists in airports table';
    END IF;
END $$; 