-- Add upsell_sent tracking to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS upsell_sent boolean DEFAULT false;
