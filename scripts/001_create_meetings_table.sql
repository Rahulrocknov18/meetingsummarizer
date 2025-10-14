-- Create meetings table to store meeting metadata
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  audio_url TEXT,
  audio_filename VARCHAR(255),
  duration_seconds INTEGER,
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, transcribing, transcribed, summarizing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
