-- Migration: Add payment reminder tracking to bookings table
-- Purpose: Track last time a payment reminder was sent for each booking
-- This ensures we send max 1 reminder per day per booking

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS last_payment_reminder_sent_at TIMESTAMP WITH TIME ZONE NULL 
DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.last_payment_reminder_sent_at IS 
'Timestamp of the last payment reminder sent for this booking. Used to limit reminders to 1 per day.';

-- Create index for efficient queries in the daily reminder function
-- This index helps query bookings for reminder notifications
CREATE INDEX IF NOT EXISTS idx_bookings_payment_reminder 
ON public.bookings(booking_date, last_payment_reminder_sent_at);
