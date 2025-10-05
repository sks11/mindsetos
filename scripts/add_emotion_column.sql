-- Add emotion column to journal_entries table
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS emotion VARCHAR(20);

-- Add comment to explain the column
COMMENT ON COLUMN journal_entries.emotion IS 'User selected emotion: very_sad, sad, neutral, happy, very_happy';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_emotion ON journal_entries(emotion);
