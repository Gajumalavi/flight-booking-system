-- Add airport detail columns to flights table if they don't exist
DO $$
BEGIN
    -- Add origin_city column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'flights'
        AND column_name = 'origin_city'
    ) THEN
        ALTER TABLE flights ADD COLUMN origin_city VARCHAR(255);
        RAISE NOTICE 'Added origin_city column to flights table';
    ELSE
        RAISE NOTICE 'Column origin_city already exists in flights table';
    END IF;

    -- Add origin_name column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'flights'
        AND column_name = 'origin_name'
    ) THEN
        ALTER TABLE flights ADD COLUMN origin_name VARCHAR(255);
        RAISE NOTICE 'Added origin_name column to flights table';
    ELSE
        RAISE NOTICE 'Column origin_name already exists in flights table';
    END IF;

    -- Add destination_city column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'flights'
        AND column_name = 'destination_city'
    ) THEN
        ALTER TABLE flights ADD COLUMN destination_city VARCHAR(255);
        RAISE NOTICE 'Added destination_city column to flights table';
    ELSE
        RAISE NOTICE 'Column destination_city already exists in flights table';
    END IF;

    -- Add destination_name column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'flights'
        AND column_name = 'destination_name'
    ) THEN
        ALTER TABLE flights ADD COLUMN destination_name VARCHAR(255);
        RAISE NOTICE 'Added destination_name column to flights table';
    ELSE
        RAISE NOTICE 'Column destination_name already exists in flights table';
    END IF;
END $$; 