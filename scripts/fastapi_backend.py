from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import json
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

@app.post("/record-thought")
async def record_thought(request: RecordThoughtRequest):
    """Save a journal entry without analysis."""
    try:
        journal_entry = {
            "user_email": request.userEmail,
            "journal_entry": request.journalEntry.strip(),
            "user_goal": request.goal.strip() if request.goal and request.goal.strip() else None,
        }
        
        result = supabase.table("journal_entries").insert(journal_entry).execute()
        
        if result.data:
            return {"message": "Thought recorded successfully", "entry": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to record thought")
            
    except Exception as e:
        print(f"DEBUG: Error recording thought: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record thought: {str(e)}")

@app.post("/analyze-journal", response_model=AnalysisResponse)
async def analyze_journal(request: JournalRequest):
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
        
        return analysis_response
        
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

@app.get("/")
async def root():
    return {"message": "MindsetOS AI Journal Backend"}

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Cloud Run compatibility
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
