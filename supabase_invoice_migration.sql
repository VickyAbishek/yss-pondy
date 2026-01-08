-- Invoice Number Feature Migration
-- Run this in your Supabase SQL Editor

-- Create sequence for invoice numbers (starting from 1)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Add invoice_number column to sales table with auto-increment
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS invoice_number INTEGER 
DEFAULT nextval('invoice_number_seq');

-- Add notes column if missing (some sales may have notes)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups by invoice number
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number 
ON public.sales(invoice_number);

-- Backfill existing sales with invoice numbers (if any exist without one)
-- This ensures all existing sales get a unique invoice number
UPDATE public.sales 
SET invoice_number = nextval('invoice_number_seq') 
WHERE invoice_number IS NULL;

-- Make invoice_number NOT NULL after backfill
ALTER TABLE public.sales 
ALTER COLUMN invoice_number SET NOT NULL;
