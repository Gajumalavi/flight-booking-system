-- Add status column to flights table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'flights'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE flights ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED';
        RAISE NOTICE 'Added status column to flights table';
    ELSE
        RAISE NOTICE 'Column status already exists in flights table';
    END IF;
END $$; 