-- Migração para suportar intervalos recorrentes 'todo dia'
-- Representação: day_of_week = 7

BEGIN;

-- Remove o constraint existente que limita day_of_week a 0-6
ALTER TABLE public.employee_intervals
  DROP CONSTRAINT IF EXISTS employee_intervals_day_of_week_check;

-- Adiciona novo constraint que permite 0-7 (onde 7 = todo dia)
ALTER TABLE public.employee_intervals
  ADD CONSTRAINT employee_intervals_day_of_week_check
  CHECK (
    (interval_type = 'single' AND day_of_week IS NULL)
    OR
    (interval_type = 'recurring' AND day_of_week BETWEEN 0 AND 7)
  );

COMMIT;
