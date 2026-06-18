import { describe, expect, it } from 'vitest';
import { deriveFreshnessState, deriveTrustState } from '../freshness';

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
});
