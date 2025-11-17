-- Populate the origin airport details for existing flights
UPDATE flights f
SET 
    origin_city = a.city,
    origin_name = a.name
FROM airports a
WHERE f.origin = a.code
AND (f.origin_city IS NULL OR f.origin_name IS NULL);

-- Populate the destination airport details for existing flights
UPDATE flights f
SET 
    destination_city = a.city,
    destination_name = a.name
FROM airports a
WHERE f.destination = a.code
AND (f.destination_city IS NULL OR f.destination_name IS NULL);

-- Log the results
DO $$
DECLARE
    updated_origin_count INTEGER;
    updated_destination_count INTEGER;
    remaining_origin_null INTEGER;
    remaining_destination_null INTEGER;
BEGIN
    -- Count updated records for origin
    SELECT COUNT(*) INTO updated_origin_count
    FROM flights
    WHERE origin_city IS NOT NULL AND origin_name IS NOT NULL;
    
    -- Count updated records for destination
    SELECT COUNT(*) INTO updated_destination_count
    FROM flights
    WHERE destination_city IS NOT NULL AND destination_name IS NOT NULL;
    
    -- Count remaining nulls for origin
    SELECT COUNT(*) INTO remaining_origin_null
    FROM flights
    WHERE origin_city IS NULL OR origin_name IS NULL;
    
    -- Count remaining nulls for destination
    SELECT COUNT(*) INTO remaining_destination_null
    FROM flights
    WHERE destination_city IS NULL OR destination_name IS NULL;
    
    RAISE NOTICE 'Updated origin details for % flights', updated_origin_count;
    RAISE NOTICE 'Updated destination details for % flights', updated_destination_count;
    RAISE NOTICE 'Remaining flights with missing origin details: %', remaining_origin_null;
    RAISE NOTICE 'Remaining flights with missing destination details: %', remaining_destination_null;
END $$; 