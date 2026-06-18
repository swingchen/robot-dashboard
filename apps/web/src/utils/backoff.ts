export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const RECONNECT_MAX_ATTEMPTS = 10;

export function getReconnectDelay(
  attempt: number,
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;

  return Math.min(maxMs, baseMs * 2 ** normalizedAttempt);
}

export function shouldStopReconnecting(attempt: number, maxAttempts = RECONNECT_MAX_ATTEMPTS): boolean {
  return attempt >= maxAttempts;
}