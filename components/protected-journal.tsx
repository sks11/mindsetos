"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { JournalInterface } from "@/components/journal-interface"
import { isAdmin, getAdminConfig } from "@/lib/admin"

export function ProtectedJournal() {
  const { data: session, status } = useSession({ required: true })
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedUserEmail, setSelectedUserEmail] = useState("")
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [messageLimits, setMessageLimits] = useState({ free: 2, premium: 5 })
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false)
  const [entries, setEntries] = useState<any[]>([])
  const [isLoadingEntries, setIsLoadingEntries] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [showEntryModal, setShowEntryModal] = useState(false)
  
  // Check if current user is admin
  const userIsAdmin = isAdmin(session?.user?.email)
  const adminConfig = getAdminConfig()

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedUserEmail) {
        searchUsers(selectedUserEmail)
      }
    }, 300) // 300ms delay

    return () => clearTimeout(timeoutId)
  }, [selectedUserEmail])

  // Load message limits when admin panel is shown
  useEffect(() => {
    if (showAdminPanel && userIsAdmin) {
      loadMessageLimits()
    }
  }, [showAdminPanel, userIsAdmin])

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    
    console.log('DEBUG: Searching for users with query:', query)
    setIsSearching(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = `${backendUrl}/admin/search-users?q=${encodeURIComponent(query)}`
      console.log('DEBUG: Fetching URL:', url)
      
      const response = await fetch(url)
      console.log('DEBUG: Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: Search results:', data)
        setSearchResults(data.users || [])
        setShowDropdown(data.users && data.users.length > 0)
      } else {
        const errorText = await response.text()
        console.error('DEBUG: Search failed:', response.status, errorText)
        
        // Fallback: show some test users for demo
        const fallbackUsers = [
          'shravanksinghdce@gmail.com',
          'shravanksinghvisa@gmail.com',
          'test@example.com',
          'admin@example.com'
        ].filter(email => email.toLowerCase().includes(query.toLowerCase()))
        
        setSearchResults(fallbackUsers)
        setShowDropdown(fallbackUsers.length > 0)
      }
    } catch (error) {
      console.error('Error searching users:', error)
      
      // Fallback: show some test users for demo
      const fallbackUsers = [
        'shravanksinghdce@gmail.com',
        'shravanksinghvisa@gmail.com',
        'test@example.com',
        'admin@example.com'
      ].filter(email => email.toLowerCase().includes(query.toLowerCase()))
      
      setSearchResults(fallbackUsers)
      setShowDropdown(fallbackUsers.length > 0)
    } finally {
      setIsSearching(false)
    }
  }

  const loadUserInfo = async (email: string) => {
    if (!email) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/debug/user-status/${email}`)
      if (response.ok) {
        const userInfo = await response.json()
        setSelectedUserInfo(userInfo)
      } else {
        setSelectedUserInfo(null)
        alert('User not found')
      }
    } catch (error) {
      console.error('Error loading user info:', error)
      setSelectedUserInfo(null)
    }
  }

  const loadMessageLimits = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = `${backendUrl}/admin/message-limits`
      console.log('DEBUG: Loading message limits from:', url)
      
      const response = await fetch(url)
      console.log('DEBUG: Load response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: Loaded limits:', data)
        setMessageLimits(data.limits)
      } else {
        const errorText = await response.text()
        console.error('DEBUG: Load failed:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error loading message limits:', error)
    }
  }

  const updateMessageLimits = async () => {
    setIsUpdatingLimits(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = `${backendUrl}/admin/update-message-limits`
      const payload = {
        free_limit: messageLimits.free,
        premium_limit: messageLimits.premium
      }
      
      console.log('DEBUG: Updating message limits:', payload)
      console.log('DEBUG: URL:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      console.log('DEBUG: Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: Update successful:', data)
        alert(`Message limits updated successfully!\nFree: ${data.limits.free} messages\nPremium: ${data.limits.premium} messages\n\nUpdated ${data.updated_users.free} free users and ${data.updated_users.premium} premium users.`)
      } else {
        const errorText = await response.text()
        console.error('DEBUG: Update failed:', response.status, errorText)
        alert(`Failed to update message limits. Status: ${response.status}\nError: ${errorText}`)
      }
    } catch (error) {
      console.error('Error updating message limits:', error)
      alert(`Failed to update message limits: ${error.message}`)
    } finally {
      setIsUpdatingLimits(false)
    }
  }

  const loadEntries = async (userEmail?: string) => {
    setIsLoadingEntries(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = userEmail 
        ? `${backendUrl}/admin/entries/${encodeURIComponent(userEmail)}`
        : `${backendUrl}/admin/entries`
      
      console.log('DEBUG: Loading entries from:', url)
      const response = await fetch(url)
      console.log('DEBUG: Entries response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: Loaded entries:', data.entries?.length || 0, 'entries')
        setEntries(data.entries || [])
      } else {
        console.error('Failed to load entries:', response.status)
        setEntries([])
      }
    } catch (error) {
      console.error('Error loading entries:', error)
      setEntries([])
    } finally {
      setIsLoadingEntries(false)
    }
  }

  const updateEntry = async (entryId: number, updates: any) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/admin/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('Entry updated successfully!')
        // Reload entries
        loadEntries(selectedUserEmail)
        setShowEntryModal(false)
        setEditingEntry(null)
      } else {
        const errorText = await response.text()
        alert(`Failed to update entry: ${errorText}`)
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      alert(`Failed to update entry: ${error.message}`)
    }
  }

  const deleteEntry = async (entryId: number) => {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return
    }
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/admin/entries/${entryId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Silently reload entries - no success popup needed
        loadEntries(selectedUserEmail)
      } else {
        const errorText = await response.text()
        alert(`Failed to delete entry: ${errorText}`)
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert(`Failed to delete entry: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleTierUpdate = async (tier: string) => {
    const targetEmail = selectedUserEmail || session?.user?.email
    if (!targetEmail) return
    
    setIsUpdating(true)
    try {
      const response = await fetch('/api/update-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: targetEmail,
          tier
        })
      })

      if (response.ok) {
        // Reload user info if managing another user
        if (selectedUserEmail) {
          await loadUserInfo(selectedUserEmail)
        } else {
          // Refresh the page to update session for current user
          window.location.reload()
        }
      } else {
        alert('Failed to update tier')
      }
    } catch (error) {
      console.error('Error updating tier:', error)
      alert('Error updating tier')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTestAction = async (action: string) => {
    const targetEmail = selectedUserEmail || session?.user?.email
    if (!targetEmail) return
    
    setIsUpdating(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      let url = ''
      
      if (action === 'reset') {
        url = `${backendUrl}/test/reset-messages/${targetEmail}`
      } else if (action === 'set1') {
        url = `${backendUrl}/test/set-messages/${targetEmail}/1`
      } else if (action === 'set2') {
        url = `${backendUrl}/test/set-messages/${targetEmail}/2`
      }
      
      const response = await fetch(url, { method: 'POST' })
      
      if (response.ok) {
        // Reload user info if managing another user
        if (selectedUserEmail) {
          await loadUserInfo(selectedUserEmail)
        } else {
          // Refresh the page to update session for current user
          window.location.reload()
        }
      } else {
        alert('Failed to execute test action')
      }
    } catch (error) {
      console.error('Error executing test action:', error)
      alert('Error executing test action')
    } finally {
      setIsUpdating(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your mindset journey...</p>
        </div>
      </div>
    )
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                MindsetOS AI
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {session?.user && (
                <>
                  {/* Admin Panel Toggle - Only show for admins */}
                  {userIsAdmin && adminConfig.isAdminEnabled && (
                    <Button
                      onClick={() => setShowAdminPanel(!showAdminPanel)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Admin
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || undefined} />
                      <AvatarFallback>
                        {session.user.name?.[0] || session.user.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {session.user.name || session.user.email}
                      </p>
                      <p className="text-xs text-gray-500">Mindset Explorer</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Panel - Only show for admins */}
      {showAdminPanel && userIsAdmin && adminConfig.isAdminEnabled && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Admin Panel - User Management</h3>
                  <p className="text-xs text-yellow-700">
                    Admin: {session?.user?.email}
                  </p>
                </div>
              </div>
              
              {/* User Selection */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type user email to search (or leave empty for current user)"
                    value={selectedUserEmail}
                    onChange={(e) => {
                      setSelectedUserEmail(e.target.value)
                      setShowDropdown(true)
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowDropdown(true)
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown to allow clicking on items
                      setTimeout(() => setShowDropdown(false), 200)
                    }}
                    className="text-xs"
                  />
                  
                  {/* Search Results Dropdown */}
                  {showDropdown && (searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-2 text-xs text-gray-500">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((email, index) => (
                          <div
                            key={index}
                            className="p-2 text-xs hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              setSelectedUserEmail(email)
                              setShowDropdown(false)
                              loadUserInfo(email)
                            }}
                          >
                            {email}
                          </div>
                        ))
                      ) : selectedUserEmail.length >= 2 ? (
                        <div className="p-2 text-xs text-gray-500">No users found</div>
                      ) : null}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (selectedUserEmail) {
                      loadUserInfo(selectedUserEmail)
                    } else {
                      setSelectedUserInfo(null)
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Load User
                </Button>
                <Button
                  onClick={() => {
                    setSelectedUserEmail("")
                    setSelectedUserInfo(null)
                    setSearchResults([])
                    setShowDropdown(false)
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
              
              {/* Message Limits Configuration */}
              <div className="bg-blue-50 p-3 rounded border">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">📊 Message Limits Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-blue-700 block mb-1">Free Tier Limit</label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={messageLimits.free}
                      onChange={(e) => setMessageLimits(prev => ({ ...prev, free: parseInt(e.target.value) || 2 }))}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-blue-700 block mb-1">Premium Tier Limit</label>
                    <Input
                      type="number"
                      min="1"
                      max="10000"
                      value={messageLimits.premium}
                      onChange={(e) => setMessageLimits(prev => ({ ...prev, premium: parseInt(e.target.value) || 5 }))}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={updateMessageLimits}
                    disabled={isUpdatingLimits}
                    size="sm"
                    className="text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdatingLimits ? "Updating..." : "Update Limits"}
                  </Button>
                  <Button
                    onClick={loadMessageLimits}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Refresh
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Current: Free = {messageLimits.free} messages, Premium = {messageLimits.premium} messages
                </p>
              </div>
              
              {/* Entry Management */}
              <div className="bg-green-50 p-3 rounded border">
                <h4 className="text-sm font-semibold text-green-800 mb-2">📝 Entry Management</h4>
                <div className="flex gap-2 mb-3">
                  <Button
                    onClick={() => loadEntries(selectedUserEmail)}
                    disabled={isLoadingEntries}
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700"
                  >
                    {isLoadingEntries ? "Loading..." : selectedUserEmail ? "Load User Entries" : "Load All Entries"}
                  </Button>
                  <Button
                    onClick={() => loadEntries()}
                    disabled={isLoadingEntries}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Load All Entries
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('DEBUG: Current entries:', entries)
                      console.log('DEBUG: Selected user:', selectedUserEmail)
                    }}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-yellow-100"
                  >
                    Debug
                  </Button>
                </div>
                
                {entries.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="bg-white p-2 rounded border text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-green-700">#{entry.id}</span>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => {
                                setEditingEntry(entry)
                                setShowEntryModal(true)
                              }}
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteEntry(entry.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-1">
                          <strong>User:</strong> {entry.user_email}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Date:</strong> {new Date(entry.created_at).toLocaleString()}
                        </p>
                        <p className="text-gray-700 mb-1">
                          <strong>Entry:</strong> {entry.journal_entry?.substring(0, 100)}...
                        </p>
                        {entry.user_goal && (
                          <p className="text-gray-600 mb-1">
                            <strong>Goal:</strong> {entry.user_goal}
                          </p>
                        )}
                        {entry.ai_analysis && (
                          <p className="text-gray-600">
                            <strong>Analysis:</strong> {entry.ai_analysis?.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {entries.length === 0 && !isLoadingEntries && (
                  <div className="text-xs text-green-600">
                    <p>No entries loaded yet. Click "Load All Entries" to fetch entries.</p>
                    <p className="mt-1 text-gray-500">Entries loaded: {entries.length}</p>
                  </div>
                )}
              </div>
              
              {/* User Info Display */}
              {selectedUserInfo ? (
                <div className="bg-white/50 p-2 rounded border">
                  <p className="text-xs text-yellow-800">
                    <strong>Managing:</strong> {selectedUserInfo.user_email} | 
                    <strong> Tier:</strong> {selectedUserInfo.tier_info?.tier || 'free'} | 
                    <strong> Usage:</strong> {selectedUserInfo.tier_info?.messages_used_this_month || 0}/{selectedUserInfo.tier_info?.messages_limit || 2} messages this month
                  </p>
                </div>
              ) : (
                <div className="bg-white/50 p-2 rounded border">
                  <p className="text-xs text-yellow-800">
                    <strong>Managing:</strong> {session?.user?.email} (Current User) | 
                    <strong> Tier:</strong> {session?.user?.tier || 'free'} | 
                    <strong> Usage:</strong> {session?.user?.messagesUsed || 0}/{session?.user?.messagesLimit || 2} messages this month
                  </p>
                </div>
              )}
              
              {/* Admin Controls */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleTierUpdate('free')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Set Free (2/month)
                </Button>
                <Button
                  onClick={() => handleTierUpdate('premium')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Set Premium (5/month)
                </Button>
                <div className="border-l border-yellow-300 mx-2"></div>
                <Button
                  onClick={() => handleTestAction('reset')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-xs bg-green-50 border-green-200 text-green-700"
                >
                  Reset to 0
                </Button>
                <Button
                  onClick={() => handleTestAction('set1')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-xs bg-blue-50 border-blue-200 text-blue-700"
                >
                  Set to 1
                </Button>
                <Button
                  onClick={() => handleTestAction('set2')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-xs bg-red-50 border-red-200 text-red-700"
                >
                  Set to 2 (Limit)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="py-8">
        <JournalInterface />
      </main>
      
      {/* Entry Edit Modal */}
      {showEntryModal && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Entry #{editingEntry.id}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                <Input
                  value={editingEntry.user_email}
                  disabled
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal Entry</label>
                <textarea
                  value={editingEntry.journal_entry || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, journal_entry: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={4}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Goal</label>
                <Input
                  value={editingEntry.user_goal || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, user_goal: e.target.value})}
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Analysis</label>
                <textarea
                  value={editingEntry.ai_analysis || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, ai_analysis: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={6}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => updateEntry(editingEntry.id, {
                  journal_entry: editingEntry.journal_entry,
                  user_goal: editingEntry.user_goal,
                  ai_analysis: editingEntry.ai_analysis
                })}
                className="bg-green-600 hover:bg-green-700"
              >
                Save Changes
              </Button>
              <Button
                onClick={() => {
                  setShowEntryModal(false)
                  setEditingEntry(null)
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 