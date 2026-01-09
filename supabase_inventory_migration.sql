-- Inventory Migration Script
-- Adds new columns, clears old data, and imports 518 products from Excel

-- ============================================
-- STEP 1: Add new columns to books table
-- ============================================

-- Add serial column (product serial code like "9030")
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS serial text;

-- Add product_id column (short code like "AYCE")
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS product_id text;

-- Add weight column (weight in grams)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS weight integer;

-- Add category column (like "BK" for books, "CD" for CDs, etc.)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category text;

-- ============================================
-- STEP 2: Clear existing data (in correct order for foreign keys)
-- WARNING: This will delete ALL sales history and books!
-- ============================================

-- First delete sale_items (references both sales and books)
DELETE FROM public.sale_items;

-- Then delete sales
DELETE FROM public.sales;

-- Then delete book_offers (references books)
DELETE FROM public.book_offers;

-- Finally delete all books
DELETE FROM public.books;

-- ============================================
-- STEP 3: Import new products
-- Run supabase_inventory_import.sql after this
-- ============================================


