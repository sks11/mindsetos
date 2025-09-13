"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, History, Plus, Trash2, ChevronLeft } from "lucide-react"

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
  analysis: AnalysisResult
}

export function JournalInterface() {
  const { data: session } = useSession()
  const [currentView, setCurrentView] = useState<"journal" | "history">("journal")
  const [journalEntry, setJournalEntry] = useState("")
  const [goal, setGoal] = useState("")
  const [showGoalInput, setShowGoalInput] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Load user's history from backend
  const loadUserHistory = async () => {
    if (!session?.user?.email) return
    
    try {
      setIsLoadingHistory(true)
      const response = await fetch(`http://localhost:8000/user-history/${encodeURIComponent(session.user.email)}`)
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
      const response = await fetch(`http://localhost:8000/user-history/${encodeURIComponent(session.user.email)}/${id}`, {
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
      const response = await fetch("http://localhost:8000/analyze-journal", {
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
        throw new Error("Failed to analyze journal entry")
      }

      const result = await response.json()
      setAnalysis(result)

      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        goal: goal.trim() || undefined,
        journalEntry: journalEntry.trim(),
        analysis: result,
      }
      saveToHistory(historyEntry)
    } catch (err) {
      setError("Something went wrong. Please try again.")
      console.error("Analysis error:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setJournalEntry("")
    setGoal("")
    setShowGoalInput(false)
    setAnalysis(null)
    setError(null)
  }

  if (currentView === "history") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
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
                      {entry.goal && <p className="text-sm font-medium text-blue-600 mt-1">Goal: {entry.goal}</p>}
                    </div>
                    <Button
                      onClick={() => deleteHistoryEntry(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Journal Entry</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">{entry.journalEntry}</p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <h4 className="font-medium text-amber-800 text-sm mb-2">Limiting Belief</h4>
                      <p className="text-sm text-amber-900">{entry.analysis.limitingBelief}</p>
                    </div>
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
        <div></div>
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

      {/* Existing code */}
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
