import type { ConnectionManager } from '../connection/manager.js';
import type { ScenarioSnapshot } from './controller.js';
import { MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON } from '../connection/constants.js';

export function applyScenario(
  next: ScenarioSnapshot,
  previous: ScenarioSnapshot,
  connectionManager: ConnectionManager,
): void {
  if (next.current === previous.current) {
    return;
  }

  if (next.current === 'drop') {
    connectionManager.terminateAll();
    return;
  }

  if (next.current === 'manual-disconnect') {
    connectionManager.closeAll(MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON);
  }
}