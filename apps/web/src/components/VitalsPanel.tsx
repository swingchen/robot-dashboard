import { UiTelemetrySnapshot } from '../types/telemetry';

interface VitalsPanelProps {
  snapshot: UiTelemetrySnapshot;
}

export function VitalsPanel({ snapshot }: VitalsPanelProps) {
  const getBatteryColor = (battery: number | null): string => {
    if (battery === null) return '#ccc';
    if (battery > 50) return '#4caf50';
    if (battery > 20) return '#ff9800';
    return '#f44336';
  };

  const getSpeedColor = (speed: number | null): string => {
    if (speed === null) return '#ccc';
    if (speed > 2) return '#2196f3';
    return '#4caf50';
  };

  return (
    <div className="vitals-panel-content">
      {/* Speed */}
      <div className="vital-card">
        <div className="vital-card__header">
          <span className="vital-card__label">Speed</span>
          <span className="vital-card__icon">⚡</span>
        </div>
        <div
          className="vital-card__value"
          style={{ color: getSpeedColor(snapshot.speed) }}
        >
          {snapshot.speed !== null ? snapshot.speed.toFixed(2) : '—'}
        </div>
        <div className="vital-card__unit">m/s</div>
        {snapshot.isFrozen && <div className="vital-card__frozen">frozen</div>}
      </div>

      {/* Battery */}
      <div className="vital-card">
        <div className="vital-card__header">
          <span className="vital-card__label">Battery</span>
          <span className="vital-card__icon">🔋</span>
        </div>
        <div
          className="vital-card__value"
          style={{ color: getBatteryColor(snapshot.battery) }}
        >
          {snapshot.battery !== null ? snapshot.battery.toFixed(0) : '—'}
        </div>
        <div className="vital-card__unit">%</div>
        {snapshot.isFrozen && <div className="vital-card__frozen">frozen</div>}
        {snapshot.battery !== null && snapshot.battery < 20 && (
          <div className="vital-card__warning">Low Battery</div>
        )}
      </div>

      {/* Mission */}
      {snapshot.mission && (
        <div className="vital-card vital-card--full-width">
          <div className="vital-card__header">
            <span className="vital-card__label">Mission</span>
            <span className={`vital-card__state-badge vital-card__state-badge--${snapshot.mission.state.toLowerCase()}`}>
              {snapshot.mission.state === 'EXECUTING' ? '⏳' : '✓'}
              {' '}
              {snapshot.mission.state}
            </span>
          </div>
          <div className="vital-card__mission-label">{snapshot.mission.label}</div>
          <div className="vital-card__progress-bar">
            <div
              className="vital-card__progress-fill"
              style={{ width: `${Math.min(snapshot.mission.progress, 100)}%` }}
            />
          </div>
          <div className="vital-card__progress-text">
            {snapshot.mission.progress.toFixed(0)}% complete
          </div>
          {snapshot.isFrozen && <div className="vital-card__frozen">frozen</div>}
        </div>
      )}

      {/* No Data Placeholder */}
      {!snapshot.mission && snapshot.speed === null && snapshot.battery === null && (
        <div className="vital-card vital-card--placeholder">
          <div className="vital-card__placeholder-text">Awaiting telemetry...</div>
        </div>
      )}
    </div>
  );
}
