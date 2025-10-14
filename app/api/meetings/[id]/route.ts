import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await getSupabaseServerClient()

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (meetingError) {
      console.error("Meeting query error:", meetingError)
      return NextResponse.json({ error: `Database error: ${meetingError.message}` }, { status: 500 })
    }

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    const { data: transcripts } = await supabase
      .from("transcripts")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at", { ascending: false })
      .limit(1)

    const transcript = transcripts && transcripts.length > 0 ? transcripts[0] : null

    const { data: summaries } = await supabase
      .from("summaries")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at", { ascending: false })
      .limit(1)

    const summary = summaries && summaries.length > 0 ? summaries[0] : null

    const { data: actionItems } = await supabase.from("action_items").select("*").eq("meeting_id", id)

    return NextResponse.json({
      meeting,
      transcript,
      summary,
      action_items: actionItems || [],
    })
  } catch (error) {
    console.error("Meeting details API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
