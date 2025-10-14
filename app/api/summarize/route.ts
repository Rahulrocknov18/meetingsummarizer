import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import Groq from "groq-sdk"

interface SummaryResponse {
  summary: string
  key_decisions: string[]
  participants: string[]
  action_items: Array<{
    task: string
    assignee?: string
    priority: "low" | "medium" | "high"
    due_date?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error("Groq API key is not configured")
      return NextResponse.json(
        { error: "Groq API key is not configured. Please add GROQ_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const { meetingId } = await request.json()

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: transcripts } = await supabase
      .from("transcripts")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .limit(1)

    const transcript = transcripts && transcripts.length > 0 ? transcripts[0] : null

    if (!transcript) {
      console.error("No transcript found for meeting:", meetingId)
      return NextResponse.json(
        {
          error:
            "Transcript not found. The transcription may still be in progress or may have failed. Please wait a moment and try again.",
        },
        { status: 404 },
      )
    }

    const { data: existingSummary } = await supabase
      .from("summaries")
      .select("id")
      .eq("meeting_id", meetingId)
      .maybeSingle()

    if (existingSummary) {
      const { data: actionItems } = await supabase.from("action_items").select("*").eq("meeting_id", meetingId)
      return NextResponse.json({
        success: true,
        message: "Summary already exists",
        summary: existingSummary,
        action_items: actionItems || [],
      })
    }

    await supabase
      .from("meetings")
      .update({ status: "summarizing", updated_at: new Date().toISOString() })
      .eq("id", meetingId)

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert meeting analyst. Analyze the meeting transcript and provide:
1. A concise summary (2-3 paragraphs)
2. Key decisions made
3. Participants mentioned
4. Action items with assignees, priority, and due dates if mentioned

Return your response as a JSON object with this structure:
{
  "summary": "string",
  "key_decisions": ["string"],
  "participants": ["string"],
  "action_items": [
    {
      "task": "string",
      "assignee": "string or null",
      "priority": "low|medium|high",
      "due_date": "YYYY-MM-DD or null"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Analyze this meeting transcript and extract key information:\n\n${transcript.full_text}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      })

      const result = JSON.parse(completion.choices[0].message.content || "{}") as SummaryResponse

      const { data: summary, error: summaryError } = await supabase
        .from("summaries")
        .insert({
          meeting_id: meetingId,
          summary_text: result.summary,
          key_decisions: result.key_decisions || [],
          participants: result.participants || [],
        })
        .select()
        .single()

      if (summaryError) {
        console.error("Failed to save summary:", summaryError)
        throw new Error("Failed to save summary: " + summaryError.message)
      }

      if (result.action_items && result.action_items.length > 0) {
        const actionItemsToInsert = result.action_items.map((item) => ({
          meeting_id: meetingId,
          task_description: item.task,
          assignee: item.assignee || null,
          priority: item.priority || "medium",
          due_date: item.due_date || null,
          status: "pending" as const,
        }))

        const { error: actionItemsError } = await supabase.from("action_items").insert(actionItemsToInsert)

        if (actionItemsError) {
          console.error("Failed to save action items:", actionItemsError)
        }
      }

      await supabase
        .from("meetings")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", meetingId)

      const { data: actionItems } = await supabase.from("action_items").select("*").eq("meeting_id", meetingId)

      return NextResponse.json({
        success: true,
        summary,
        action_items: actionItems || [],
      })
    } catch (error) {
      console.error("Summary generation error:", error)

      await supabase
        .from("meetings")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", meetingId)

      const errorMessage = error instanceof Error ? error.message : "Summary generation failed"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error("Summary API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
