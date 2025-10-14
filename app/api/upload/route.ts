import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("audio") as File
    const title = formData.get("title") as string

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/m4a",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/webm",
      "audio/ogg",
      "audio/flac",
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Please upload an audio file (MP3, WAV, M4A, AAC, etc.).`,
        },
        { status: 400 },
      )
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB. Please compress your audio file before uploading." },
        { status: 400 },
      )
    }

    let supabase
    try {
      supabase = getSupabaseAdmin()
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error)
      return NextResponse.json(
        {
          error: "Failed to connect to database. Please check your Supabase credentials in .env.local",
        },
        { status: 500 },
      )
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `meetings/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type })

    let uploadData
    let uploadError
    try {
      const result = await supabase.storage.from("audio-files").upload(filePath, blob, {
        contentType: file.type,
        upsert: false,
      })
      uploadData = result.data
      uploadError = result.error
    } catch (uploadException: any) {
      // Handle cases where Supabase returns non-JSON responses
      console.error("Supabase upload exception:", uploadException)

      const errorMessage = uploadException?.message || String(uploadException)

      if (
        errorMessage.includes("JSON") ||
        errorMessage.includes("Request Entity") ||
        errorMessage.includes("Unexpected token")
      ) {
        return NextResponse.json(
          {
            error:
              "File upload failed. This usually means the file is too large or there's a network issue. Please try compressing your audio file to under 15MB.",
          },
          { status: 413 },
        )
      }

      return NextResponse.json(
        {
          error: `Upload failed: ${errorMessage}`,
        },
        { status: 500 },
      )
    }

    if (uploadError) {
      console.error("Upload error:", uploadError)

      if (uploadError.message.includes("Bucket not found")) {
        return NextResponse.json(
          {
            error: "Storage bucket not configured. Please run the setup script: scripts/000_setup_storage.sql",
          },
          { status: 500 },
        )
      }

      if (uploadError.message.includes("size") || uploadError.message.includes("large")) {
        return NextResponse.json(
          {
            error: "File is too large. Please compress your audio to under 15MB before uploading.",
          },
          { status: 413 },
        )
      }

      return NextResponse.json(
        {
          error: `Failed to upload file: ${uploadError.message}`,
        },
        { status: 500 },
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("audio-files").getPublicUrl(filePath)

    // Create meeting record in database
    const { data: meeting, error: dbError } = await supabase
      .from("meetings")
      .insert({
        title: title || file.name,
        audio_url: publicUrl,
        audio_filename: file.name,
        status: "uploaded",
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)

      if (dbError.message.includes("relation") && dbError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database tables not set up. Please run all SQL scripts in the scripts folder.",
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error: `Failed to create meeting record: ${dbError.message}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (errorMessage.includes("JSON") || errorMessage.includes("Unexpected token")) {
      return NextResponse.json(
        {
          error:
            "File upload failed due to server limits. Please compress your audio file to under 15MB and try again.",
        },
        { status: 413 },
      )
    }

    return NextResponse.json(
      {
        error: "Upload failed. Please ensure your file is under 50MB and try again.",
      },
      { status: 500 },
    )
  }
}
