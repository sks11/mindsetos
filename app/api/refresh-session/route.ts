import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    // Force fetch fresh user tier data
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/user-tier/${session.user.email}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    if (response.ok) {
      const tierInfo = await response.json()
      return NextResponse.json({
        success: true,
        tierInfo: {
          tier: tierInfo.tier,
          messagesUsed: tierInfo.messages_used_this_month,
          messagesLimit: tierInfo.messages_limit,
          messagesRemaining: tierInfo.messages_remaining,
          currentMonthYear: tierInfo.current_month_year
        }
      })
    } else {
      return NextResponse.json({ error: 'Failed to fetch tier info' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error refreshing session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
