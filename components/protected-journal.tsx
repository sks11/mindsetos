"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { JournalInterface } from "@/components/journal-interface"

export function ProtectedJournal() {
  const { data: session, status } = useSession({ required: true })

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

      {/* Main Content */}
      <main className="py-8">
        <JournalInterface />
      </main>
    </div>
  )
} 