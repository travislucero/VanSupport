/**
 * Pattern Validation Utilities
 *
 * Ensures regex patterns are correctly formatted before saving to the database.
 * Prevents double-escaping issues with regex metacharacters.
 */

/**
 * Detects if a pattern has double-escaped regex metacharacters
 * @param {string} pattern - The regex pattern to check
 * @returns {boolean} - True if pattern appears to have double-escaping
 */
export function hasDoubleEscaping(pattern) {
  if (!pattern) return false;

  // Check for common double-escaped sequences: \\b, \\d, \\s, \\w, etc.
  const doubleEscapedPattern = /\\\\[bdsSwWDSntrvfBZ0]/;
  return doubleEscapedPattern.test(pattern);
}

/**
 * Fixes double-escaped regex metacharacters
 * @param {string} pattern - The regex pattern to fix
 * @returns {string} - Pattern with single backslashes for regex metacharacters
 */
export function fixDoubleEscaping(pattern) {
  if (!pattern) return pattern;

  // Replace double backslashes before regex metacharacters with single backslashes
  return pattern
    .replace(/\\\\b/g, '\\b')   // word boundary
    .replace(/\\\\d/g, '\\d')   // digit
    .replace(/\\\\s/g, '\\s')   // whitespace
    .replace(/\\\\w/g, '\\w')   // word character
    .replace(/\\\\W/g, '\\W')   // non-word character
    .replace(/\\\\D/g, '\\D')   // non-digit
    .replace(/\\\\S/g, '\\S')   // non-whitespace
    .replace(/\\\\t/g, '\\t')   // tab
    .replace(/\\\\n/g, '\\n')   // newline
    .replace(/\\\\r/g, '\\r')   // carriage return
    .replace(/\\\\v/g, '\\v')   // vertical tab
    .replace(/\\\\f/g, '\\f')   // form feed
    .replace(/\\\\B/g, '\\B')   // not word boundary
    .replace(/\\\\Z/g, '\\Z')   // end of string
    .replace(/\\\\0/g, '\\0');  // null character
}

/**
 * Validates a regex pattern is syntactically correct
 * @param {string} pattern - The regex pattern to validate
 * @param {string} flags - Regex flags (e.g., 'i' for case-insensitive)
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validatePattern(pattern, flags = '') {
  if (!pattern) {
    return { valid: false, error: 'Pattern is required' };
  }

  try {
    // Attempt to create a RegExp to validate syntax
    new RegExp(pattern, flags);
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Validates and optionally fixes a pattern before saving
 * @param {string} pattern - The regex pattern to validate
 * @param {string} flags - Regex flags
 * @param {boolean} autoFix - Whether to automatically fix double-escaping
 * @returns {{pattern: string, valid: boolean, error: string|null, fixed: boolean}}
 */
export function validateAndFixPattern(pattern, flags = '', autoFix = true) {
  let fixed = false;
  let currentPattern = pattern;

  // Check for double-escaping
  if (autoFix && hasDoubleEscaping(pattern)) {
    currentPattern = fixDoubleEscaping(pattern);
    fixed = true;
  }

  // Validate the pattern
  const validation = validatePattern(currentPattern, flags);

  return {
    pattern: currentPattern,
    valid: validation.valid,
    error: validation.error,
    fixed: fixed
  };
}

/**
 * Test a pattern against sample text to ensure it works correctly
 * @param {string} pattern - The regex pattern
 * @param {string} flags - Regex flags
 * @param {string} testText - Sample text to test against
 * @returns {{matches: boolean, error: string|null}}
 */
export function testPattern(pattern, flags, testText) {
  try {
    const regex = new RegExp(pattern, flags);
    const matches = regex.test(testText);
    return { matches, error: null };
  } catch (e) {
    return { matches: false, error: e.message };
  }
}

/**
 * Get example test strings for common issue categories
 * @param {string} category - The issue category
 * @returns {string[]} - Array of test strings
 */
export function getTestStringsForCategory(category) {
  const testStrings = {
    water: [
      'The water pump is not working',
      'No hot water in the shower',
      'Water leak under sink'
    ],
    generator: [
      'Generator won\'t start',
      'Generator making loud noise',
      'Generator not producing power'
    ],
    grooming_equipment: [
      'The dryer stopped working',
      'Hair dryer won\'t turn on',
      'Clipper blade is dull'
    ],
    electrical: [
      'Lights not working',
      'Circuit breaker keeps tripping',
      'No power to outlets'
    ],
    plumbing: [
      'Toilet won\'t flush',
      'Sink is clogged',
      'Shower drain slow'
    ],
    hvac: [
      'AC not cooling',
      'Heater not working',
      'AC making strange noise'
    ]
  };

  return testStrings[category] || [
    'Test string one',
    'Test string two',
    'Test string three'
  ];
}

export default {
  hasDoubleEscaping,
  fixDoubleEscaping,
  validatePattern,
  validateAndFixPattern,
  testPattern,
  getTestStringsForCategory
};
