-- ===========================================
-- Offer System Migration for YSS Pondy
-- Run this migration on your Supabase database
-- ===========================================

-- Product-specific offers table
-- Links individual books to their special offers
CREATE TABLE IF NOT EXISTS public.book_offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  offer_name text NOT NULL,
  discount_percentage numeric NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(book_id)  -- One offer per book
);

-- Enable RLS for book_offers
ALTER TABLE public.book_offers ENABLE ROW LEVEL SECURITY;

-- Policies for book_offers
CREATE POLICY "Book offers viewable by all" 
  ON book_offers FOR SELECT 
  USING (true);

CREATE POLICY "Book offers manageable by all" 
  ON book_offers FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_offers_book_id ON public.book_offers(book_id);
CREATE INDEX IF NOT EXISTS idx_book_offers_is_active ON public.book_offers(is_active);

-- Add comment for documentation
COMMENT ON TABLE public.book_offers IS 'Product-specific offers that override general offers for individual books';
