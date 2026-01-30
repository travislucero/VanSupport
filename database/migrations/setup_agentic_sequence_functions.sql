-- Agentic Sequence Handling Functions
-- These functions support the full agentic workflow where the AI agent
-- makes all routing and interpretation decisions

-- =============================================================================
-- FUNCTION: fn_advance_sequence_step
-- Advances a sequence to the next step and returns the message to send
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_advance_sequence_step(p_sequence_session_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    new_step INTEGER,
    message_template TEXT,
    doc_url TEXT,
    doc_title TEXT,
    sequence_key TEXT,
    is_complete BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_step INTEGER;
    v_sequence_key TEXT;
    v_max_step INTEGER;
    v_new_step INTEGER;
BEGIN
    -- Get current state
    SELECT ss.current_step, ss.sequence_key
    INTO v_current_step, v_sequence_key
    FROM sequence_sessions ss
    WHERE ss.id = p_sequence_session_id
    AND ss.completed_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Sequence not found or already completed'::TEXT,
                            NULL::TEXT, NULL::TEXT, NULL::TEXT, TRUE;
        RETURN;
    END IF;

    -- Get max step for this sequence
    SELECT MAX(ds.step_num) INTO v_max_step
    FROM doc_sequences ds
    WHERE ds.sequence_key = v_sequence_key
    AND ds.is_active = TRUE;

    v_new_step := v_current_step + 1;

    -- Check if we've completed all steps
    IF v_new_step > v_max_step THEN
        -- Mark sequence as complete
        UPDATE sequence_sessions
        SET completed_at = NOW(),
            status = 'completed',
            last_interaction = NOW()
        WHERE id = p_sequence_session_id;

        RETURN QUERY SELECT TRUE, v_new_step,
            'Great! You''ve completed all the troubleshooting steps. If you''re still having issues, reply HELP to create a support ticket.'::TEXT,
            NULL::TEXT, NULL::TEXT, v_sequence_key, TRUE;
        RETURN;
    END IF;

    -- Update to next step
    UPDATE sequence_sessions
    SET current_step = v_new_step,
        last_interaction = NOW()
    WHERE id = p_sequence_session_id;

    -- Return next step info
    RETURN QUERY
    SELECT TRUE, v_new_step, ds.message_template, ds.doc_url, ds.doc_title, v_sequence_key, FALSE
    FROM doc_sequences ds
    WHERE ds.sequence_key = v_sequence_key
    AND ds.step_num = v_new_step
    AND ds.is_active = TRUE;
END;
$$;

-- =============================================================================
-- FUNCTION: fn_complete_sequence_with_message
-- Marks a sequence as successfully completed
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_complete_sequence_with_message(
    p_sequence_session_id UUID,
    p_resolution TEXT DEFAULT 'Customer resolved issue'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    sequence_key TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_sequence_key TEXT;
    v_sequence_name TEXT;
BEGIN
    -- Get sequence info
    SELECT ss.sequence_key, sm.display_name
    INTO v_sequence_key, v_sequence_name
    FROM sequence_sessions ss
    LEFT JOIN sequences_metadata sm ON ss.sequence_key = sm.sequence_key
    WHERE ss.id = p_sequence_session_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Sequence not found'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Mark complete
    UPDATE sequence_sessions
    SET completed_at = NOW(),
        status = 'completed',
        last_interaction = NOW()
    WHERE id = p_sequence_session_id;

    RETURN QUERY SELECT TRUE,
        format('Excellent! Glad we could help resolve your %s issue. If you have any other problems, just give us a call!',
               COALESCE(v_sequence_name, 'equipment'))::TEXT,
        v_sequence_key;
END;
$$;

-- =============================================================================
-- FUNCTION: fn_handoff_to_sequence
-- Hands off from current sequence to a different troubleshooting sequence
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_handoff_to_sequence(
    p_current_session_id UUID,
    p_new_sequence_key TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    new_session_id UUID,
    message_template TEXT,
    doc_url TEXT,
    doc_title TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_phone TEXT;
    v_van_id UUID;
    v_new_session_id UUID;
    v_handoff_count INTEGER;
BEGIN
    -- Get current session info
    SELECT ss.phone_number, ss.van_id, COALESCE(ss.handoff_count, 0)
    INTO v_phone, v_van_id, v_handoff_count
    FROM sequence_sessions ss
    WHERE ss.id = p_current_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Current session not found'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Mark current session as handed off
    UPDATE sequence_sessions
    SET completed_at = NOW(),
        status = 'handed_off',
        last_interaction = NOW()
    WHERE id = p_current_session_id;

    -- Create new session for the handoff sequence
    INSERT INTO sequence_sessions (
        phone_number, sequence_key, current_step, van_id,
        status, started_at, last_interaction, handoff_count
    ) VALUES (
        v_phone, p_new_sequence_key, 1, v_van_id,
        'active', NOW(), NOW(), v_handoff_count + 1
    )
    RETURNING id INTO v_new_session_id;

    -- Return first step of new sequence
    RETURN QUERY
    SELECT TRUE, v_new_session_id, ds.message_template, ds.doc_url, ds.doc_title
    FROM doc_sequences ds
    WHERE ds.sequence_key = p_new_sequence_key
    AND ds.step_num = 1
    AND ds.is_active = TRUE;
END;
$$;

-- =============================================================================
-- FUNCTION: fn_escalate_sequence_to_ticket
-- Creates a support ticket from a sequence that couldn't be resolved
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_escalate_sequence_to_ticket(
    p_sequence_session_id UUID,
    p_escalation_reason TEXT DEFAULT 'Customer requested human support'
)
RETURNS TABLE(
    success BOOLEAN,
    ticket_id UUID,
    ticket_number INTEGER,
    message TEXT,
    owner_name TEXT,
    van_number TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ticket_id UUID;
    v_ticket_number INTEGER;
    v_phone TEXT;
    v_sequence_key TEXT;
    v_sequence_name TEXT;
    v_van_id UUID;
    v_van_number TEXT;
    v_owner_id UUID;
    v_owner_name TEXT;
    v_owner_email TEXT;
    v_current_step INTEGER;
BEGIN
    -- Get session and related info
    SELECT ss.phone_number, ss.sequence_key, ss.van_id, ss.current_step,
           sm.display_name, v.van_number, o.id, o.name, o.email
    INTO v_phone, v_sequence_key, v_van_id, v_current_step,
         v_sequence_name, v_van_number, v_owner_id, v_owner_name, v_owner_email
    FROM sequence_sessions ss
    LEFT JOIN sequences_metadata sm ON ss.sequence_key = sm.sequence_key
    LEFT JOIN vans v ON ss.van_id = v.id
    LEFT JOIN owners o ON v.owner_id = o.id
    WHERE ss.id = p_sequence_session_id
    AND ss.completed_at IS NULL
    FOR UPDATE OF ss;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::INTEGER, 'Session not found'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Mark sequence as escalated
    UPDATE sequence_sessions
    SET completed_at = NOW(),
        status = 'escalated',
        last_interaction = NOW()
    WHERE id = p_sequence_session_id;

    -- Create ticket
    INSERT INTO tickets (
        phone, email, owner_name, owner_id, van_id,
        issue_summary, subject, description,
        status, urgency, priority,
        sequence_session_id, reported_by_phone,
        created_at, updated_at
    ) VALUES (
        v_phone,
        COALESCE(v_owner_email, 'unknown@example.com'),
        COALESCE(v_owner_name, 'Unknown'),
        v_owner_id,
        v_van_id,
        format('SMS Escalation: %s troubleshooting', COALESCE(v_sequence_name, v_sequence_key)),
        format('SMS Escalation: %s - Step %s', COALESCE(v_sequence_name, v_sequence_key), v_current_step),
        format('Escalation Reason: %s\n\nSequence: %s\nStep reached: %s\n\nCustomer was unable to resolve via SMS troubleshooting.',
               p_escalation_reason, COALESCE(v_sequence_name, v_sequence_key), v_current_step),
        'open',
        'high',
        'urgent',
        p_sequence_session_id,
        v_phone,
        NOW(),
        NOW()
    )
    RETURNING tickets.id, tickets.ticket_number INTO v_ticket_id, v_ticket_number;

    RETURN QUERY SELECT TRUE, v_ticket_id, v_ticket_number,
        format('I''ve created support ticket #%s for you. A technician will contact you within 2 hours.',
               v_ticket_number)::TEXT,
        v_owner_name,
        v_van_number;
END;
$$;

-- =============================================================================
-- FUNCTION: fn_get_sequence_context
-- Gets full context for a sequence session (for AI agent)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_get_sequence_context(p_sequence_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session_id', ss.id,
        'sequence_key', ss.sequence_key,
        'sequence_name', sm.display_name,
        'current_step', ss.current_step,
        'van_number', v.van_number,
        'started_at', ss.started_at,
        'last_interaction', ss.last_interaction,
        'current_step_info', jsonb_build_object(
            'message_template', ds.message_template,
            'success_triggers', ds.success_triggers,
            'failure_triggers', ds.failure_triggers,
            'handoff_trigger', ds.handoff_trigger,
            'handoff_sequence_key', ds.handoff_sequence_key,
            'doc_url', ds.doc_url
        ),
        'available_handoffs', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'trigger_label', sht.trigger_label,
                'target_sequence_key', sht.target_sequence_key,
                'target_sequence_name', sm2.display_name
            )), '[]'::jsonb)
            FROM step_handoff_triggers sht
            LEFT JOIN sequences_metadata sm2 ON sht.target_sequence_key = sm2.sequence_key
            WHERE sht.sequence_key = ss.sequence_key
            AND sht.step_num = ss.current_step
            AND sht.is_active = TRUE
        )
    )
    INTO v_result
    FROM sequence_sessions ss
    LEFT JOIN sequences_metadata sm ON ss.sequence_key = sm.sequence_key
    LEFT JOIN vans v ON ss.van_id = v.id
    LEFT JOIN doc_sequences ds ON ss.sequence_key = ds.sequence_key AND ss.current_step = ds.step_num
    WHERE ss.id = p_sequence_session_id;

    RETURN v_result;
END;
$$;

-- =============================================================================
-- FUNCTION: fn_log_sequence_sms
-- Logs an SMS message for a sequence
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_log_sequence_sms(
    p_sequence_session_id UUID,
    p_from_phone TEXT,
    p_to_phone TEXT,
    p_message_body TEXT,
    p_direction TEXT DEFAULT 'outbound'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO sms_messages (
        sequence_session_id, from_phone, to_phone,
        message_body, direction, created_at
    ) VALUES (
        p_sequence_session_id, p_from_phone, p_to_phone,
        p_message_body, p_direction, NOW()
    )
    RETURNING id INTO v_id;

    -- Update last interaction
    UPDATE sequence_sessions
    SET last_interaction = NOW()
    WHERE id = p_sequence_session_id;

    RETURN v_id;
END;
$$;
