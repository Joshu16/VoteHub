-- Cargos de mesa (JSON con claves: presidente, vicepresidente, tesorero, fiscal, secretario, fiscal1, fiscal2)
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS officers_json text;
