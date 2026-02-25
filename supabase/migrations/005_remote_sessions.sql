-- Remote Sessions table for multi-device handoff
-- Enables starting tasks on one device and reviewing/approving from another.

CREATE TABLE IF NOT EXISTS remote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('swarm', 'iterate', 'optimize', 'critique')),
  task_input TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'awaiting_review', 'approved', 'cancelled', 'completed', 'error')
  ),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Index for user's active sessions
CREATE INDEX idx_remote_sessions_user_active
  ON remote_sessions (user_id, expires_at DESC)
  WHERE status NOT IN ('completed', 'cancelled', 'error');

-- RLS policies
ALTER TABLE remote_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own sessions"
  ON remote_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON remote_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON remote_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE remote_sessions;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_remote_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER remote_sessions_updated_at
  BEFORE UPDATE ON remote_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_remote_session_timestamp();
