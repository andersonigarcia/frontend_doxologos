import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from './index';

describe('Logger', () => {
  beforeEach(() => {
    logger.clearLogs();
    vi.clearAllMocks();
  });

  it('should log debug messages', () => {
    const consoleSpy = vi.spyOn(console, 'debug');
    logger.debug('Test debug message');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('debug');
    expect(logs[0].message).toBe('Test debug message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    const consoleSpy = vi.spyOn(console, 'info');
    logger.info('Test info message');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test info message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log warn messages', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    logger.warn('Test warn message');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('warn');
    expect(logs[0].message).toBe('Test warn message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    logger.error('Test error message');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('Test error message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should include additional data in logs', () => {
    const data = { userId: 123, action: 'test' };
    logger.info('Test with data', data);

    const logs = logger.getLogs();
    expect(logs[0].data).toEqual(data);
  });

  it('should clear logs', () => {
    logger.info('Message 1');
    logger.info('Message 2');
    expect(logger.getLogs()).toHaveLength(2);

    logger.clearLogs();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('should maintain a maximum number of logs', () => {
    // This is an internal implementation test
    for (let i = 0; i < 1005; i++) {
      logger.info(`Message ${i}`);
    }

    const logs = logger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(1000);
  });

  it('should include timestamps in logs', () => {
    logger.info('Test message');

    const logs = logger.getLogs();
    expect(logs[0].timestamp).toBeDefined();
    expect(new Date(logs[0].timestamp).getTime()).toBeGreaterThan(0);
  });
});
