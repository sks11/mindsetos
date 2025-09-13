import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    const { journalEntry, userGoal } = await request.json()

    if (!journalEntry || !userGoal) {
      return NextResponse.json({ error: "Journal entry and user goal are required" }, { status: 400 })
    }

    // Craft the mindset coaching prompt
    const prompt = `You are a world-class mindset coach specializing in cognitive reframing. The user's primary goal is "${userGoal}". 

Analyze the following journal entry and provide insights in this exact JSON format:

{
  "limitingBelief": "ONE specific limiting belief you identified (be direct and specific)",
  "explanation": "Explain in 2-3 sentences why this belief is holding them back from their goal",
  "reframingExercise": "Provide ONE simple, actionable reframing exercise they can do right now (be specific and practical)"
}

Journal Entry: "${journalEntry}"

Speak in a supportive and empowering tone. Focus on actionable insights that directly relate to their stated goal. Be encouraging but honest.`

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful mindset coach. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    try {
      const analysis = JSON.parse(responseText)
      return NextResponse.json(analysis)
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText)
      return NextResponse.json({ error: "Invalid response format from AI" }, { status: 500 })
    }
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze journal entry" }, { status: 500 })
  }
}
