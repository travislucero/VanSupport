-- Sample data for VanSupport database
-- IMPORTANT: Run get-schema.sql first to verify column names match your actual schema
-- Adjust column names and data types based on your actual schema

-- ========================================
-- 1. VANS TABLE
-- ========================================
-- Common columns: id, van_name, license_plate, model, year, status
INSERT INTO vans (van_name, license_plate, model, year, status, created_at)
VALUES
  ('Van Alpha', 'ABC-1234', 'Ford Transit', 2022, 'active', NOW()),
  ('Van Beta', 'XYZ-5678', 'Mercedes Sprinter', 2021, 'active', NOW()),
  ('Van Gamma', 'DEF-9012', 'RAM ProMaster', 2023, 'active', NOW()),
  ('Van Delta', 'GHI-3456', 'Ford Transit', 2020, 'maintenance', NOW())
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. SESSIONS TABLE
-- ========================================
-- Common columns: id, van_id, user_id, start_time, end_time, status, issue_type
INSERT INTO sessions (van_id, user_id, start_time, end_time, status, issue_type, resolution_time, created_at)
SELECT
  v.id,
  'user_' || (random() * 100)::int,
  NOW() - (random() * 30 || ' days')::interval,
  NOW() - (random() * 30 || ' days')::interval + (random() * 120 || ' minutes')::interval,
  CASE WHEN random() < 0.8 THEN 'resolved' ELSE 'pending' END,
  (ARRAY['connectivity', 'hardware', 'software', 'config'])[floor(random() * 4 + 1)],
  (random() * 60)::int,
  NOW() - (random() * 30 || ' days')::interval
FROM vans v
CROSS JOIN generate_series(1, 5)
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. SEQUENCE_SESSIONS TABLE
-- ========================================
-- Common columns: id, session_id, sequence_key, step_number, step_name, completed
INSERT INTO sequence_sessions (session_id, sequence_key, step_number, step_name, completed, created_at)
SELECT
  s.id,
  'troubleshoot_' || (random() * 3)::int,
  step_num,
  'Step ' || step_num || ': ' || step_name,
  CASE WHEN random() < 0.7 THEN true ELSE false END,
  s.created_at
FROM sessions s
CROSS JOIN (
  SELECT 1 as step_num, 'Initial Check' as step_name
  UNION ALL SELECT 2, 'Diagnostics'
  UNION ALL SELECT 3, 'Repair Attempt'
  UNION ALL SELECT 4, 'Verification'
  UNION ALL SELECT 5, 'Final Check'
) steps
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. SESSION_EVENTS TABLE (we know this exists)
-- ========================================
-- Common columns: id, session_id, event_type, event_data, timestamp
INSERT INTO session_events (session_id, event_type, event_data, created_at)
SELECT
  s.id,
  (ARRAY['started', 'updated', 'resolved', 'failed'])[floor(random() * 4 + 1)],
  jsonb_build_object(
    'message', 'Event generated for testing',
    'severity', (ARRAY['info', 'warning', 'error'])[floor(random() * 3 + 1)]
  ),
  s.created_at + (random() * 60 || ' minutes')::interval
FROM sessions s
CROSS JOIN generate_series(1, 3)
ON CONFLICT DO NOTHING;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Check the data was inserted
SELECT 'Vans' as table_name, COUNT(*) as row_count FROM vans
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Sequence Sessions', COUNT(*) FROM sequence_sessions
UNION ALL
SELECT 'Session Events', COUNT(*) FROM session_events;

-- Sample query to verify relationships
SELECT
  v.van_name,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'resolved' THEN s.id END) as resolved_sessions,
  AVG(s.resolution_time) as avg_resolution_time
FROM vans v
LEFT JOIN sessions s ON v.id = s.van_id
GROUP BY v.van_name
ORDER BY v.van_name;
