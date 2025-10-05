#!/usr/bin/env python3
"""
Script to create the personality_analyses table in Supabase
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_personality_table():
    """Create the personality_analyses table"""
    
    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_key:
        print("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        return False
    
    try:
        supabase = create_client(supabase_url, supabase_service_key)
        print("✅ Connected to Supabase")
        
        # SQL to create the personality_analyses table
        create_table_sql = """
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
        """
        
        # Create indexes
        index_sql = """
        CREATE INDEX IF NOT EXISTS idx_personality_analyses_user_email ON personality_analyses(user_email);
        CREATE INDEX IF NOT EXISTS idx_personality_analyses_date ON personality_analyses(analysis_date);
        CREATE INDEX IF NOT EXISTS idx_personality_analyses_analysis_id ON personality_analyses(analysis_id);
        """
        
        print("🔧 Creating personality_analyses table...")
        
        # Execute using Supabase's execute method directly
        try:
            # Try using raw SQL execution
            result = supabase.postgrest.session.post(
                f"{supabase_url}/rest/v1/rpc/exec_sql",
                json={"query": create_table_sql + index_sql},
                headers={
                    "Authorization": f"Bearer {supabase_service_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if result.status_code == 200:
                print("✅ Successfully created personality_analyses table and indexes")
                return True
            else:
                print(f"❌ Failed to create table: {result.status_code} - {result.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error executing SQL: {e}")
            
            # Try alternative approach - check if table exists by trying to query it
            try:
                # This will fail if table doesn't exist
                result = supabase.table("personality_analyses").select("count").limit(1).execute()
                print("✅ Table personality_analyses already exists")
                return True
            except Exception as check_error:
                print(f"❌ Table doesn't exist and couldn't be created: {check_error}")
                
                # Try using a simple insert to trigger table creation if it has auto-schema
                print("🔄 Attempting alternative table creation method...")
                try:
                    # This is a workaround - sometimes Supabase tables are created via the dashboard
                    print("Please create the personality_analyses table manually in the Supabase dashboard")
                    print("Schema:")
                    print(create_table_sql)
                    return False
                except Exception as alt_error:
                    print(f"❌ Alternative method failed: {alt_error}")
                    return False
        
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting personality_analyses table creation...")
    success = create_personality_table()
    
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        print("\nManual steps:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Run the SQL from scripts/create_personality_analyses_schema.sql")

