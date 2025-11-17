-- Drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Re-create the constraint with all valid statuses
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'PAID'));

-- Verify existing status values
SELECT id, status FROM bookings; 