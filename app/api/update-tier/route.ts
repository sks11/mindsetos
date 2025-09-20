import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userEmail, tier } = await request.json()

    if (!userEmail || !tier) {
      return NextResponse.json({ error: "User email and tier are required" }, { status: 400 })
    }

    if (!["free", "premium"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier. Must be 'free' or 'premium'" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    
    const response = await fetch(`${backendUrl}/update-tier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        tier
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || "Failed to update tier" }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error updating tier:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
