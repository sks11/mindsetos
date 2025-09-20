#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from supabase import create_client
import sys

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_service_role_key:
    print("ERROR: Supabase credentials not found in environment variables")
    sys.exit(1)

supabase = create_client(supabase_url, supabase_service_role_key)

def check_and_create_table():
    """Check if personality_analyses table exists and create it if not"""
    try:
        # Try to query the table to see if it exists
        result = supabase.table("personality_analyses").select("count").limit(1).execute()
        print("✅ Table 'personality_analyses' already exists")
        return True
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e):
            print("❌ Table 'personality_analyses' does not exist. Creating it...")
            return create_table()
        else:
            print(f"❌ Error checking table: {e}")
            return False

def create_table():
    """Create the personality_analyses table"""
    try:
        # SQL to create the table
        sql = """
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
        
        CREATE INDEX IF NOT EXISTS idx_personality_analyses_user_email ON personality_analyses(user_email);
        CREATE INDEX IF NOT EXISTS idx_personality_analyses_date ON personality_analyses(analysis_date);
        CREATE INDEX IF NOT EXISTS idx_personality_analyses_analysis_id ON personality_analyses(analysis_id);
        """
        
        # Execute the SQL
        result = supabase.rpc('exec_sql', {'sql': sql}).execute()
        print("✅ Successfully created personality_analyses table")
        return True
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        return False

def test_insert():
    """Test inserting a sample record"""
    try:
        import uuid
        from datetime import datetime
        
        test_record = {
            "analysis_id": str(uuid.uuid4()),
            "user_email": "test@example.com",
            "total_entries": 5,
            "analysis_date": datetime.now().isoformat(),
            "value_system": "Test value system",
            "motivators": "Test motivators",
            "demotivators": "Test demotivators",
            "emotional_triggers": "Test triggers",
            "mindset_blocks": "Test blocks",
            "growth_opportunities": "Test opportunities",
            "overall_summary": "Test summary"
        }
        
        result = supabase.table("personality_analyses").insert(test_record).execute()
        
        if result.data:
            print("✅ Successfully inserted test record")
            
            # Clean up - delete the test record
            supabase.table("personality_analyses").delete().eq("user_email", "test@example.com").execute()
            print("✅ Cleaned up test record")
            return True
        else:
            print("❌ Failed to insert test record")
            return False
            
    except Exception as e:
        print(f"❌ Error testing insert: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing Personality Analysis Database Setup")
    print("=" * 50)
    
    print("\n1. Checking database connection...")
    try:
        # Test basic connection
        result = supabase.table("user_tiers").select("count").limit(1).execute()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    print("\n2. Checking personality_analyses table...")
    if check_and_create_table():
        print("\n3. Testing table operations...")
        if test_insert():
            print("\n🎉 All tests passed! Personality analysis should work now.")
        else:
            print("\n❌ Table operations failed")
    else:
        print("\n❌ Failed to create table")
