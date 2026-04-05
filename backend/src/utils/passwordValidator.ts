/**
 * Password Validation Utility
 *
 * Enforces strong password policies:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not in common passwords list
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Common passwords list (top 100 most common passwords)
 * Source: https://github.com/danielmiessler/SecLists/tree/master/Passwords
 */
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', '123456789', '12345',
  'qwerty', 'abc123', 'password1', 'admin', 'letmein', 'welcome',
  'monkey', '1234567890', 'football', 'iloveyou', 'admin123',
  'welcome123', 'password!', 'Password1', 'Password123', 'Password1!',
  'qwerty123', 'welcome1', 'login', 'passw0rd', 'master', 'hello',
  'freedom', 'whatever', 'trustno1', 'dragon', 'baseball', '111111',
  '000000', '123123', 'sunshine', 'princess', 'admin1', 'starwars',
  'password12', 'pass123', 'test123', 'changeme', 'test', 'qwertyuiop',
  'superman', 'shadow', 'michael', 'computer', 'soccer', 'jennifer',
  'jordan', 'hunter', 'fuckyou', 'batman', 'pepper', 'qazwsx',
  '654321', '121212', 'mustang', 'access', 'master123', 'flower',
  'password!123', 'Password123!', 'Admin123!', 'Welcome123!',
  'P@ssw0rd', 'P@ssword', 'P@ssword1', 'Password@123', 'Admin@123',
  'SuperAdmin123!', // ⚠️ Found in your seed file!
];

/**
 * Validates password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  // Check maximum length (prevent DoS via extremely long passwords)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?\\)');
  }

  // Check against common passwords (case-insensitive)
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  // Check for sequential characters (e.g., "abcd", "1234")
  if (hasSequentialCharacters(password)) {
    errors.push('Password should not contain sequential characters (e.g., "abcd", "1234")');
  }

  // Check for repeated characters (e.g., "aaaa", "1111")
  if (hasRepeatedCharacters(password)) {
    errors.push('Password should not contain more than 3 repeated characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks for sequential characters (alphabetical or numerical)
 */
function hasSequentialCharacters(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];

  const lowerPassword = password.toLowerCase();

  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - 4; i++) {
      const substring = sequence.substring(i, i + 4);
      const reverseSubstring = substring.split('').reverse().join('');

      if (lowerPassword.includes(substring) || lowerPassword.includes(reverseSubstring)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks for more than 3 repeated characters
 */
function hasRepeatedCharacters(password: string): boolean {
  const pattern = /(.)\1{3,}/; // Matches any character repeated 4+ times
  return pattern.test(password);
}

/**
 * Generate a user-friendly error message for display
 */
export function getPasswordRequirementsMessage(): string {
  return `Password requirements:
• At least 12 characters long
• At least one uppercase letter (A-Z)
• At least one lowercase letter (a-z)
• At least one number (0-9)
• At least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?\\)
• Not a common password
• No sequential or repeated characters`;
}

/**
 * Get a summary of password requirements (for API response)
 */
export function getPasswordRequirements() {
  return {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    allowedSpecialChars: '!@#$%^&*()_+-=[]{};\':"|,.<>/?\\',
    disallowCommon: true,
    disallowSequential: true,
    disallowRepeated: true,
  };
}

/**
 * Quick validation (returns boolean only, no error details)
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid;
}
