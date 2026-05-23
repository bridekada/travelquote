-- Migration: Add actual_date (Actual Date of Transaction) to payments and disbursements
-- Created at: 2026-05-24

-- 1. Add actual_date column to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS actual_date DATE DEFAULT CURRENT_DATE;

-- 2. Add actual_date column to disbursements
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS actual_date DATE DEFAULT CURRENT_DATE;

-- 3. Backfill existing records with their creation date
UPDATE payments SET actual_date = COALESCE(actual_date, (created_at AT TIME ZONE 'UTC')::date);
UPDATE disbursements SET actual_date = COALESCE(actual_date, (created_at AT TIME ZONE 'UTC')::date);
