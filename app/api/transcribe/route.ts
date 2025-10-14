import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import Groq from "groq-sdk"

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

    const { data: existingTranscript } = await supabase
      .from("transcripts")
      .select("id")
      .eq("meeting_id", meetingId)
      .maybeSingle()

    if (existingTranscript) {
      return NextResponse.json({
        success: true,
        message: "Transcript already exists",
        transcript: existingTranscript,
      })
    }

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .single()

    if (meetingError || !meeting) {
      console.error("Meeting not found:", meetingError)
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    if (!meeting.audio_url) {
      return NextResponse.json({ error: "No audio file found for this meeting" }, { status: 400 })
    }

    await supabase
      .from("meetings")
      .update({ status: "transcribing", updated_at: new Date().toISOString() })
      .eq("id", meetingId)

    try {
      const audioResponse = await fetch(meeting.audio_url)

      if (!audioResponse.ok) {
        console.error("Audio download failed:", audioResponse.status, audioResponse.statusText)
        throw new Error(`Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}`)
      }

      const audioBlob = await audioResponse.blob()

      const audioFile = new File([audioBlob], meeting.audio_filename || "audio.mp3", {
        type: audioBlob.type || "audio/mpeg",
      })

      let transcription: {
        text: string
        language?: string
        duration?: number
      }
      try {
        transcription = (await groq.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-large-v3-turbo",
          language: "en",
          response_format: "verbose_json",
        })) as any
      } catch (groqError: any) {
        console.error("Groq API error:", groqError)

        if (groqError.status === 429 || groqError.message?.includes("rate_limit_exceeded")) {
          const waitTime = groqError.message?.match(/Please try again in (\d+m\d+\.?\d*s)/)?.[1] || "a few minutes"
          return NextResponse.json(
            {
              error: `Rate limit exceeded. Groq's free tier allows 7200 seconds of audio per hour. Please wait ${waitTime} and try again, or upgrade your Groq account.`,
              code: "RATE_LIMIT_EXCEEDED",
              retryAfter: waitTime,
            },
            { status: 429 },
          )
        }

        throw new Error(`Groq Whisper API failed: ${groqError.message}`)
      }

      const { data: transcript, error: transcriptError } = await supabase
        .from("transcripts")
        .insert({
          meeting_id: meetingId,
          full_text: transcription.text,
          language: transcription.language || "en",
        })
        .select()
        .single()

      if (transcriptError) {
        console.error("Failed to save transcript:", transcriptError)
        throw new Error(`Failed to save transcript: ${transcriptError.message}`)
      }

      await supabase
        .from("meetings")
        .update({
          status: "transcribed",
          duration_seconds: Math.round(transcription.duration || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", meetingId)

      return NextResponse.json({
        success: true,
        transcript,
        duration: transcription.duration || 0,
      })
    } catch (error) {
      console.error("Transcription error:", error)

      await supabase
        .from("meetings")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", meetingId)

      const errorMessage = error instanceof Error ? error.message : "Transcription failed"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error("Transcription API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
