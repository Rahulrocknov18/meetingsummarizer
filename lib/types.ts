export interface Meeting {
  id: string
  title: string
  audio_url: string | null
  audio_filename: string | null
  duration_seconds: number | null
  status: "uploaded" | "transcribing" | "transcribed" | "summarizing" | "completed" | "failed"
  created_at: string
  updated_at: string
}

export interface Transcript {
  id: string
  meeting_id: string
  full_text: string
  language: string
  confidence_score: number | null
  created_at: string
}

export interface Summary {
  id: string
  meeting_id: string
  summary_text: string
  key_decisions: string[]
  participants: string[]
  created_at: string
}

export interface ActionItem {
  id: string
  meeting_id: string
  task_description: string
  assignee: string | null
  due_date: string | null
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "completed"
  created_at: string
}

export interface MeetingWithDetails extends Meeting {
  transcript?: Transcript
  summary?: Summary
  action_items?: ActionItem[]
}
