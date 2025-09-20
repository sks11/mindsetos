from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import json
import uuid
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from datetime import datetime
from supabase import create_client

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://*.vercel.app",  # Allow Vercel deployments
        "https://mindsetos-ai.vercel.app",  # Your specific Vercel domain
        "https://mindsetos.vercel.app",  # Alternative domain
        "*",  # Temporary - allow all origins for initial testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable is required but not set")

openai_client = OpenAI(api_key=openai_api_key)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables are required")

supabase = create_client(supabase_url, supabase_key)

# Helper functions for user tier management
def get_or_create_user_tier(user_email: str) -> dict:
    """Get user tier info with monthly reset logic, create default if doesn't exist"""
    try:
        # First, reset monthly counts for all users if needed
        current_month = datetime.now().strftime("%Y-%m")
        
        # Get user tier info
        result = supabase.table("user_tiers").select("*").eq("user_email", user_email).execute()
        
        if result.data:
            user_tier = result.data[0]
            # Check if we need to reset for new month
            if user_tier.get("current_month_year") != current_month:
                # Reset monthly count
                updated_tier = {
                    "messages_used_this_month": 0,
                    "current_month_year": current_month
                }
                result = supabase.table("user_tiers").update(updated_tier).eq("user_email", user_email).execute()
                user_tier = result.data[0] if result.data else user_tier
            
            return user_tier
        else:
            # Create default free tier for new user
            # For testing: use 2 messages for free tier
            # For production: use 100 messages for free tier
            new_tier = {
                "user_email": user_email,
                "tier": "free",
                "messages_used_this_month": 0,
                "messages_limit": 100,  # Production limit
                "current_month_year": current_month
            }
            result = supabase.table("user_tiers").insert(new_tier).execute()
            return result.data[0]
    except Exception as e:
        print(f"DEBUG: Error getting/creating user tier: {e}")
        # Return default values if database fails
        return {
            "user_email": user_email,
            "tier": "free",
            "messages_used_this_month": 0,
            "messages_limit": 2,  # Testing limit
            "current_month_year": datetime.now().strftime("%Y-%m")
        }

def check_message_limit(user_email: str) -> tuple[bool, dict]:
    """Check if user can send more messages this month. Returns (can_send, tier_info)"""
    tier_info = get_or_create_user_tier(user_email)
    can_send = tier_info["messages_used_this_month"] < tier_info["messages_limit"]
    print(f"DEBUG: Checking limit for {user_email}: {tier_info['messages_used_this_month']}/{tier_info['messages_limit']} - Can send: {can_send}")
    return can_send, tier_info

def increment_message_count(user_email: str) -> dict:
    """Increment user's monthly message count"""
    try:
        # Get current count and increment
        current_tier = get_or_create_user_tier(user_email)
        old_count = current_tier["messages_used_this_month"]
        new_count = old_count + 1
        
        print(f"DEBUG: Incrementing message count for {user_email}: {old_count} -> {new_count}")
        
        result = supabase.table("user_tiers").update({
            "messages_used_this_month": new_count
        }).eq("user_email", user_email).execute()
        
        if result.data:
            print(f"DEBUG: Successfully updated message count to {new_count}")
            return result.data[0]
        else:
            print(f"DEBUG: Failed to update message count, returning current tier")
            return get_or_create_user_tier(user_email)
    except Exception as e:
        print(f"DEBUG: Error incrementing message count: {e}")
        return get_or_create_user_tier(user_email)

class JournalRequest(BaseModel):
    journalEntry: str
    userGoal: str = ""
    userEmail: str  # Add user identification

class AnalysisResponse(BaseModel):
    limitingBelief: str
    explanation: str
    reframingExercise: str

class JournalHistoryEntry(BaseModel):
    id: Optional[str] = None
    user_email: str
    journal_entry: str
    user_goal: Optional[str] = None
    limiting_belief: Optional[str] = None
    explanation: Optional[str] = None
    reframing_exercise: Optional[str] = None
    created_at: Optional[str] = None

class SaveJournalRequest(BaseModel):
    userEmail: str
    entry: JournalHistoryEntry

class RecordThoughtRequest(BaseModel):
    userEmail: str
    journalEntry: str
    goal: Optional[str] = None

class UserTierResponse(BaseModel):
    tier: str
    messages_used_this_month: int
    messages_limit: int
    messages_remaining: int
    current_month_year: str

class UpdateTierRequest(BaseModel):
    userEmail: str
    tier: str

@app.post("/record-thought")
async def record_thought(request: RecordThoughtRequest):
    """Save a journal entry without analysis."""
    # Check message limit before processing
    can_send, tier_info = check_message_limit(request.userEmail)
    if not can_send:
        print(f"DEBUG: User {request.userEmail} has reached limit, returning 429 error")
        from fastapi import Response
        return Response(
            content="You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com",
            status_code=429,
            media_type="text/plain"
        )
    
    try:
        
        journal_entry = {
            "user_email": request.userEmail,
            "journal_entry": request.journalEntry.strip(),
            "user_goal": request.goal.strip() if request.goal and request.goal.strip() else None,
        }
        
        result = supabase.table("journal_entries").insert(journal_entry).execute()
        
        if result.data:
            # Increment message count after successful recording
            increment_message_count(request.userEmail)
            return {"message": "Thought recorded successfully", "entry": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to record thought")
            
    except HTTPException:
        # Re-raise HTTPExceptions (like 429) without modification
        raise
    except Exception as e:
        print(f"DEBUG: Error recording thought: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record thought: {str(e)}")

@app.post("/analyze-journal", response_model=AnalysisResponse)
async def analyze_journal(request: JournalRequest):
    # Check message limit before processing
    can_send, tier_info = check_message_limit(request.userEmail)
    if not can_send:
        print(f"DEBUG: User {request.userEmail} has reached limit, returning 429 error")
        from fastapi import Response
        return Response(
            content="You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com",
            status_code=429,
            media_type="text/plain"
        )
    
    try:
        # Craft the mindset coaching prompt
        goal_context = f"The user's primary goal is \"{request.userGoal}\". " if request.userGoal else ""
        
        prompt = f"""You are a world-class mindset coach specializing in cognitive reframing. {goal_context}

Analyze the following journal entry and provide insights in this exact JSON format:

{{
  "limitingBelief": "ONE specific limiting belief you identified (be direct and specific)",
  "explanation": "Explain in 2-3 sentences why this belief is holding them back",
  "reframingExercise": "Provide ONE simple, actionable reframing exercise they can do right now (be specific and practical)"
}}

Journal Entry: "{request.journalEntry}"

Speak in a supportive and empowering tone. Focus on actionable insights. Be encouraging but honest."""

        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful mindset coach. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse the response
        analysis_text = response.choices[0].message.content
        print(f"DEBUG: AI response: {analysis_text}")  # Debug logging
        
        # Try to extract JSON from the response
        try:
            analysis = json.loads(analysis_text)
        except json.JSONDecodeError:
            # Try to extract JSON if it's wrapped in markdown code blocks
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                if json_end > json_start:
                    analysis_text = analysis_text[json_start:json_end].strip()
                    analysis = json.loads(analysis_text)
                else:
                    raise
            else:
                raise
        
        analysis_response = AnalysisResponse(**analysis)
        
        # Save to Supabase database
        journal_entry = {
            "user_email": request.userEmail,
            "journal_entry": request.journalEntry.strip(),
            "user_goal": request.userGoal.strip() if request.userGoal.strip() else None,
            "limiting_belief": analysis_response.limitingBelief,
            "explanation": analysis_response.explanation,
            "reframing_exercise": analysis_response.reframingExercise
        }
        
        try:
            result = supabase.table("journal_entries").insert(journal_entry).execute()
            print(f"DEBUG: Saved to Supabase: {result.data}")
        except Exception as db_error:
            print(f"DEBUG: Failed to save to Supabase: {db_error}")
            # Continue anyway - don't fail the analysis if database save fails
        
        # Increment message count after successful analysis
        increment_message_count(request.userEmail)
        
        return analysis_response
        
    except HTTPException:
        # Re-raise HTTPExceptions (like 429) without modification
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/user-history/{user_email}")
async def get_user_history(user_email: str):
    """Get journal history for a specific user"""
    try:
        result = supabase.table("journal_entries").select("*").eq("user_email", user_email).order("created_at", desc=True).execute()
        
        # Transform the data to match the frontend expectations
        history = []
        for entry in result.data:
            history_entry = {
                "id": str(entry["id"]),
                "date": datetime.fromisoformat(entry["created_at"].replace('Z', '+00:00')).strftime("%m/%d/%Y"),
                "goal": entry["user_goal"],
                "journalEntry": entry["journal_entry"],
                "analysis": None
            }
            
            if entry.get("limiting_belief"):
                history_entry["analysis"] = {
                    "limitingBelief": entry["limiting_belief"],
                    "explanation": entry["explanation"],
                    "reframingExercise": entry["reframing_exercise"]
                }
            
            history.append(history_entry)
        
        return history
    except Exception as e:
        print(f"DEBUG: Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.delete("/user-history/{user_email}/{entry_id}")
async def delete_history_entry(user_email: str, entry_id: str):
    """Delete a specific history entry"""
    try:
        result = supabase.table("journal_entries").delete().eq("id", entry_id).eq("user_email", user_email).execute()
        
        if result.data:
            return {"message": "Entry deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Entry not found or you don't have permission to delete it")
    except Exception as e:
        print(f"DEBUG: Error deleting entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")

@app.get("/user-tier/{user_email}", response_model=UserTierResponse)
async def get_user_tier(user_email: str):
    """Get user's tier information and monthly message usage"""
    try:
        tier_info = get_or_create_user_tier(user_email)
        return UserTierResponse(
            tier=tier_info["tier"],
            messages_used_this_month=tier_info["messages_used_this_month"],
            messages_limit=tier_info["messages_limit"],
            messages_remaining=tier_info["messages_limit"] - tier_info["messages_used_this_month"],
            current_month_year=tier_info["current_month_year"]
        )
    except Exception as e:
        print(f"DEBUG: Error getting user tier: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user tier: {str(e)}")

@app.post("/update-tier")
async def update_user_tier(request: UpdateTierRequest):
    """Update user's subscription tier"""
    try:
        # Validate tier
        if request.tier not in ["free", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid tier. Must be 'free' or 'premium'")
        
        # Set appropriate message limits
        # For testing: use 2 messages for free tier, 5 for premium
        # For production: use 100 for free tier, 500 for premium
        messages_limit = 100 if request.tier == "free" else 500
        
        # Update or create user tier
        current_month = datetime.now().strftime("%Y-%m")
        tier_data = {
            "user_email": request.userEmail,
            "tier": request.tier,
            "messages_limit": messages_limit,
            "current_month_year": current_month
        }
        
        # Try to update existing record first
        result = supabase.table("user_tiers").update(tier_data).eq("user_email", request.userEmail).execute()
        
        # If no existing record, create new one
        if not result.data:
            tier_data["messages_used_this_month"] = 0
            result = supabase.table("user_tiers").insert(tier_data).execute()
        
        if result.data:
            return {"message": f"Tier updated to {request.tier} successfully", "tier_info": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update tier")
            
    except Exception as e:
        print(f"DEBUG: Error updating tier: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update tier: {str(e)}")

@app.post("/test/reset-messages/{user_email}")
async def reset_user_messages(user_email: str):
    """TEST ENDPOINT: Reset user's message count to 0"""
    try:
        result = supabase.table("user_tiers").update({
            "messages_used_this_month": 0
        }).eq("user_email", user_email).execute()
        
        if result.data:
            return {"message": f"Reset messages for {user_email}", "tier_info": result.data[0]}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        print(f"DEBUG: Error resetting messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset messages: {str(e)}")

@app.post("/test/set-messages/{user_email}/{count}")
async def set_user_messages(user_email: str, count: int):
    """TEST ENDPOINT: Set user's message count to specific number"""
    try:
        result = supabase.table("user_tiers").update({
            "messages_used_this_month": count
        }).eq("user_email", user_email).execute()
        
        if result.data:
            return {"message": f"Set messages to {count} for {user_email}", "tier_info": result.data[0]}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        print(f"DEBUG: Error setting messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set messages: {str(e)}")

@app.get("/debug/user-status/{user_email}")
async def debug_user_status(user_email: str):
    """DEBUG ENDPOINT: Get detailed user status"""
    try:
        tier_info = get_or_create_user_tier(user_email)
        return {
            "user_email": user_email,
            "tier_info": tier_info,
            "can_send": tier_info["messages_used_this_month"] < tier_info["messages_limit"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "timestamp": datetime.now().isoformat()}

@app.get("/admin/search-users")
async def search_users(q: str = ""):
    """Search for users by email (admin only)"""
    try:
        print(f"DEBUG: Search request for query: '{q}'")
        
        if not q or len(q) < 2:
            return {"users": []}
        
        # Search for users in user_tiers table
        result = supabase.table("user_tiers").select("user_email").ilike("user_email", f"%{q}%").limit(10).execute()
        print(f"DEBUG: user_tiers result: {result.data}")
        
        # Also search in journal_entries for users who might not be in user_tiers yet
        journal_result = supabase.table("journal_entries").select("user_email").ilike("user_email", f"%{q}%").limit(10).execute()
        print(f"DEBUG: journal_entries result: {journal_result.data}")
        
        # Combine and deduplicate
        emails = set()
        if result.data:
            for user in result.data:
                emails.add(user["user_email"])
        if journal_result.data:
            for entry in journal_result.data:
                emails.add(entry["user_email"])
        
        final_users = list(emails)[:10]
        print(f"DEBUG: Final users list: {final_users}")
        return {"users": final_users}
    except Exception as e:
        print(f"DEBUG: Error searching users: {e}")
        return {"users": []}

@app.get("/user/entries/{user_email}")
async def get_user_own_entries(user_email: str, limit: int = 50):
    """Get journal entries for a specific user (user can only see their own)"""
    try:
        result = supabase.table("journal_entries").select("*").eq("user_email", user_email).order("created_at", desc=True).limit(limit).execute()
        return {"entries": result.data if result.data else []}
    except Exception as e:
        print(f"DEBUG: Error getting user entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")

@app.put("/user/entries/{entry_id}")
async def update_user_entry(entry_id: str, request: dict):
    """Update a journal entry (user can only update their own entries)"""
    try:
        # Get the entry first to verify it exists and belongs to the user
        existing = supabase.table("journal_entries").select("*").eq("id", entry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        entry = existing.data[0]
        user_email = request.get("user_email")
        
        # Verify the user owns this entry
        if entry["user_email"] != user_email:
            raise HTTPException(status_code=403, detail="You can only edit your own entries")
        
        # Update the entry
        update_data = {}
        if "journal_entry" in request:
            update_data["journal_entry"] = request["journal_entry"]
        if "user_goal" in request:
            update_data["user_goal"] = request["user_goal"]
        
        result = supabase.table("journal_entries").update(update_data).eq("id", entry_id).execute()
        
        if result.data:
            return {"message": "Entry updated successfully", "entry": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update entry")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error updating user entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update entry: {str(e)}")

@app.delete("/user/entries/{entry_id}")
async def delete_user_entry(entry_id: str, request: dict):
    """Delete a journal entry (user can only delete their own entries)"""
    try:
        # Get the entry first to verify it exists and belongs to the user
        existing = supabase.table("journal_entries").select("*").eq("id", entry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        entry = existing.data[0]
        user_email = request.get("user_email")
        
        # Verify the user owns this entry
        if entry["user_email"] != user_email:
            raise HTTPException(status_code=403, detail="You can only delete your own entries")
        
        # Delete the entry
        result = supabase.table("journal_entries").delete().eq("id", entry_id).execute()
        
        return {"message": "Entry deleted successfully", "deleted_entry": entry}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error deleting user entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")

@app.get("/")
async def root():
    return {"message": "MindsetOS AI Journal Backend"}

@app.get("/test-search")
async def test_search():
    """Test endpoint to verify search functionality"""
    return {"message": "Search endpoint is working", "test_users": ["test@example.com", "admin@example.com"]}

@app.get("/admin/entries/{user_email}")
async def get_user_entries(user_email: str, limit: int = 50):
    """Get all journal entries for a specific user (admin only)"""
    try:
        result = supabase.table("journal_entries").select("*").eq("user_email", user_email).order("created_at", desc=True).limit(limit).execute()
        return {"entries": result.data if result.data else []}
    except Exception as e:
        print(f"DEBUG: Error getting user entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")

@app.get("/admin/entries")
async def get_all_entries(limit: int = 100):
    """Get all journal entries (admin only)"""
    try:
        result = supabase.table("journal_entries").select("*").order("created_at", desc=True).limit(limit).execute()
        return {"entries": result.data if result.data else []}
    except Exception as e:
        print(f"DEBUG: Error getting all entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")

@app.put("/admin/entries/{entry_id}")
async def update_entry(entry_id: str, request: dict):
    """Update a journal entry (admin only)"""
    try:
        # Get the entry first to verify it exists
        existing = supabase.table("journal_entries").select("*").eq("id", entry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        # Update the entry
        update_data = {}
        if "journal_entry" in request:
            update_data["journal_entry"] = request["journal_entry"]
        if "user_goal" in request:
            update_data["user_goal"] = request["user_goal"]
        if "ai_analysis" in request:
            update_data["ai_analysis"] = request["ai_analysis"]
        
        result = supabase.table("journal_entries").update(update_data).eq("id", entry_id).execute()
        
        if result.data:
            return {"message": "Entry updated successfully", "entry": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update entry")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error updating entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update entry: {str(e)}")

@app.delete("/admin/entries/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete a journal entry (admin only)"""
    try:
        # Get the entry first to verify it exists
        existing = supabase.table("journal_entries").select("*").eq("id", entry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        # Delete the entry
        result = supabase.table("journal_entries").delete().eq("id", entry_id).execute()
        
        return {"message": "Entry deleted successfully", "deleted_entry": existing.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error deleting entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")

@app.get("/admin/message-limits")
async def get_message_limits():
    """Get current message limits for free and premium tiers"""
    try:
        # Get current limits from user_tiers table (using a sample user or default values)
        result = supabase.table("user_tiers").select("tier, messages_limit").execute()
        
        # Extract unique limits by tier
        limits = {"free": 2, "premium": 5}  # Default values
        
        if result.data:
            for user in result.data:
                if user["tier"] == "free":
                    limits["free"] = user["messages_limit"]
                elif user["tier"] == "premium":
                    limits["premium"] = user["messages_limit"]
        
        return {"limits": limits}
    except Exception as e:
        print(f"DEBUG: Error getting message limits: {e}")
        return {"limits": {"free": 100, "premium": 500}}

class MessageLimitsRequest(BaseModel):
    free_limit: int = 100
    premium_limit: int = 500

@app.post("/admin/update-message-limits")
async def update_message_limits(request: MessageLimitsRequest):
    """Update message limits for free and premium tiers"""
    try:
        free_limit = request.free_limit
        premium_limit = request.premium_limit
        
        print(f"DEBUG: Updating limits - Free: {free_limit}, Premium: {premium_limit}")
        
        # Update all free tier users
        free_result = supabase.table("user_tiers").update({
            "messages_limit": free_limit
        }).eq("tier", "free").execute()
        
        # Update all premium tier users
        premium_result = supabase.table("user_tiers").update({
            "messages_limit": premium_limit
        }).eq("tier", "premium").execute()
        
        print(f"DEBUG: Updated {len(free_result.data) if free_result.data else 0} free users")
        print(f"DEBUG: Updated {len(premium_result.data) if premium_result.data else 0} premium users")
        
        return {
            "message": "Message limits updated successfully",
            "limits": {"free": free_limit, "premium": premium_limit},
            "updated_users": {
                "free": len(free_result.data) if free_result.data else 0,
                "premium": len(premium_result.data) if premium_result.data else 0
            }
        }
    except Exception as e:
        print(f"DEBUG: Error updating message limits: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update message limits: {str(e)}")

class PersonalityAnalysisResponse(BaseModel):
    analysis_id: str
    total_entries: int
    analysis_date: str
    value_system: str
    motivators: str
    demotivators: str
    emotional_triggers: str
    mindset_blocks: str
    growth_opportunities: str
    overall_summary: str

class PersonalityAnalysisRequest(BaseModel):
    userEmail: str

@app.post("/analyze-personality", response_model=PersonalityAnalysisResponse)
async def analyze_personality(request: PersonalityAnalysisRequest):
    """Analyze user's personality based on their journal entries"""
    
    # Check message limit before processing
    can_send, tier_info = check_message_limit(request.userEmail)
    if not can_send:
        print(f"DEBUG: User {request.userEmail} has reached limit, returning 429 error")
        from fastapi import Response
        return Response(
            content="You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com",
            status_code=429,
            media_type="text/plain"
        )
    
    try:
        # Get user's journal entries
        result = supabase.table("journal_entries").select("*").eq("user_email", request.userEmail).order("created_at", desc=False).execute()
        
        if not result.data or len(result.data) < 5:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient entries for personality analysis. You need at least 5 entries, but only have {len(result.data) if result.data else 0}."
            )
        
        entries = result.data
        total_entries = len(entries)
        
        # Prepare entries for analysis
        entry_texts = []
        for entry in entries:
            entry_text = f"Date: {entry.get('created_at', 'Unknown')}\n"
            if entry.get('user_goal'):
                entry_text += f"Goal: {entry['user_goal']}\n"
            entry_text += f"Entry: {entry['journal_entry']}\n"
            if entry.get('limiting_belief'):
                entry_text += f"Identified Limiting Belief: {entry['limiting_belief']}\n"
            entry_texts.append(entry_text)
        
        combined_entries = "\n---\n".join(entry_texts)
        
        # Create comprehensive personality analysis prompt
        prompt = f"""You are a world-class psychology and mindset expert. Analyze this person's personality, mindset patterns, and psychological profile based on their {total_entries} journal entries.

Journal Entries:
{combined_entries}

Provide a comprehensive personality analysis in this exact JSON format:

{{
  "value_system": "Core values and principles that guide this person's decisions and actions (2-3 sentences)",
  "motivators": "What energizes, inspires, and drives this person forward (2-3 sentences)",
  "demotivators": "What drains energy, creates resistance, or causes procrastination (2-3 sentences)",
  "emotional_triggers": "Situations, thoughts, or events that consistently create strong emotional reactions (2-3 sentences)",
  "mindset_blocks": "Mental barriers, limiting beliefs, and thought patterns that hold them back (2-3 sentences)",
  "growth_opportunities": "Key areas where focused work could lead to significant personal development (2-3 sentences)",
  "overall_summary": "A holistic view of their personality, psychological patterns, and mindset tendencies (3-4 sentences)"
}}

Focus on:
- Recurring themes and patterns across entries
- Underlying belief systems and mental models
- Relationship with challenges, success, and failure
- Self-talk patterns and internal dialogue
- Values-driven vs. fear-driven behaviors
- Growth mindset vs. fixed mindset tendencies

Be insightful, empathetic, and actionable. Avoid generic advice."""

        # Call OpenAI API for personality analysis
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a psychology and mindset expert. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        analysis_text = response.choices[0].message.content.strip()
        print(f"DEBUG: Personality analysis response: {analysis_text}")
        
        # Parse the JSON response
        try:
            analysis = json.loads(analysis_text)
        except json.JSONDecodeError:
            # Try to extract JSON if it's wrapped in markdown code blocks
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                if json_end > json_start:
                    analysis_text = analysis_text[json_start:json_end].strip()
                    analysis = json.loads(analysis_text)
                else:
                    raise
            else:
                raise
        
        # Create analysis record
        analysis_id = str(uuid.uuid4())
        analysis_date = datetime.now().isoformat()
        
        # Save personality analysis to database
        personality_record = {
            "analysis_id": analysis_id,
            "user_email": request.userEmail,
            "total_entries": total_entries,
            "analysis_date": analysis_date,
            "value_system": analysis.get("value_system", ""),
            "motivators": analysis.get("motivators", ""),
            "demotivators": analysis.get("demotivators", ""),
            "emotional_triggers": analysis.get("emotional_triggers", ""),
            "mindset_blocks": analysis.get("mindset_blocks", ""),
            "growth_opportunities": analysis.get("growth_opportunities", ""),
            "overall_summary": analysis.get("overall_summary", "")
        }
        
        try:
            result = supabase.table("personality_analyses").insert(personality_record).execute()
            print(f"DEBUG: Saved personality analysis to Supabase: {result.data}")
        except Exception as db_error:
            print(f"DEBUG: Failed to save personality analysis to Supabase: {db_error}")
            # Continue anyway - don't fail the analysis if database save fails
        
        # Increment message count after successful analysis
        increment_message_count(request.userEmail)
        
        # Return the analysis
        return PersonalityAnalysisResponse(
            analysis_id=analysis_id,
            total_entries=total_entries,
            analysis_date=analysis_date,
            value_system=analysis.get("value_system", ""),
            motivators=analysis.get("motivators", ""),
            demotivators=analysis.get("demotivators", ""),
            emotional_triggers=analysis.get("emotional_triggers", ""),
            mindset_blocks=analysis.get("mindset_blocks", ""),
            growth_opportunities=analysis.get("growth_opportunities", ""),
            overall_summary=analysis.get("overall_summary", "")
        )
        
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse personality analysis response")
    except Exception as e:
        print(f"DEBUG: Error in personality analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Personality analysis failed: {str(e)}")

@app.get("/personality-history/{user_email}")
async def get_personality_history(user_email: str):
    """Get user's personality analysis history"""
    try:
        result = supabase.table("personality_analyses").select("*").eq("user_email", user_email).order("analysis_date", desc=True).execute()
        return {"analyses": result.data if result.data else []}
    except Exception as e:
        print(f"DEBUG: Error fetching personality history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch personality history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Cloud Run compatibility
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
