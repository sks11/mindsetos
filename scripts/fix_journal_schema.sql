-- Allow NULL values for analysis fields to support thoughts without analysis
ALTER TABLE journal_entries 
ALTER COLUMN limiting_belief DROP NOT NULL,
ALTER COLUMN explanation DROP NOT NULL,
ALTER COLUMN reframing_exercise DROP NOT NULL; 