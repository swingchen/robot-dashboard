import { useState } from 'react';
import { apiPost } from '../utils/api';

interface ScenarioControlResponse {
  scenario: string;
  changedAt: number;
}

interface ControlPanelProps {
  onConnect: () => void;
  onDisconnect: () => void;
}

const SHOW_DEMO = import.meta.env.VITE_DEMO_MODE !== 'false';

export function ControlPanel({ onConnect, onDisconnect }: ControlPanelProps) {
  const [controlError, setControlError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isPausedConfirmed, setIsPausedConfirmed] = useState(false);

  const setScenario = (scenario: 'stale' | 'drop'): Promise<ScenarioControlResponse> =>
    apiPost<ScenarioControlResponse>('/scenario', { scenario });

  const resetScenario = (): Promise<ScenarioControlResponse> =>
    apiPost<ScenarioControlResponse>('/scenario/reset');

  const runScenarioAction = async (action: () => Promise<unknown>): Promise<void> => {
    setControlError(null);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scenario control request failed';
      setControlError(message);
    }
  };

  const pauseStream = async (): Promise<void> => {
    setIsPaused(true);
    try {
      await apiPost('/stream/pause');
      setIsPausedConfirmed(true);
    } catch {
      setIsPaused(false);
    }
  };

  const resumeStream = async (): Promise<void> => {
    setIsPaused(false);
    try {
      await apiPost('/stream/resume');
      setIsPausedConfirmed(false);
    } catch {
      setIsPaused(true);
    }
  };

  const streamStatus = isPausedConfirmed ? '✓ Paused' : '✓ Running';

  return (
    <div className="demo-controls">
      {/* Stream Control — always visible */}
      <div className="demo-controls__section">
        <div className="demo-controls__label">Stream Control</div>
        <div className="demo-controls__buttons">
          <button className="demo-btn" disabled={isPaused} onClick={() => void pauseStream()}>
            ⏸ Pause
            {isPaused && !isPausedConfirmed && ' (requesting...)'}
          </button>
          <button className="demo-btn" disabled={!isPaused} onClick={() => void resumeStream()}>
            ▶ Resume
            {!isPaused && isPausedConfirmed && ' (requesting...)'}
          </button>
        </div>
        <div className="demo-controls__status">
          Status: {streamStatus}
          {isPaused !== isPausedConfirmed && ' → Syncing...'}
        </div>
      </div>

      {/* Demo sections — hidden in production */}
      {SHOW_DEMO && (
        <>
          <div className="demo-controls__section">
            <div className="demo-controls__label">Transport</div>
            <div className="demo-controls__buttons">
              <button className="demo-btn" onClick={() => { setControlError(null); onConnect(); }}>
                ① Connect
              </button>
              <button className="demo-btn" onClick={() => { setControlError(null); onDisconnect(); }}>
                ⑤ Disconnect
              </button>
            </div>
          </div>

          <div className="demo-controls__section">
            <div className="demo-controls__label">Scenarios</div>
            <div className="demo-controls__buttons">
              <button className="demo-btn" onClick={() => { void runScenarioAction(async () => { await setScenario('stale'); }); }}>
                ② Stale
              </button>
              <button className="demo-btn" onClick={() => { void runScenarioAction(async () => { await resetScenario(); }); }}>
                ③ Recover
              </button>
              <button className="demo-btn" onClick={() => { void runScenarioAction(async () => { await setScenario('drop'); }); }}>
                ④ Drop
              </button>
            </div>
            {controlError && <div className="demo-controls__error">{controlError}</div>}
          </div>
        </>
      )}
    </div>
  );
}
