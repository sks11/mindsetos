"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, History, Plus, Trash2, ChevronLeft } from "lucide-react"
import { apiEndpoints, config } from "@/lib/config"

// Extended session type with custom properties
type ExtendedUser = {
  name?: string | null
  email?: string | null
  image?: string | null
  tier?: string
  messagesUsed?: number
  messagesLimit?: number
  messagesRemaining?: number
  currentMonthYear?: string
}

type ExtendedSession = {
  user: ExtendedUser
  expires: string
}

interface AnalysisResult {
  limitingBelief: string
  explanation: string
  reframingExercise: string
}

interface HistoryEntry {
  id: string
  date: string
  goal?: string
  journalEntry: string
  analysis?: AnalysisResult
}

export function JournalInterface() {
  const { data: session, update } = useSession() as { data: ExtendedSession | null, update: () => Promise<ExtendedSession | null> }
  const [currentView, setCurrentView] = useState<"journal" | "history">("journal")
  const [journalEntry, setJournalEntry] = useState("")
  const [goal, setGoal] = useState("")
  const [showGoalInput, setShowGoalInput] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [editingGoal, setEditingGoal] = useState("")

  // Refresh session to update message count
  const refreshSession = async () => {
    try {
      console.log("DEBUG: Refreshing session...")
      
      // Call our custom refresh API endpoint
      const response = await fetch('/api/refresh-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("DEBUG: Fresh tier data:", data.tierInfo)
        
        // Update the session with fresh data
        await update()
        
        // Reload the page to ensure UI updates
        window.location.reload()
      } else {
        console.error("Failed to refresh session via API")
        // Fallback: just reload the page
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to refresh session:", error)
      // Fallback: reload the page
      window.location.reload()
    }
  }

  // Load user's history from backend
  const loadUserHistory = async () => {
    if (!session?.user?.email) return
    
    try {
      setIsLoadingHistory(true)
      const response = await fetch(apiEndpoints.userHistory(session.user.email))
      if (response.ok) {
        const userHistory = await response.json()
        setHistory(userHistory)
      }
    } catch (error) {
      console.error("Failed to load history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Start editing an entry inline
  const startEditing = (entry: HistoryEntry) => {
    console.log('DEBUG: Starting inline edit for entry:', entry.id)
    setEditingEntryId(entry.id)
    setEditingText(entry.journalEntry)
    setEditingGoal(entry.goal || "")
  }

  // Cancel editing
  const cancelEditing = () => {
    console.log('DEBUG: Canceling edit')
    setEditingEntryId(null)
    setEditingText("")
    setEditingGoal("")
  }

  // Save the edited entry
  const saveEdit = async (entryId: string) => {
    if (!session?.user?.email) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/user/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: session.user.email,
          journal_entry: editingText,
          user_goal: editingGoal || null
        })
      })
      
      if (response.ok) {
        alert('Entry updated successfully!')
        // Reload history
        loadUserHistory()
        cancelEditing()
      } else {
        const errorText = await response.text()
        alert(`Failed to update entry: ${errorText}`)
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      alert(`Failed to update entry: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  useEffect(() => {
    if (session?.user?.email) {
      loadUserHistory()
    } else {
      // Clear history when user logs out
      setHistory([])
    }
  }, [session?.user?.email])

  // This function is no longer needed as the backend auto-saves
  const saveToHistory = (entry: HistoryEntry) => {
    // History is now automatically saved by the backend
    // Just update local state
    const updatedHistory = [entry, ...history]
    setHistory(updatedHistory)
  }

  const deleteHistoryEntry = async (id: string) => {
    if (!session?.user?.email) return

    try {
      const response = await fetch(apiEndpoints.deleteHistoryEntry(session.user.email, id), {
        method: "DELETE",
      })

      if (response.ok) {
        // Update local state
        const updatedHistory = history.filter((entry) => entry.id !== id)
        setHistory(updatedHistory)
      } else {
        setError("Failed to delete entry. Please try again.")
      }
    } catch (error) {
      console.error("Failed to delete entry:", error)
      setError("Failed to delete entry. Please try again.")
    }
  }

  // Update an entry
  const updateEntry = async (entryId: string, updates: { journalEntry: string; goal?: string }) => {
    if (!session?.user?.email) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/user/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: session.user.email,
          journal_entry: updates.journalEntry,
          user_goal: updates.goal || null
        })
      })
      
      if (response.ok) {
        alert('Entry updated successfully!')
        // Reload history
        loadUserHistory()
      } else {
        const errorText = await response.text()
        alert(`Failed to update entry: ${errorText}`)
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      alert(`Failed to update entry: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Delete an entry using the new endpoint
  const deleteEntry = async (entryId: string) => {
    if (!session?.user?.email) return
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return
    }
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/user/entries/${entryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: session.user.email
        })
      })
      
      if (response.ok) {
        alert('Entry deleted successfully!')
        // Reload history
        loadUserHistory()
      } else {
        const errorText = await response.text()
        alert(`Failed to delete entry: ${errorText}`)
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert(`Failed to delete entry: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleRecordThought = async () => {
    if (!journalEntry.trim()) {
      setError("Please write something in your journal first.")
      return
    }

    if (!session?.user?.email) {
      setError("You must be logged in to record thoughts.")
      return
    }

    console.log("DEBUG: Recording thought, current message count:", session?.user?.messagesUsed)
    
    try {
      const response = await fetch(`${config.apiUrl}/record-thought`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: session.user.email,
          journalEntry: journalEntry.trim(),
          goal: goal.trim() || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Monthly message limit exceeded
          setError("You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com")
          setShowUpgradePrompt(true)
          return
        }
        throw new Error("Failed to record thought");
      }

      const result = await response.json();
      
      // Create a new entry to show immediately below the current fields
      const newEntry: HistoryEntry = {
        id: result.entry.id.toString(),
        date: new Date().toLocaleDateString(),
        goal: goal.trim() || undefined,
        journalEntry: journalEntry.trim(),
        analysis: undefined, // No analysis for recorded thoughts
      }
      
      // Add the new entry to the top of history
      setHistory(prevHistory => [newEntry, ...prevHistory]);
      
      // Don't reset the form immediately - let user see the entry was added
      // We'll clear it after a brief delay or when they start a new entry
      setError(null);
      
      // Refresh session to update message count (but don't reload page)
      try {
        const sessionResponse = await fetch('/api/refresh-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (sessionResponse.ok) {
          await update()
        }
      } catch (sessionError) {
        console.error("Failed to refresh session:", sessionError)
      }

    } catch (err) {
      console.error("Record thought error:", err)
      // Check if it's a 429 error (quota exceeded)
      if (err instanceof Error && err.message.includes('429')) {
        setError("You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com")
        setShowUpgradePrompt(true)
      } else {
        setError("Something went wrong. Please try again.")
      }
    }
  }

  const handleAnalyze = async () => {
    if (!journalEntry.trim()) {
      setError("Please write something in your journal first.")
      return
    }

    if (!session?.user?.email) {
      setError("You must be logged in to analyze journal entries.")
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(apiEndpoints.analyzeJournal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          journalEntry: journalEntry.trim(),
          userGoal: goal.trim() || "personal growth and overcoming limiting beliefs",
          userEmail: session.user.email,
        }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          // Monthly message limit exceeded
          setError("You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com")
          setShowUpgradePrompt(true)
          return
        }
        throw new Error("Failed to analyze journal entry")
      }

      const result = await response.json()
      setAnalysis(result)

      // Don't automatically save to history yet - let user see the analysis first
      // The analysis will be displayed below the current fields
      
      // Refresh session to update message count (but don't reload page)
      try {
        const sessionResponse = await fetch('/api/refresh-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (sessionResponse.ok) {
          await update()
        }
      } catch (sessionError) {
        console.error("Failed to refresh session:", sessionError)
      }
    } catch (err) {
      console.error("Analysis error:", err)
      // Check if it's a 429 error (quota exceeded)
      if (err instanceof Error && err.message.includes('429')) {
        setError("You've exhausted your quota for the month. If you need more, upgrade your tier by sending an email request to mindsetosai@gmail.com")
        setShowUpgradePrompt(true)
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    // If there's an analysis, save it to history before clearing
    if (analysis && journalEntry.trim()) {
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        goal: goal.trim() || undefined,
        journalEntry: journalEntry.trim(),
        analysis: analysis,
      }
      saveToHistory(historyEntry)
    }
    
    setJournalEntry("")
    setGoal("")
    setShowGoalInput(false)
    setAnalysis(null)
    setError(null)
    // Cancel any ongoing editing
    cancelEditing()
  }

  const handleSaveToHistory = () => {
    if (analysis && journalEntry.trim()) {
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        goal: goal.trim() || undefined,
        journalEntry: journalEntry.trim(),
        analysis: analysis,
      }
      saveToHistory(historyEntry)
      
      // Clear the form after saving
      setJournalEntry("")
      setGoal("")
      setShowGoalInput(false)
      setAnalysis(null)
      setError(null)
    }
  }

  if (currentView === "history") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setCurrentView("journal")}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white/80"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Journal
            </Button>
            <h2 className="text-2xl font-semibold text-foreground">Your History</h2>
          </div>
          <Button
            onClick={refreshSession}
            variant="outline"
            size="sm"
            className="text-xs"
            title="Refresh message count"
          >
            🔄 Refresh Session
          </Button>
        </div>


        {history.length === 0 ? (
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No entries yet. Start journaling to see your insights here!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <Card key={entry.id} className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{entry.date}</p>
                      {editingEntryId === entry.id ? (
                        <div className="mt-2">
                          <label className="text-xs text-gray-600">Goal (Optional):</label>
                          <Input
                            value={editingGoal}
                            onChange={(e) => setEditingGoal(e.target.value)}
                            className="text-sm mt-1"
                            placeholder="What's your goal for this entry?"
                          />
                        </div>
                      ) : (
                        entry.goal && <p className="text-sm font-medium text-blue-600 mt-1">Goal: {entry.goal}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingEntryId === entry.id ? (
                        <>
                          <Button
                            onClick={() => saveEdit(entry.id)}
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-700 hover:bg-green-50"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => startEditing(entry)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteEntry(entry.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Journal Entry</h4>
                      {editingEntryId === entry.id ? (
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white"
                          rows={4}
                          placeholder="Enter your journal entry..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">{entry.journalEntry}</p>
                      )}
                    </div>

                    {entry.analysis && (
                      <>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                          <h4 className="font-medium text-amber-800 text-sm mb-2">Limiting Belief</h4>
                          <p className="text-sm text-amber-900">{entry.analysis.limitingBelief}</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-800 text-sm mb-2">Explanation</h4>
                          <p className="text-sm text-blue-900">{entry.analysis.explanation}</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-800 text-sm mb-2">Reframing Exercise</h4>
                          <p className="text-sm text-green-900">{entry.analysis.reframingExercise}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Message Counter */}
          {session?.user && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                session.user.tier === 'premium' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {session.user.tier === 'premium' ? 'Premium' : 'Free'}
              </div>
              <span className="text-muted-foreground">
                {session.user.messagesUsed || 0}/{session.user.messagesLimit || 100} messages this month
              </span>
              <Button
                onClick={refreshSession}
                variant="outline"
                size="sm"
                className="text-xs h-6 px-2"
                title="Refresh message count"
              >
                🔄
              </Button>
            </div>
          )}
        </div>
        <Button
          onClick={() => setCurrentView("history")}
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white/80"
        >
          <History className="w-4 h-4 mr-2" />
          History ({history.length})
        </Button>
      </div>

      <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {showGoalInput ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">What's your current goal? (optional)</label>
                <Input
                  placeholder="e.g., Build confidence in my career, improve relationships..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="bg-white/80 border-gray-200"
                />
              </div>
            ) : (
              <Button
                onClick={() => setShowGoalInput(true)}
                variant="ghost"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-normal"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add a goal (optional)
              </Button>
            )}

            <Textarea
              placeholder="Today I've been thinking about..."
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              className="min-h-[160px] bg-white/80 border-gray-200 text-foreground placeholder:text-muted-foreground resize-none text-base leading-relaxed"
            />

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !journalEntry.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700 flex-1 h-12 text-base font-medium"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze My Entry"
                )}
              </Button>

              <Button
                onClick={handleRecordThought}
                disabled={!journalEntry.trim()}
                className="bg-green-600 text-white hover:bg-green-700 flex-1 h-12 text-base font-medium"
              >
                Record Thought
              </Button>

              {(journalEntry || analysis || showGoalInput) && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white/80 h-12"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show recently recorded thoughts or entries */}
      {history.length > 0 && !analysis && (
        <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Most Recent Entry</h3>
              <Button
                onClick={() => setCurrentView("history")}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                View All History
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">{history[0].date}</p>
                  {history[0].goal && (
                    <p className="text-sm font-medium text-blue-600 mt-1">Goal: {history[0].goal}</p>
                  )}
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {history[0].analysis ? 'Analyzed' : 'Recorded'}
                </span>
              </div>
              
              <div className="mb-3">
                <h4 className="font-medium text-foreground text-sm mb-1">Journal Entry</h4>
                <p className="text-sm text-muted-foreground">{history[0].journalEntry}</p>
              </div>
              
              {history[0].analysis && (
                <div className="space-y-2">
                  <div className="bg-amber-50 p-3 rounded border border-amber-200">
                    <h4 className="font-medium text-amber-800 text-xs mb-1">Limiting Belief</h4>
                    <p className="text-xs text-amber-900">{history[0].analysis.limitingBelief}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <h4 className="font-medium text-green-800 text-xs mb-1">Reframing Exercise</h4>
                    <p className="text-xs text-green-900">{history[0].analysis.reframingExercise}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis results */}
      {analysis && (
        <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-foreground mb-2">Your Insights</h3>
                <p className="text-muted-foreground">AI-powered analysis of your journal entry</p>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                  <h4 className="font-semibold text-amber-800 text-lg mb-3">Potential Limiting Belief</h4>
                  <p className="text-amber-900 leading-relaxed">{analysis.limitingBelief}</p>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-blue-800 text-lg mb-3">Why This Matters</h4>
                  <p className="text-blue-900 leading-relaxed">{analysis.explanation}</p>
                </div>

                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <h4 className="font-semibold text-green-800 text-lg mb-3">Reframing Exercise</h4>
                  <p className="text-green-900 leading-relaxed">{analysis.reframingExercise}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveToHistory}
                    className="bg-purple-600 text-white hover:bg-purple-700 flex-1 h-12 text-base font-medium"
                  >
                    Save to History
                  </Button>
                  <Button
                    onClick={() => {
                      setAnalysis(null)
                      setJournalEntry("")
                      setGoal("")
                      setShowGoalInput(false)
                      setError(null)
                    }}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white/80 h-12"
                  >
                    Start New Entry
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Prompt Dialog */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl max-w-md mx-4">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Upgrade to Premium</h3>
                  <p className="text-muted-foreground">
                    You've reached your monthly free tier limit. Upgrade to Premium for 500 messages per month!
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    📧 Send an email request to: <strong>mindsetosai@gmail.com</strong>
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3">Premium Benefits</h4>
                  <ul className="text-sm text-purple-700 space-y-2 text-left">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      500 AI-powered journal analyses per month
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Advanced mindset coaching insights
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Priority support
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowUpgradePrompt(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Maybe Later
                  </Button>
                  <Button
                    onClick={() => {
                      // Open email client with pre-filled message
                      const subject = "Premium Upgrade Request - MindsetOS AI"
                      const body = `Hi,

I would like to upgrade to Premium tier for MindsetOS AI.

My email: ${session?.user?.email || 'Not provided'}

Please let me know the next steps.

Thanks!`
                      const mailtoLink = `mailto:mindsetosai@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                      window.open(mailtoLink, '_blank')
                      setShowUpgradePrompt(false)
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Send Email Request
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
