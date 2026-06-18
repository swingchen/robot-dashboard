import { describe, expect, it } from 'vitest';
import { deriveFreshnessState, deriveTrustState, buildUiSnapshot } from '../freshness';

const NOW = 100000;

describe('deriveFreshnessState', () => {
  it('null lastReceiveTime → no-data-yet', () => {
    expect(deriveFreshnessState(null, NOW)).toBe('no-data-yet');
  });

  it('at threshold boundary → fresh', () => {
    expect(deriveFreshnessState(NOW, NOW)).toBe('fresh');
    expect(deriveFreshnessState(NOW - 2500, NOW)).toBe('fresh');
  });

  it('exceeds threshold → stale', () => {
    expect(deriveFreshnessState(NOW - 2501, NOW)).toBe('stale');
  });

  it('deep stale', () => {
    expect(deriveFreshnessState(NOW - 10000, NOW)).toBe('stale');
  });
});

describe('deriveTrustState', () => {
  it('reconnecting overrides everything', () => {
    expect(deriveTrustState('reconnecting', 'fresh')).toBe('reconnecting');
    expect(deriveTrustState('reconnecting', 'stale')).toBe('reconnecting');
    expect(deriveTrustState('reconnecting', 'no-data-yet')).toBe('reconnecting');
  });

  it('disconnected overrides freshness', () => {
    expect(deriveTrustState('disconnected', 'fresh')).toBe('disconnected');
  });

  it('no-data-yet when connected but no frame', () => {
    expect(deriveTrustState('open', 'no-data-yet')).toBe('no-data-yet');
  });

  it('stale when connected but data old', () => {
    expect(deriveTrustState('open', 'stale')).toBe('stale');
  });

  it('live when connected and fresh', () => {
    expect(deriveTrustState('open', 'fresh')).toBe('live');
  });

  it('idle with no-data-yet', () => {
    expect(deriveTrustState('idle', 'no-data-yet')).toBe('no-data-yet');
  });

  it('connecting returns no-data-yet when no frame yet', () => {
    expect(deriveTrustState('connecting', 'no-data-yet')).toBe('no-data-yet');
  });

  it('connecting with fresh data (unlikely in practice)', () => {
    expect(deriveTrustState('connecting', 'fresh')).toBe('live');
  });
});

describe('buildUiSnapshot', () => {
  const mockFrame = {
    ts: 1000,
    pose: { x: 1, y: 2, headingDeg: 90 },
    speed: 3,
    battery: 80,
    mission: { id: 'M-01', label: 'Test', progress: 50, state: 'EXECUTING' as const },
    alarms: [],
  };

  it('returns live snapshot with fresh data', () => {
    const result = buildUiSnapshot({
      rawFrame: mockFrame,
      alarms: [],
      connectionState: 'open',
      lastReceiveTime: 1000,
      now: 1000,
      reconnectAttempt: 0,
      nextReconnectDelayMs: 0,
    });

    expect(result.trustState).toBe('live');
    expect(result.freshnessState).toBe('fresh');
    expect(result.isFrozen).toBe(false);
    expect(result.hasData).toBe(true);
    expect(result.ageMs).toBe(0);
    expect(result.pose?.x).toBe(1);
    expect(result.speed).toBe(3);
  });

  it('isFrozen when trustState is not live', () => {
    const result = buildUiSnapshot({
      rawFrame: mockFrame,
      alarms: [],
      connectionState: 'open',
      lastReceiveTime: 1000,
      now: 5000,
      reconnectAttempt: 0,
      nextReconnectDelayMs: 0,
    });

    expect(result.trustState).toBe('stale');
    expect(result.isFrozen).toBe(true);
  });

  it('hasData is false when rawFrame is null', () => {
    const result = buildUiSnapshot({
      rawFrame: null,
      alarms: [],
      connectionState: 'idle',
      lastReceiveTime: null,
      now: 1000,
      reconnectAttempt: 0,
      nextReconnectDelayMs: 0,
    });

    expect(result.hasData).toBe(false);
    expect(result.trustState).toBe('no-data-yet');
    expect(result.ageMs).toBeNull();
  });

  it('passes through reconnect fields', () => {
    const result = buildUiSnapshot({
      rawFrame: null,
      alarms: [],
      connectionState: 'reconnecting',
      lastReceiveTime: null,
      now: 1000,
      reconnectAttempt: 3,
      nextReconnectDelayMs: 8000,
    });

    expect(result.trustState).toBe('reconnecting');
    expect(result.reconnectAttempt).toBe(3);
    expect(result.nextReconnectDelayMs).toBe(8000);
  });
});
