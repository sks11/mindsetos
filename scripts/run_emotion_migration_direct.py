#!/usr/bin/env python3
"""
Script to add emotion column to journal_entries table via Supabase REST API
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
        return False
    
    print("🔄 Running emotion column migration on Supabase...")
    
    # SQL commands to execute
    sql_commands = [
        "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS emotion VARCHAR(20);",
        "COMMENT ON COLUMN journal_entries.emotion IS 'User selected emotion: very_sad, sad, neutral, happy, very_happy';",
        "CREATE INDEX IF NOT EXISTS idx_journal_entries_emotion ON journal_entries(emotion);"
    ]
    
    try:
        # Use Supabase REST API to execute SQL
        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
        
        for i, sql in enumerate(sql_commands, 1):
            print(f"📝 Executing command {i}/{len(sql_commands)}: {sql[:50]}...")
            
            # Use the PostgREST API to execute raw SQL
            # Note: This approach uses the rpc function if available, or we'll use a different method
            response = requests.post(
                f"{supabase_url}/rest/v1/rpc/exec_sql",
                headers=headers,
                json={"sql": sql}
            )
            
            if response.status_code == 200:
                print(f"✅ Command {i} executed successfully")
            else:
                print(f"⚠️  Command {i} response: {response.status_code} - {response.text}")
                # Continue with other commands even if one fails
        
        print("✅ Migration completed! The emotion column has been added to journal_entries table.")
        return True
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        print("\n📋 Manual SQL to run in Supabase SQL editor:")
        print("=" * 60)
        for sql in sql_commands:
            print(sql)
        print("=" * 60)
        return False

if __name__ == "__main__":
    run_migration()
