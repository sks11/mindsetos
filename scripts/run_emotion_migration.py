#!/usr/bin/env python3
"""
Script to add emotion column to journal_entries table
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
        return False
    
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Read the SQL migration file
        with open('add_emotion_column.sql', 'r') as f:
            sql_commands = f.read()
        
        print("🔄 Running emotion column migration...")
        
        # Execute the SQL commands
        # Note: Supabase Python client doesn't have direct SQL execution
        # This would need to be run manually in the Supabase SQL editor
        print("📝 SQL commands to run in Supabase SQL editor:")
        print("=" * 50)
        print(sql_commands)
        print("=" * 50)
        
        print("✅ Migration script prepared. Please run the above SQL in your Supabase SQL editor.")
        return True
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    run_migration()
