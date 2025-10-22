import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  loginSchema,
  signUpSchema,
  validate,
  safeValidate,
} from './index';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct email', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
    });

    it('should reject invalid email', () => {
      expect(() => emailSchema.parse('invalid-email')).toThrow();
      expect(() => emailSchema.parse('')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      expect(() => passwordSchema.parse('Password123')).not.toThrow();
    });

    it('should reject weak passwords', () => {
      expect(() => passwordSchema.parse('weak')).toThrow(); // Too short
      expect(() => passwordSchema.parse('nouppercaseornumber')).toThrow();
      expect(() => passwordSchema.parse('NOLOWERCASE123')).toThrow();
      expect(() => passwordSchema.parse('NoNumbers')).toThrow();
    });
  });

  describe('nameSchema', () => {
    it('should validate correct names', () => {
      expect(() => nameSchema.parse('John Doe')).not.toThrow();
      expect(() => nameSchema.parse('Alice')).not.toThrow();
    });

    it('should reject invalid names', () => {
      expect(() => nameSchema.parse('A')).toThrow(); // Too short
      expect(() => nameSchema.parse('John123')).toThrow(); // Contains numbers
      expect(() => nameSchema.parse('a'.repeat(101))).toThrow(); // Too long
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'anypassword',
      };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it('should reject invalid login data', () => {
      expect(() =>
        loginSchema.parse({ email: 'invalid', password: 'pass' })
      ).toThrow();
      expect(() =>
        loginSchema.parse({ email: 'test@example.com', password: '' })
      ).toThrow();
    });
  });

  describe('signUpSchema', () => {
    it('should validate correct signup data', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        name: 'John Doe',
      };
      expect(() => signUpSchema.parse(data)).not.toThrow();
    });

    it('should validate without optional name', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };
      expect(() => signUpSchema.parse(data)).not.toThrow();
    });

    it('should reject mismatched passwords', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Different123',
      };
      expect(() => signUpSchema.parse(data)).toThrow();
    });
  });
});

describe('Validation Helpers', () => {
  describe('validate', () => {
    it('should return success with valid data', () => {
      const result = validate(loginSchema, {
        email: 'test@example.com',
        password: 'password',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return errors with invalid data', () => {
      const result = validate(loginSchema, {
        email: 'invalid',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('safeValidate', () => {
    it('should return data with valid input', () => {
      const data = safeValidate(loginSchema, {
        email: 'test@example.com',
        password: 'password',
      });
      expect(data.email).toBe('test@example.com');
    });

    it('should throw ValidationError with invalid input', () => {
      expect(() =>
        safeValidate(loginSchema, { email: 'invalid', password: '' })
      ).toThrowError('Invalid email address');
    });
  });
});
