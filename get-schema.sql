-- Run this in Supabase SQL Editor to get the table schemas

-- Get sessions table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- Get sequence_sessions table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sequence_sessions'
ORDER BY ordinal_position;

-- Get vans table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vans'
ORDER BY ordinal_position;

-- Get session_events table structure (we know this exists)
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'session_events'
ORDER BY ordinal_position;

-- Show all tables in your schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
