import { UiTelemetrySnapshot } from '../types/telemetry';
import '../styles/components/trust-banner.css';

interface TrustBannerProps {
  snapshot: UiTelemetrySnapshot;
  ageMs: number | null;
}

export function TrustBanner({ snapshot, ageMs }: TrustBannerProps) {
  const getTrustStateClass = (): string => {
    switch (snapshot.trustState) {
      case 'live':
        return 'trust-state--live';
      case 'stale':
        return 'trust-state--stale';
      case 'reconnecting':
        return 'trust-state--reconnecting';
      case 'disconnected':
        return 'trust-state--disconnected';
      case 'no-data-yet':
      default:
        return 'trust-state--no-data-yet';
    }
  };

  const getStateLabel = (): string => {
    switch (snapshot.trustState) {
      case 'live':
        return 'Live Stream';
      case 'stale':
        return 'No New Data';
      case 'reconnecting':
        return 'Reconnecting';
      case 'disconnected':
        return 'Disconnected';
      case 'no-data-yet':
        return 'Awaiting Connection';
      default:
        return 'Unknown';
    }
  };

  const getStateDescription = (): string => {
    switch (snapshot.trustState) {
      case 'live':
        return 'Real-time data flowing';
      case 'stale':
        return `Last update ${formatDuration(ageMs)} ago`;
      case 'reconnecting': {
        const attempt = snapshot.reconnectAttempt;
        const delaySec = (snapshot.nextReconnectDelayMs / 1000).toFixed(0);
        return `Retry #${attempt} in ${delaySec}s`;
      }
      case 'disconnected':
        return 'Using last-known values';
      case 'no-data-yet':
        return 'Waiting for first frame';
      default:
        return '';
    }
  };

  const formatDuration = (ms: number | null): string => {
    if (ms === null) return 'Unknown';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`trust-banner ${getTrustStateClass()}`}>
      <div className="trust-banner__icon">
        <div className="trust-banner__icon-symbol">
          {snapshot.trustState === 'live' && '✓'}
          {snapshot.trustState === 'stale' && '⏱'}
          {snapshot.trustState === 'reconnecting' && '↻'}
          {snapshot.trustState === 'disconnected' && '✕'}
          {snapshot.trustState === 'no-data-yet' && '◌'}
        </div>
      </div>

      <div className="trust-banner__content">
        <div className="trust-banner__title">{getStateLabel()}</div>
        <div className="trust-banner__description">{getStateDescription()}</div>
      </div>

      <div className="trust-banner__details">
        <span className={`trust-badge trust-badge--${snapshot.trustState}`}>
          {snapshot.trustState}
        </span>
      </div>

      {snapshot.isFrozen && (
        <div className="trust-banner__frozen-indicator">
          Last-Known Values
        </div>
      )}
    </div>
  );
}
