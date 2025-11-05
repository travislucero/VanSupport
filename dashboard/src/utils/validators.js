/**
 * Validation utilities for van and owner management
 */

/**
 * Validate phone number (US format)
 * Accepts formats: (123) 456-7890, 123-456-7890, 1234567890, +1 (123) 456-7890
 */
export const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: 'Phone number is required' };

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's a valid length (10 digits or 11 with country code)
  if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1')) {
    return { valid: true, formatted: formatPhone(digitsOnly) };
  }

  return { valid: false, error: 'Phone number must be 10 digits' };
};

/**
 * Format phone number to +1 (XXX) XXX-XXXX
 */
export const formatPhone = (phone) => {
  const digitsOnly = phone.replace(/\D/g, '');

  // Handle 11 digits (with country code)
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    const areaCode = digitsOnly.slice(1, 4);
    const first = digitsOnly.slice(4, 7);
    const second = digitsOnly.slice(7, 11);
    return `+1 (${areaCode}) ${first}-${second}`;
  }

  // Handle 10 digits
  if (digitsOnly.length === 10) {
    const areaCode = digitsOnly.slice(0, 3);
    const first = digitsOnly.slice(3, 6);
    const second = digitsOnly.slice(6, 10);
    return `+1 (${areaCode}) ${first}-${second}`;
  }

  return phone;
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(email)) {
    return { valid: true };
  }

  return { valid: false, error: 'Invalid email format' };
};

/**
 * Validate year (must be between 2000 and current year + 1)
 */
export const validateYear = (year) => {
  if (!year) return { valid: false, error: 'Year is required' };

  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(year, 10);

  if (isNaN(yearNum)) {
    return { valid: false, error: 'Year must be a number' };
  }

  if (yearNum < 2000) {
    return { valid: false, error: 'Year must be 2000 or later' };
  }

  if (yearNum > currentYear + 1) {
    return { valid: false, error: `Year cannot be later than ${currentYear + 1}` };
  }

  return { valid: true };
};

/**
 * Validate van number (required, will be auto-uppercased)
 */
export const validateVanNumber = (vanNumber) => {
  if (!vanNumber || vanNumber.trim() === '') {
    return { valid: false, error: 'Van number is required' };
  }

  return { valid: true };
};

/**
 * Validate VIN (optional, 17 characters if provided)
 */
export const validateVIN = (vin) => {
  if (!vin || vin.trim() === '') {
    return { valid: true }; // VIN is optional
  }

  const vinUpper = vin.toUpperCase();

  // VIN should be exactly 17 characters
  if (vinUpper.length !== 17) {
    return { valid: false, error: 'VIN must be exactly 17 characters' };
  }

  // VIN should not contain I, O, or Q
  if (/[IOQ]/.test(vinUpper)) {
    return { valid: false, error: 'VIN cannot contain letters I, O, or Q' };
  }

  return { valid: true };
};

/**
 * Validate owner name (required)
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  return { valid: true };
};

/**
 * Validate make (must be Ford, RAM, or Mercedes)
 */
export const validateMake = (make) => {
  const validMakes = ['Ford', 'RAM', 'Mercedes'];

  if (!make) {
    return { valid: false, error: 'Make is required' };
  }

  if (!validMakes.includes(make)) {
    return { valid: false, error: 'Make must be Ford, RAM, or Mercedes' };
  }

  return { valid: true };
};
