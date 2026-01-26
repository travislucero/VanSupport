-- Agentic SMS Routing - Database Setup
-- Creates table and functions for multi-conversation disambiguation

-- =============================================================================
-- TABLE: sms_routing_state
-- Tracks confirmation state for SMS routing when multiple conversations exist
-- =============================================================================
CREATE TABLE IF NOT EXISTS sms_routing_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    -- State machine: awaiting_message -> awaiting_confirmation -> awaiting_selection
    state TEXT NOT NULL DEFAULT 'awaiting_message',
    -- The routing decision the agent wants to confirm
    pending_action JSONB,
    -- All active conversations found for this phone
    conversation_options JSONB,
    -- After confirmation, which conversation was selected
    selected_conversation_id UUID,
    selected_conversation_type TEXT, -- 'sequence' or 'ticket'
    -- Track failed confirmation attempts
    confirmation_attempts INTEGER DEFAULT 0,
    -- Original message that triggered routing
    original_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Auto-expire stale routing states after 30 minutes
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes'
);

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_sms_routing_state_phone
    ON sms_routing_state(phone_number);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_sms_routing_state_expires
    ON sms_routing_state(expires_at);

-- Unique constraint: only one active routing state per phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_routing_state_active_phone
    ON sms_routing_state(phone_number)
    WHERE state != 'completed';

-- =============================================================================
-- FUNCTION: get_all_active_conversations
-- Returns ALL active sequences AND open tickets for a phone number
-- Unlike the existing queries that use LIMIT 1
-- =============================================================================
CREATE OR REPLACE FUNCTION get_all_active_conversations(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'sequences', COALESCE((
            SELECT jsonb_agg(seq_data ORDER BY seq_data->>'last_interaction' DESC)
            FROM (
                SELECT jsonb_build_object(
                    'id', ss.id,
                    'type', 'sequence',
                    'sequence_key', ss.sequence_key,
                    'sequence_name', sm.display_name,
                    'current_step', ss.current_step,
                    'current_step_message', ds.message_template,
                    'success_triggers', ds.success_triggers,
                    'failure_triggers', ds.failure_triggers,
                    'handoff_trigger', ds.handoff_trigger,
                    'van_id', ss.van_id,
                    'van_number', v.van_number,
                    'van_make', v.make,
                    'van_year', v.year,
                    'started_at', ss.started_at,
                    'last_interaction', ss.last_interaction,
                    'handoff_count', ss.handoff_count,
                    'last_message_sent', (
                        SELECT message_body
                        FROM sms_messages
                        WHERE sequence_session_id = ss.id
                        AND direction = 'outbound'
                        ORDER BY created_at DESC
                        LIMIT 1
                    ),
                    'last_customer_response', (
                        SELECT message_body
                        FROM sms_messages
                        WHERE sequence_session_id = ss.id
                        AND direction = 'inbound'
                        ORDER BY created_at DESC
                        LIMIT 1
                    )
                ) as seq_data
                FROM sequence_sessions ss
                LEFT JOIN vans v ON ss.van_id = v.id
                LEFT JOIN sequences_metadata sm ON ss.sequence_key = sm.sequence_key
                LEFT JOIN doc_sequences ds ON ss.sequence_key = ds.sequence_key
                    AND ss.current_step = ds.step_num
                WHERE normalize_phone(ss.phone_number) = normalize_phone(p_phone)
                AND ss.completed_at IS NULL
            ) sub
        ), '[]'::jsonb),
        'tickets', COALESCE((
            SELECT jsonb_agg(ticket_data ORDER BY ticket_data->>'updated_at' DESC)
            FROM (
                SELECT jsonb_build_object(
                    'id', t.id,
                    'type', 'ticket',
                    'ticket_number', t.ticket_number,
                    'subject', t.subject,
                    'description', t.description,
                    'issue_summary', t.issue_summary,
                    'status', t.status,
                    'urgency', t.urgency,
                    'van_id', t.van_id,
                    'van_number', v.van_number,
                    'van_make', v.make,
                    'van_year', v.year,
                    'created_at', t.created_at,
                    'updated_at', t.updated_at,
                    'last_comment', (
                        SELECT comment_text
                        FROM ticket_comments
                        WHERE ticket_id = t.id
                        ORDER BY created_at DESC
                        LIMIT 1
                    )
                ) as ticket_data
                FROM tickets t
                LEFT JOIN vans v ON t.van_id = v.id
                WHERE (
                    normalize_phone(t.phone) = normalize_phone(p_phone)
                    OR normalize_phone(t.reported_by_phone) = normalize_phone(p_phone)
                )
                AND t.status NOT IN ('resolved', 'closed')
            ) sub
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- =============================================================================
-- FUNCTION: get_routing_state
-- Get current routing state for a phone number
-- =============================================================================
CREATE OR REPLACE FUNCTION get_routing_state(p_phone TEXT)
RETURNS TABLE(
    id UUID,
    state TEXT,
    pending_action JSONB,
    conversation_options JSONB,
    confirmation_attempts INTEGER,
    original_message TEXT,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rs.id,
        rs.state,
        rs.pending_action,
        rs.conversation_options,
        rs.confirmation_attempts,
        rs.original_message,
        rs.expires_at
    FROM sms_routing_state rs
    WHERE normalize_phone(rs.phone_number) = normalize_phone(p_phone)
    AND rs.state != 'completed'
    AND rs.expires_at > NOW()
    ORDER BY rs.created_at DESC
    LIMIT 1;
END;
$$;

-- =============================================================================
-- FUNCTION: upsert_routing_state
-- Create or update routing state for a phone
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_routing_state(
    p_phone TEXT,
    p_state TEXT,
    p_pending_action JSONB DEFAULT NULL,
    p_conversation_options JSONB DEFAULT NULL,
    p_selected_id UUID DEFAULT NULL,
    p_selected_type TEXT DEFAULT NULL,
    p_original_message TEXT DEFAULT NULL,
    p_increment_attempts BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Try to update existing active state
    UPDATE sms_routing_state
    SET
        state = p_state,
        pending_action = COALESCE(p_pending_action, pending_action),
        conversation_options = COALESCE(p_conversation_options, conversation_options),
        selected_conversation_id = COALESCE(p_selected_id, selected_conversation_id),
        selected_conversation_type = COALESCE(p_selected_type, selected_conversation_type),
        original_message = COALESCE(p_original_message, original_message),
        confirmation_attempts = CASE
            WHEN p_increment_attempts THEN confirmation_attempts + 1
            ELSE confirmation_attempts
        END,
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE normalize_phone(phone_number) = normalize_phone(p_phone)
    AND state != 'completed'
    AND expires_at > NOW()
    RETURNING id INTO v_id;

    -- If no existing state, create new one
    IF v_id IS NULL THEN
        INSERT INTO sms_routing_state (
            phone_number, state, pending_action, conversation_options,
            selected_conversation_id, selected_conversation_type, original_message
        ) VALUES (
            p_phone, p_state, p_pending_action, p_conversation_options,
            p_selected_id, p_selected_type, p_original_message
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$;

-- =============================================================================
-- FUNCTION: clear_routing_state
-- Mark routing state as completed (clear it)
-- =============================================================================
CREATE OR REPLACE FUNCTION clear_routing_state(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sms_routing_state
    SET state = 'completed', updated_at = NOW()
    WHERE normalize_phone(phone_number) = normalize_phone(p_phone)
    AND state != 'completed';

    RETURN FOUND;
END;
$$;

-- =============================================================================
-- FUNCTION: cleanup_expired_routing_states
-- Clean up old/expired routing states (run periodically)
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_routing_states()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM sms_routing_state
    WHERE expires_at < NOW()
    OR (state = 'completed' AND updated_at < NOW() - INTERVAL '1 day');

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- =============================================================================
-- Grant permissions (adjust role names as needed)
-- =============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sms_routing_state TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_all_active_conversations TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_routing_state TO your_app_role;
-- GRANT EXECUTE ON FUNCTION upsert_routing_state TO your_app_role;
-- GRANT EXECUTE ON FUNCTION clear_routing_state TO your_app_role;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_routing_states TO your_app_role;
