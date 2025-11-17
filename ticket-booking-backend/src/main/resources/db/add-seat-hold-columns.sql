-- Add seat hold columns to the seats table
DO $$
BEGIN
    -- Check if hold_until column exists and add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'seats' 
        AND column_name = 'hold_until'
    ) THEN
        ALTER TABLE seats ADD COLUMN hold_until TIMESTAMP;
        RAISE NOTICE 'Added hold_until column to seats table';
    ELSE
        RAISE NOTICE 'Column hold_until already exists in seats table';
    END IF;

    -- Check if held_by column exists and add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'seats' 
        AND column_name = 'held_by'
    ) THEN
        ALTER TABLE seats ADD COLUMN held_by BIGINT;
        RAISE NOTICE 'Added held_by column to seats table';
    ELSE
        RAISE NOTICE 'Column held_by already exists in seats table';
    END IF;
END $$; 