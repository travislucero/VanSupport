/**
 * Pattern Validator for Van Support System
 *
 * Validates regex patterns for PostgreSQL POSIX regex compatibility
 * and provides automatic conversion from JavaScript regex syntax.
 *
 * Key Features:
 * - Detects double-escaping (\\b vs \b)
 * - Auto-fixes double-escaped patterns
 * - Converts JavaScript \b to PostgreSQL \y
 * - Validates pattern syntax
 */

class PatternValidator {
  /**
   * Validate a regex pattern for common issues
   * @param {string} pattern - The regex pattern to validate
   * @returns {Object} - Validation result with isValid, hasDoubleEscaping, errors, warnings
   */
  validatePattern(pattern) {
    if (!pattern) {
      return {
        isValid: false,
        hasDoubleEscaping: false,
        errors: ["Pattern is required"],
        warnings: [],
      };
    }

    const errors = [];
    const warnings = [];
    let hasDoubleEscaping = false;

    // Check for double-escaping patterns
    // Looking for \\b, \\d, \\w, \\s, etc. (double backslashes)
    const doubleEscapePattern = /\\\\[bBdDwWsS]/;
    if (doubleEscapePattern.test(pattern)) {
      hasDoubleEscaping = true;
      warnings.push(
        "Pattern contains double-escaped sequences (e.g., \\\\b). These should be single-escaped (\\b)."
      );
    }

    // Check for unbalanced brackets
    const openBrackets = (pattern.match(/\[/g) || []).length;
    const closeBrackets = (pattern.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push("Unbalanced brackets in pattern");
    }

    // Check for unbalanced parentheses
    const openParens = (pattern.match(/\(/g) || []).length;
    const closeParens = (pattern.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push("Unbalanced parentheses in pattern");
    }

    // Warning about JavaScript vs PostgreSQL word boundaries
    if (pattern.includes("\\b") && !hasDoubleEscaping) {
      warnings.push(
        "Pattern uses \\b (word boundary). This will be automatically converted to \\y for PostgreSQL compatibility."
      );
    }

    // Try to create a RegExp to validate syntax (for JavaScript compatibility check)
    try {
      new RegExp(pattern);
    } catch (e) {
      errors.push(`Invalid regex syntax: ${e.message}`);
    }

    return {
      isValid: errors.length === 0,
      hasDoubleEscaping,
      errors,
      warnings,
    };
  }

  /**
   * Fix double-escaping in a pattern
   * Converts \\b to \b, \\d to \d, etc.
   * @param {string} pattern - The pattern with potential double-escaping
   * @returns {string} - Fixed pattern
   */
  fixDoubleEscaping(pattern) {
    if (!pattern) return pattern;

    // Replace double backslashes before special chars with single backslash
    return pattern
      .replace(/\\\\b/g, "\\b")
      .replace(/\\\\B/g, "\\B")
      .replace(/\\\\d/g, "\\d")
      .replace(/\\\\D/g, "\\D")
      .replace(/\\\\w/g, "\\w")
      .replace(/\\\\W/g, "\\W")
      .replace(/\\\\s/g, "\\s")
      .replace(/\\\\S/g, "\\S")
      .replace(/\\\\t/g, "\\t")
      .replace(/\\\\n/g, "\\n")
      .replace(/\\\\r/g, "\\r");
  }

  /**
   * Convert JavaScript regex syntax to PostgreSQL POSIX regex syntax
   * Key difference: \b (word boundary in JS) → \y (word boundary in PostgreSQL)
   *
   * @param {string} pattern - Pattern in JavaScript regex syntax
   * @returns {string} - Pattern in PostgreSQL POSIX regex syntax
   */
  convertToPostgresPattern(pattern) {
    if (!pattern) return pattern;

    // Convert word boundaries from JavaScript to PostgreSQL syntax
    // \b → \y (word boundary)
    // \B → \Y (non-word boundary)
    return pattern.replace(/\\b/g, "\\y").replace(/\\B/g, "\\Y");
  }

  /**
   * Prepare a pattern for database storage
   * - Fixes double-escaping if present
   * - Converts JavaScript syntax to PostgreSQL syntax
   * - Validates the final pattern
   *
   * @param {string} pattern - Raw pattern from user input
   * @returns {string} - Prepared pattern ready for PostgreSQL
   */
  prepareForDatabase(pattern) {
    if (!pattern) return pattern;

    let prepared = pattern;

    // Step 1: Fix double-escaping
    const validation = this.validatePattern(pattern);
    if (validation.hasDoubleEscaping) {
      console.log("🔧 Auto-fixing double-escaped pattern");
      prepared = this.fixDoubleEscaping(prepared);
    }

    // Step 2: Convert to PostgreSQL syntax
    console.log("🔄 Converting JavaScript regex to PostgreSQL POSIX regex");
    prepared = this.convertToPostgresPattern(prepared);

    // Step 3: Final validation
    const finalValidation = this.validatePattern(prepared);
    if (!finalValidation.isValid) {
      console.warn(
        "⚠️ Final pattern validation failed:",
        finalValidation.errors
      );
    } else {
      console.log("✅ Pattern prepared successfully for PostgreSQL");
    }

    return prepared;
  }

  /**
   * Get example patterns with explanations
   * @returns {Array} - Array of example patterns
   */
  getExamples() {
    return [
      {
        name: "Simple word match",
        input: "\\bdryer\\b",
        prepared: "\\ydryer\\y",
        description:
          'Matches "dryer" as a complete word. Word boundaries (\\b) are automatically converted to PostgreSQL syntax (\\y).',
      },
      {
        name: "Multiple conditions",
        input: "\\bwater\\b.*\\b(leak|leaking)\\b",
        prepared: "\\ywater\\y.*\\y(leak|leaking)\\y",
        description:
          'Matches "water" followed by "leak" or "leaking". All word boundaries converted automatically.',
      },
      {
        name: "Case variations",
        input: "\\b(ac|air\\s*conditioning)\\b.*\\b(not\\s*working|broken)\\b",
        prepared:
          "\\y(ac|air\\s*conditioning)\\y.*\\y(not\\s*working|broken)\\y",
        description:
          "Matches AC or air conditioning with various problem phrases.",
      },
      {
        name: "Double-escaped (will be fixed)",
        input: "\\\\btest\\\\b",
        prepared: "\\ytest\\y",
        description: "Double-escaped pattern will be auto-fixed and converted.",
      },
    ];
  }
}

// Create singleton instance
const patternValidator = new PatternValidator();

// Export both the instance and the class
export { patternValidator, PatternValidator };

// Default export for CommonJS compatibility
export default patternValidator;
