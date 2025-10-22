import { describe, it, expect } from 'vitest';
import {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  handleError,
  getErrorMessage,
} from './index';
import { AuthError } from '@supabase/supabase-js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with message', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
    });

    it('should create an AppError with code and status', () => {
      const error = new AppError('Test error', 'TEST_CODE', 500);
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('NetworkError', () => {
    it('should create a NetworkError with default message', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network error occurred');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(0);
    });

    it('should create a NetworkError with custom message', () => {
      const error = new NetworkError('Connection failed');
      expect(error.message).toBe('Connection failed');
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError', () => {
      const error = new ValidationError('Invalid input', 'email');
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('email');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError', () => {
      const error = new AuthenticationError('Not authenticated');
      expect(error.message).toBe('Not authenticated');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError', () => {
      const error = new NotFoundError('User not found');
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
  });
});

describe('Error Handlers', () => {
  describe('handleError', () => {
    it('should return AppError as-is', () => {
      const originalError = new AppError('Test error');
      const handled = handleError(originalError);
      expect(handled).toBe(originalError);
    });

    it('should convert AuthError to AuthenticationError', () => {
      const authError = new AuthError('Auth failed', 401);
      const handled = handleError(authError);
      expect(handled.name).toBe('AuthenticationError');
      expect(handled.message).toBe('Auth failed');
    });

    it('should convert Error to AppError', () => {
      const error = new Error('Generic error');
      const handled = handleError(error);
      expect(handled).toBeInstanceOf(AppError);
      expect(handled.message).toBe('Generic error');
    });

    it('should handle unknown errors', () => {
      const handled = handleError('string error');
      expect(handled).toBeInstanceOf(AppError);
      expect(handled.message).toBe('An unknown error occurred');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error', () => {
      const error = new Error('Test message');
      expect(getErrorMessage(error)).toBe('Test message');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('Test string')).toBe('Test string');
    });

    it('should handle unknown types', () => {
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    });
  });
});
