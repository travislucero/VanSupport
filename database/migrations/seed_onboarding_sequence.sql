-- Seed: Onboarding Sequence
-- 4-step onboarding guide for franchise mobile pet grooming van owners
-- Includes video URLs and tools (no parts)

-- =============================================================================
-- Add sequence_type column (idempotent)
-- =============================================================================
ALTER TABLE sequences_metadata
    ADD COLUMN IF NOT EXISTS sequence_type TEXT NOT NULL DEFAULT 'troubleshooting';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_sequence_type'
    ) THEN
        ALTER TABLE sequences_metadata
            ADD CONSTRAINT chk_sequence_type
            CHECK (sequence_type IN ('linear', 'troubleshooting'));
    END IF;
END $$;

BEGIN;

-- =============================================================================
-- 0. Cleanup existing onboarding data (makes this script re-runnable)
-- =============================================================================
-- Nullify SMS references to onboarding sessions (NO ACTION FK)
UPDATE sms_messages SET sequence_session_id = NULL
WHERE sequence_session_id IN (
    SELECT id FROM sequence_sessions WHERE sequence_key = 'onboarding'
);
-- Step responses cascade from sequence_sessions, but delete explicitly for clarity
DELETE FROM sequence_step_responses WHERE sequence_session_id IN (
    SELECT id FROM sequence_sessions WHERE sequence_key = 'onboarding'
);
DELETE FROM sequence_sessions WHERE sequence_key = 'onboarding';
DELETE FROM sequence_tools WHERE sequence_key = 'onboarding';
DELETE FROM doc_sequences WHERE sequence_key = 'onboarding';
DELETE FROM sequences_metadata WHERE sequence_key = 'onboarding';
DELETE FROM topic_patterns WHERE action_key = 'onboarding';

-- =============================================================================
-- 1. Sequence Metadata
-- =============================================================================
INSERT INTO sequences_metadata (
    sequence_key, display_name, description, category,
    is_active, created_by, sort_order,
    estimated_duration_minutes, icon, tags,
    sequence_type,
    created_at, updated_at
) VALUES (
    'onboarding',
    'New Van Onboarding',
    'Step-by-step guide for franchise owners to power up, test, and learn their new mobile pet grooming van',
    'Onboarding',
    TRUE,
    'system',
    1,
    45,
    'truck',
    ARRAY['onboarding', 'new-van', 'setup'],
    'linear',
    NOW(),
    NOW()
);

-- =============================================================================
-- 2. Sequence Steps
-- =============================================================================

-- Step 1: Power System Startup
INSERT INTO doc_sequences (
    sequence_key, step_num, message_template,
    doc_url, doc_title,
    wait_for_response, success_triggers, failure_triggers,
    timeout_minutes,
    is_active, created_at, updated_at
) VALUES (
    'onboarding', 1,
    'Welcome to your new grooming van! Let''s start by powering up. Locate the main power panel (usually near the rear door) and switch on the generator or inverter system. Once the power indicator light turns green, test an outlet by plugging in a small device. Watch this video for a walkthrough: {url}',
    'https://www.youtube.com/watch?v=kXybHj4eDLQ',
    'Mobile Grooming Van Tour & Power Startup',
    TRUE,
    ARRAY['NEXT', 'DONE', 'READY', 'OK', 'YES', 'GOT IT', 'ALL SET'],
    ARRAY['HELP', 'STUCK', 'PROBLEM', 'CALL ME'],
    15,
    TRUE,
    NOW(),
    NOW()
);

-- Step 2: Water System Activation
INSERT INTO doc_sequences (
    sequence_key, step_num, message_template,
    doc_url, doc_title,
    wait_for_response, success_triggers, failure_triggers,
    timeout_minutes,
    is_active, created_at, updated_at
) VALUES (
    'onboarding', 2,
    'Great job! Next, let''s get the water system running. Connect your garden hose to the fresh water inlet and fill the tank. Then switch on the water heater (propane or electric) and turn on the water pump. Wait a few minutes, then test hot and cold water at the tub faucet. Check out this guide: {url}',
    'https://wagntails.com/vehicles/supreme-groom-van/',
    'Grooming Van Water System & Plumbing Guide',
    TRUE,
    ARRAY['NEXT', 'DONE', 'READY', 'OK', 'YES', 'GOT IT', 'ALL SET'],
    ARRAY['HELP', 'STUCK', 'PROBLEM', 'CALL ME'],
    20,
    TRUE,
    NOW(),
    NOW()
);

-- Step 3: Grooming Equipment Test
INSERT INTO doc_sequences (
    sequence_key, step_num, message_template,
    doc_url, doc_title,
    wait_for_response, success_triggers, failure_triggers,
    timeout_minutes,
    is_active, created_at, updated_at
) VALUES (
    'onboarding', 3,
    'Awesome, water is flowing! Now let''s test your grooming equipment. Raise and lower the grooming table using the foot pedal. Turn on the high-velocity dryer and check all speed settings. Test the vacuum system if equipped. Make sure all grooming arm clamps are secure. See the equipment overview here: {url}',
    'https://gryphontrailers.com/2025/08/11/mobile-grooming-vans-guide/',
    'Mobile Grooming Van Equipment Overview',
    TRUE,
    ARRAY['NEXT', 'DONE', 'READY', 'OK', 'YES', 'GOT IT', 'ALL SET'],
    ARRAY['HELP', 'STUCK', 'PROBLEM', 'CALL ME'],
    15,
    TRUE,
    NOW(),
    NOW()
);

-- Step 4: Climate Control & Safety Check
INSERT INTO doc_sequences (
    sequence_key, step_num, message_template,
    doc_url, doc_title,
    wait_for_response, success_triggers, failure_triggers,
    timeout_minutes,
    is_active, created_at, updated_at
) VALUES (
    'onboarding', 4,
    'Almost done! For the final step, test the A/C and heating systems - set the thermostat and confirm air is blowing. Check that all LED lights work, exhaust fans spin, and ventilation is flowing. Finally, locate your first aid kit and fire extinguisher. Take a look at this reference: {url}',
    'https://wetnosesgrooming.com/tour-the-mobile-grooming-vans/',
    'Van Safety & Climate Control Walkthrough',
    TRUE,
    ARRAY['NEXT', 'DONE', 'READY', 'OK', 'YES', 'GOT IT', 'ALL SET'],
    ARRAY['HELP', 'STUCK', 'PROBLEM', 'CALL ME'],
    15,
    TRUE,
    NOW(),
    NOW()
);

-- =============================================================================
-- 3. Sequence Tools (2 per step, no parts)
-- =============================================================================

-- Step 1 Tools
INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 1,
    'Multimeter',
    'For testing electrical outlets and verifying voltage output',
    'https://www.amazon.com/dp/B01ISAMUA6',
    TRUE, 1, NOW(), NOW()
);

INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 1,
    'Power Strip with Surge Protector',
    'For safely testing multiple outlets during power verification',
    'https://www.amazon.com/dp/B00TP1C51M',
    FALSE, 2, NOW(), NOW()
);

-- Step 2 Tools
INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 2,
    'Garden Hose (25ft)',
    'For connecting to fresh water inlet to fill the onboard tank',
    'https://www.amazon.com/dp/B07THMVFBZ',
    TRUE, 1, NOW(), NOW()
);

INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 2,
    'Water Pressure Gauge',
    'For checking water pump PSI at the tub faucet',
    'https://www.amazon.com/dp/B018WHAOG4',
    FALSE, 2, NOW(), NOW()
);

-- Step 3 Tools
INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 3,
    'Torpedo Level',
    'For ensuring the grooming table is level and stable',
    'https://www.amazon.com/dp/B0000224VU',
    FALSE, 1, NOW(), NOW()
);

INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 3,
    'Dryer Filter Brush',
    'For cleaning the high-velocity dryer intake filter before first use',
    'https://www.amazon.com/dp/B0BSHF6GR7',
    TRUE, 2, NOW(), NOW()
);

-- Step 4 Tools
INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 4,
    'Infrared Thermometer',
    'For verifying A/C and heater output temperatures',
    'https://www.amazon.com/dp/B00DMI632G',
    FALSE, 1, NOW(), NOW()
);

INSERT INTO sequence_tools (
    id, sequence_key, step_num, tool_name, tool_description,
    tool_link, is_required, sort_order, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding', 4,
    'LED Inspection Flashlight',
    'For checking under-cabinet areas and verifying all lighting works',
    'https://www.amazon.com/dp/B07FKJDLDL',
    TRUE, 2, NOW(), NOW()
);

-- =============================================================================
-- 4. Topic Patterns (trigger phrases for find_best_pattern_match)
-- =============================================================================

-- Direct mentions of onboarding / setup
INSERT INTO topic_patterns (
    id, category_slug, pattern, flags, priority,
    action_type, action_key, entry_step_id, is_active,
    created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding',
    '\bonboard(ing)?\b',
    'i', 90, 'sequence', 'onboarding', NULL, TRUE, NOW(), NOW()
);

-- "new van" / "just got my van" / "brand new van"
INSERT INTO topic_patterns (
    id, category_slug, pattern, flags, priority,
    action_type, action_key, entry_step_id, is_active,
    created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding',
    '\b(new|just got|brand new|picked up)\b.{0,20}\bvan\b',
    'i', 95, 'sequence', 'onboarding', NULL, TRUE, NOW(), NOW()
);

-- "set up my van" / "setting up" / "help me set up"
INSERT INTO topic_patterns (
    id, category_slug, pattern, flags, priority,
    action_type, action_key, entry_step_id, is_active,
    created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding',
    '\bset(ting)?\s*(up|it up)\b.{0,20}\bvan\b',
    'i', 100, 'sequence', 'onboarding', NULL, TRUE, NOW(), NOW()
);

-- "getting started" / "first time" / "where do I start"
INSERT INTO topic_patterns (
    id, category_slug, pattern, flags, priority,
    action_type, action_key, entry_step_id, is_active,
    created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding',
    '\b(getting started|first time|where do i start|how do i start)\b',
    'i', 100, 'sequence', 'onboarding', NULL, TRUE, NOW(), NOW()
);

-- "walk me through" / "walkthrough" for the van
INSERT INTO topic_patterns (
    id, category_slug, pattern, flags, priority,
    action_type, action_key, entry_step_id, is_active,
    created_at, updated_at
) VALUES (
    gen_random_uuid(), 'onboarding',
    '\b(walk\s*(me\s+)?through|walkthrough)\b.{0,20}\bvan\b',
    'i', 105, 'sequence', 'onboarding', NULL, TRUE, NOW(), NOW()
);

COMMIT;
