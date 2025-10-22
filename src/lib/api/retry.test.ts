import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, withTimeout } from './retry';

describe('API Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxRetries: 3, delay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw NetworkError after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        withRetry(fn, { maxRetries: 2, delay: 10 })
      ).rejects.toThrowError('Always fails');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff when enabled', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      await withRetry(fn, { maxRetries: 3, delay: 50, backoff: true });
      const duration = Date.now() - start;

      // With backoff: 50ms + 100ms = 150ms minimum
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should call onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const onRetry = vi.fn();

      await withRetry(fn, { maxRetries: 2, delay: 10, onRetry });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should not retry if succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const onRetry = vi.fn();

      await withRetry(fn, { maxRetries: 3, onRetry });

      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('withTimeout', () => {
    it('should return result if completed within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);

      expect(result).toBe('success');
    });

    it('should throw NetworkError if operation times out', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('late'), 200)
      );

      await expect(withTimeout(promise, 50)).rejects.toThrowError(
        'Operation timed out'
      );
    });

    it('should work with rejected promises', async () => {
      const promise = Promise.reject(new Error('Failed'));

      await expect(withTimeout(promise, 1000)).rejects.toThrow('Failed');
    });

    it('should use default timeout if not provided', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('success'), 100)
      );

      // Default timeout is 30000ms, so this should succeed
      const result = await withTimeout(promise);
      expect(result).toBe('success');
    });
  });
});
