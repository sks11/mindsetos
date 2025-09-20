-- Create personality_analyses table for storing personality analysis results
CREATE TABLE IF NOT EXISTS personality_analyses (
    id SERIAL PRIMARY KEY,
    analysis_id UUID UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    total_entries INTEGER NOT NULL,
    analysis_date TIMESTAMP WITH TIME ZONE NOT NULL,
    value_system TEXT NOT NULL,
    motivators TEXT NOT NULL,
    demotivators TEXT NOT NULL,
    emotional_triggers TEXT NOT NULL,
    mindset_blocks TEXT NOT NULL,
    growth_opportunities TEXT NOT NULL,
    overall_summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_email for faster queries
CREATE INDEX IF NOT EXISTS idx_personality_analyses_user_email ON personality_analyses(user_email);

-- Create index on analysis_date for chronological ordering
CREATE INDEX IF NOT EXISTS idx_personality_analyses_date ON personality_analyses(analysis_date);

-- Create index on analysis_id for unique lookups
CREATE INDEX IF NOT EXISTS idx_personality_analyses_analysis_id ON personality_analyses(analysis_id);

-- Add RLS (Row Level Security) policy if needed
ALTER TABLE personality_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own analyses
CREATE POLICY IF NOT EXISTS "Users can view their own personality analyses" 
ON personality_analyses FOR SELECT 
USING (auth.jwt() ->> 'email' = user_email);

-- Create policy to allow users to insert their own analyses
CREATE POLICY IF NOT EXISTS "Users can insert their own personality analyses" 
ON personality_analyses FOR INSERT 
WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Add comments for documentation
COMMENT ON TABLE personality_analyses IS 'Stores comprehensive personality analysis results based on user journal entries';
COMMENT ON COLUMN personality_analyses.analysis_id IS 'Unique identifier for each personality analysis';
COMMENT ON COLUMN personality_analyses.user_email IS 'Email of the user who owns this analysis';
COMMENT ON COLUMN personality_analyses.total_entries IS 'Number of journal entries used for this analysis';
COMMENT ON COLUMN personality_analyses.value_system IS 'Core values and principles that guide the person';
COMMENT ON COLUMN personality_analyses.motivators IS 'What energizes and drives the person forward';
COMMENT ON COLUMN personality_analyses.demotivators IS 'What drains energy and creates resistance';
COMMENT ON COLUMN personality_analyses.emotional_triggers IS 'Situations that create strong emotional reactions';
COMMENT ON COLUMN personality_analyses.mindset_blocks IS 'Mental barriers and limiting beliefs';
COMMENT ON COLUMN personality_analyses.growth_opportunities IS 'Key areas for personal development';
COMMENT ON COLUMN personality_analyses.overall_summary IS 'Holistic view of personality and mindset patterns';
