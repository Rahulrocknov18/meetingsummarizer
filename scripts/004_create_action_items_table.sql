-- Create action_items table to store extracted tasks
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  assignee VARCHAR(255),
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority);
