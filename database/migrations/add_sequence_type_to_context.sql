-- Add sequence_type to fn_get_sequence_context
-- Allows the AI agent to differentiate linear vs troubleshooting behavior

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
        'sequence_type', COALESCE(sm.sequence_type, 'troubleshooting'),
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
