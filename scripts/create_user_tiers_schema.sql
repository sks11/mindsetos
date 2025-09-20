-- Create user_tiers table to track subscription status and monthly message counts
CREATE TABLE IF NOT EXISTS user_tiers (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    messages_used_this_month INTEGER NOT NULL DEFAULT 0,
    messages_limit INTEGER NOT NULL DEFAULT 100,
    current_month_year VARCHAR(7) NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tiers_email ON user_tiers(user_email);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_tiers_updated_at 
    BEFORE UPDATE ON user_tiers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to reset monthly message counts
CREATE OR REPLACE FUNCTION reset_monthly_message_counts()
RETURNS void AS $$
BEGIN
    -- Reset message counts for users whose current_month_year is not the current month
    UPDATE user_tiers 
    SET 
        messages_used_this_month = 0,
        current_month_year = TO_CHAR(NOW(), 'YYYY-MM'),
        updated_at = NOW()
    WHERE current_month_year != TO_CHAR(NOW(), 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Create function to get or create user tier with monthly reset logic
CREATE OR REPLACE FUNCTION get_or_create_user_tier_with_reset(p_user_email VARCHAR)
RETURNS TABLE(
    id INTEGER,
    user_email VARCHAR,
    tier VARCHAR,
    messages_used_this_month INTEGER,
    messages_limit INTEGER,
    current_month_year VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_month VARCHAR(7) := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
    -- First, reset any users who need monthly reset
    PERFORM reset_monthly_message_counts();
    
    -- Try to get existing user tier
    RETURN QUERY
    SELECT ut.id, ut.user_email, ut.tier, ut.messages_used_this_month, 
           ut.messages_limit, ut.current_month_year, ut.created_at, ut.updated_at
    FROM user_tiers ut
    WHERE ut.user_email = p_user_email;
    
    -- If no user found, create one
    IF NOT FOUND THEN
        INSERT INTO user_tiers (user_email, tier, messages_used_this_month, messages_limit, current_month_year)
        VALUES (p_user_email, 'free', 0, 100, current_month);
        
        -- Return the newly created user
        RETURN QUERY
        SELECT ut.id, ut.user_email, ut.tier, ut.messages_used_this_month, 
               ut.messages_limit, ut.current_month_year, ut.created_at, ut.updated_at
        FROM user_tiers ut
        WHERE ut.user_email = p_user_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert default tier for existing users (if any)
-- This will be handled by the application logic
