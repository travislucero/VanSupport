-- Script to delete all tickets and sequences from the database
-- WARNING: This will permanently delete all tickets and sequences data!
-- Run this in Supabase SQL Editor

-- ============================================
-- FIRST: Verify what tables exist in your schema
-- ============================================
-- Uncomment and run this first to see your actual tables:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================
-- DELETE TICKETS AND RELATED DATA
-- ============================================

-- Delete ticket attachments first (child table)
DELETE FROM ticket_attachments;

-- Delete all tickets
DELETE FROM tickets;

-- ============================================
-- DELETE SEQUENCES AND RELATED DATA
-- ============================================

-- Delete SMS messages (references sequence_sessions)
DELETE FROM sms_messages;

-- Delete sequence sessions
DELETE FROM sequence_sessions;

-- Delete topic patterns (trigger patterns for sequences)
DELETE FROM topic_patterns;

-- Delete session events
DELETE FROM session_events;

-- Delete sessions
DELETE FROM sessions;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify all data has been deleted:
SELECT 'tickets' as table_name, COUNT(*) as remaining_rows FROM tickets
UNION ALL
SELECT 'ticket_attachments', COUNT(*) FROM ticket_attachments
UNION ALL
SELECT 'sequence_sessions', COUNT(*) FROM sequence_sessions
UNION ALL
SELECT 'sms_messages', COUNT(*) FROM sms_messages
UNION ALL
SELECT 'topic_patterns', COUNT(*) FROM topic_patterns
UNION ALL
SELECT 'session_events', COUNT(*) FROM session_events
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;

-- ============================================
-- NOTES
-- ============================================
-- Tables deleted:
-- 1. ticket_attachments (child of tickets)
-- 2. tickets (main tickets table)
-- 3. sms_messages (SMS conversation messages)
-- 4. sequence_sessions (active troubleshooting sessions)
-- 5. topic_patterns (trigger patterns linking issues to sequences)
-- 6. session_events (session event logs)
-- 7. sessions (main sessions table)
--
-- Note: Sequences themselves are managed via database functions
-- (fn_delete_sequence, etc.) and may be stored differently.
-- If you need to delete sequence definitions, use the admin UI
-- or call the fn_delete_sequence function for each sequence.
