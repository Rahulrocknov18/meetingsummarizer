-- Create summaries table to store AI-generated summaries
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  key_decisions TEXT[],
  participants TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for meeting_id lookups
CREATE INDEX IF NOT EXISTS idx_summaries_meeting_id ON summaries(meeting_id);
