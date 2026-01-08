-- ===========================================
-- Sales Deletion Audit Table Migration
-- Run this in your Supabase SQL Editor
-- ===========================================

-- Create table to track deleted sales (audit trail)
CREATE TABLE IF NOT EXISTS public.deleted_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_sale_id uuid NOT NULL,
  invoice_number INTEGER,
  total_amount numeric NOT NULL,
  discount_applied numeric DEFAULT 0,
  sale_created_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz DEFAULT now(),
  deletion_reason text
);

-- Enable RLS
ALTER TABLE public.deleted_sales ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage deleted sales
CREATE POLICY "Deleted sales viewable by all" 
  ON deleted_sales FOR SELECT 
  USING (true);

CREATE POLICY "Deleted sales manageable by all" 
  ON deleted_sales FOR INSERT 
  WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deleted_sales_deleted_at 
ON public.deleted_sales(deleted_at);

COMMENT ON TABLE public.deleted_sales IS 'Audit trail for deleted sales records';

-- ===========================================
-- Add payment_method column to sales table
-- ===========================================
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
