-- Script to delete all tickets and sequences from the database
-- WARNING: This will permanently delete all tickets and sequences data!
-- Run this in Supabase SQL Editor

-- ============================================
-- DELETE TICKETS AND RELATED DATA
-- ============================================

-- Delete ticket comments (if they exist as a separate table)
-- Note: Based on the schema, comments might be stored differently
-- DELETE FROM ticket_comments;

-- Delete ticket attachments first (child table)
DELETE FROM ticket_attachments;

-- Delete all tickets
DELETE FROM tickets;

-- ============================================
-- DELETE SEQUENCES AND RELATED DATA
-- ============================================

-- Delete SMS messages (references sequence_sessions)
DELETE FROM sms_messages;

-- Delete sequence sessions (references sequences and vans)
DELETE FROM sequence_sessions;

-- Delete topic patterns (references sequences)
DELETE FROM topic_patterns;

-- Delete sequence tools (references sequences)
DELETE FROM sequence_tools;

-- Delete sequence parts (references sequences)
DELETE FROM sequence_parts;

-- Delete sequence steps (references sequences)
DELETE FROM sequence_steps;

-- Delete sequences (main table)
DELETE FROM sequences;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify all data has been deleted:
SELECT 'tickets' as table_name, COUNT(*) as remaining_rows FROM tickets
UNION ALL
SELECT 'ticket_attachments', COUNT(*) FROM ticket_attachments
UNION ALL
SELECT 'sequences', COUNT(*) FROM sequences
UNION ALL
SELECT 'sequence_sessions', COUNT(*) FROM sequence_sessions
UNION ALL
SELECT 'sequence_steps', COUNT(*) FROM sequence_steps
UNION ALL
SELECT 'sequence_tools', COUNT(*) FROM sequence_tools
UNION ALL
SELECT 'sequence_parts', COUNT(*) FROM sequence_parts
UNION ALL
SELECT 'topic_patterns', COUNT(*) FROM topic_patterns
UNION ALL
SELECT 'sms_messages', COUNT(*) FROM sms_messages;

-- ============================================
-- NOTES
-- ============================================
-- This script deletes data in the following order:
-- 1. Ticket attachments (child of tickets)
-- 2. Tickets (main table)
-- 3. SMS messages (child of sequence_sessions)
-- 4. Sequence sessions (child of sequences)
-- 5. Topic patterns (references sequences)
-- 6. Sequence tools (child of sequences)
-- 7. Sequence parts (child of sequences)
-- 8. Sequence steps (child of sequences)
-- 9. Sequences (main table)
--
-- This order respects foreign key constraints and ensures clean deletion.
-- The verification queries at the end will show 0 rows for all tables if successful.
