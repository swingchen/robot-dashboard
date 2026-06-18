import { describe, expect, it } from 'vitest';
import { getReconnectDelay, shouldStopReconnecting } from '../backoff';

describe('getReconnectDelay', () => {
  it('attempt 0 → 1000ms (base)', () => {
    expect(getReconnectDelay(0)).toBe(1000);
  });

  it('attempt 1 → 2000ms', () => {
    expect(getReconnectDelay(1)).toBe(2000);
  });

  it('attempt 2 → 4000ms', () => {
    expect(getReconnectDelay(2)).toBe(4000);
  });

  it('attempt 3 → 8000ms', () => {
    expect(getReconnectDelay(3)).toBe(8000);
  });

  it('caps at maxMs (30000)', () => {
    expect(getReconnectDelay(5)).toBe(30000);
    expect(getReconnectDelay(10)).toBe(30000);
  });

  it('negative attempt → treats as 0', () => {
    expect(getReconnectDelay(-1)).toBe(1000);
  });

  it('NaN attempt → treats as 0', () => {
    expect(getReconnectDelay(NaN)).toBe(1000);
  });
});

describe('shouldStopReconnecting', () => {
  it('false when under max attempts', () => {
    expect(shouldStopReconnecting(0)).toBe(false);
    expect(shouldStopReconnecting(9)).toBe(false);
  });

  it('true when at or above max attempts', () => {
    expect(shouldStopReconnecting(10)).toBe(true);
    expect(shouldStopReconnecting(11)).toBe(true);
  });
});
