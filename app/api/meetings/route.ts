import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch meetings:", error)
      return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 })
    }

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error("Meetings API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
