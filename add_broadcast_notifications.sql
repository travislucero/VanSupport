-- Add broadcast notification preference to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_new_tickets BOOLEAN DEFAULT false;

-- Add read tracking to ticket_notifications for in-app notifications
ALTER TABLE ticket_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Index for efficient unread notification queries per user
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_unread_user
  ON ticket_notifications (recipient_user_id, read_at)
  WHERE read_at IS NULL;
