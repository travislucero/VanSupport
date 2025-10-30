-- ============================================================================
-- Fix Double-Escaped Regex Patterns
-- ============================================================================
-- This script fixes patterns where backslashes have been double-escaped
-- Example: "(?i)\\bdryer\\b" becomes "(?i)\bdryer\b"
--
-- IMPORTANT: Review the changes before running this in production!
-- ============================================================================

-- 1. First, let's see which patterns are affected
SELECT
    id,
    category_slug,
    pattern as old_pattern,
    replace(pattern, '\\b', '\b') as new_pattern_b,
    replace(replace(replace(
        pattern,
        '\\b', '\b'),
        '\\d', '\d'),
        '\\s', '\s'
    ) as new_pattern_all,
    priority,
    is_active
FROM topic_patterns
WHERE
    pattern LIKE '%\\b%'
    OR pattern LIKE '%\\d%'
    OR pattern LIKE '%\\s%'
    OR pattern LIKE '%\\w%'
    OR pattern LIKE '%\\W%'
    OR pattern LIKE '%\\D%'
    OR pattern LIKE '%\\S%'
ORDER BY priority;

-- 2. Update patterns to fix double-escaped regex metacharacters
-- This replaces common double-escaped sequences with their correct single-backslash versions
--
-- Common regex escape sequences:
-- \b = word boundary
-- \d = digit
-- \s = whitespace
-- \w = word character
-- \W = non-word character
-- \D = non-digit
-- \S = non-whitespace

-- UNCOMMENT THIS BLOCK AFTER REVIEWING THE PREVIEW ABOVE:
/*
UPDATE topic_patterns
SET
    pattern = replace(
        replace(
            replace(
                replace(
                    replace(
                        replace(
                            replace(
                                pattern,
                                '\\b', '\b'),
                            '\\d', '\d'),
                        '\\s', '\s'),
                    '\\w', '\w'),
                '\\W', '\W'),
            '\\D', '\D'),
        '\\S', '\S'),
    updated_at = NOW()
WHERE
    pattern LIKE '%\\b%'
    OR pattern LIKE '%\\d%'
    OR pattern LIKE '%\\s%'
    OR pattern LIKE '%\\w%'
    OR pattern LIKE '%\\W%'
    OR pattern LIKE '%\\D%'
    OR pattern LIKE '%\\S%';
*/

-- 3. Verify the fix worked
-- Run this after uncommenting and executing the UPDATE above
/*
SELECT
    id,
    category_slug,
    pattern,
    priority,
    is_active,
    -- Test the pattern with a sample string
    'The dryer stopped working.' ~ pattern as test_match
FROM topic_patterns
WHERE category_slug = 'water' OR category_slug = 'grooming_equipment'
ORDER BY priority;
*/

-- 4. Test specific patterns to ensure they work correctly
/*
-- Should return TRUE if pattern is correct (single backslash)
SELECT
    'The dryer stopped working.' ~ '(?i)\bdryer\b.*\bwork' as correct_pattern_test,
    'The dryer stopped working.' ~ '(?i)\\bdryer\\b.*\\bwork' as double_escaped_test;
-- Expected: correct_pattern_test = true, double_escaped_test = false
*/

-- ============================================================================
-- USAGE INSTRUCTIONS:
-- ============================================================================
-- 1. First run the SELECT query (#1) to preview affected patterns
-- 2. Review the old_pattern vs new_pattern_all columns
-- 3. If the changes look correct, uncomment the UPDATE block (#2)
-- 4. Run the UPDATE block to fix the patterns
-- 5. Run the verification query (#3) to confirm the fix worked
-- 6. Test specific patterns with query (#4)
-- ============================================================================
