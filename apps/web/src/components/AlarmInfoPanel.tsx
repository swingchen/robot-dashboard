import { useEffect, useMemo, useState } from 'react';
import type { TelemetryAlarm } from '../types/telemetry';

function toAlarmKey(alarm: TelemetryAlarm): string {
  return `${alarm.id}:${alarm.raisedAt}`;
}

interface AlarmInfoPanelProps {
  alarms: TelemetryAlarm[];
}

const severityRank: Record<'critical' | 'warning' | 'info', number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function sortVisibleAlarms(alarms: TelemetryAlarm[]): TelemetryAlarm[] {
  return [...alarms].sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];

    if (rankDiff !== 0) {
      return rankDiff;
    }

    const raisedAtDiff = b.raisedAt - a.raisedAt;

    if (raisedAtDiff !== 0) {
      return raisedAtDiff;
    }

    return a.code.localeCompare(b.code);
  });
}

export function AlarmInfoPanel({ alarms }: AlarmInfoPanelProps) {
  const [pendingAlarms, setPendingAlarms] = useState<TelemetryAlarm[]>([]);
  const [ackedAlarmKeys, setAckedAlarmKeys] = useState<Set<string>>(new Set());
  const [confirmingAlarmKey, setConfirmingAlarmKey] = useState<string | null>(null);

  useEffect(() => {
    const activeKeys = new Set(alarms.map((alarm) => toAlarmKey(alarm)));

    setAckedAlarmKeys((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      const next = new Set(Array.from(previous).filter((key) => activeKeys.has(key)));
      return next.size === previous.size ? previous : next;
    });

    setPendingAlarms((previous) => {
      const existingKeys = new Set(previous.map((alarm) => toAlarmKey(alarm)));
      const nextAlarms = alarms.filter((alarm) => {
        const key = toAlarmKey(alarm);
        return !ackedAlarmKeys.has(key) && !existingKeys.has(key);
      });

      if (nextAlarms.length === 0) {
        return previous;
      }

      return [...previous, ...nextAlarms];
    });
  }, [alarms, ackedAlarmKeys]);

  const visibleAlarms = useMemo(() => sortVisibleAlarms(pendingAlarms), [pendingAlarms]);
  const criticalAlarms = useMemo(
    () => visibleAlarms.filter((alarm) => alarm.severity === 'critical'),
    [visibleAlarms],
  );
  const overlayTitle =
    criticalAlarms.length > 1
      ? `Critical Alarms - ${criticalAlarms.length} Active`
      : 'Critical Alarm - Immediate Action Required';

  const acknowledgeAlarm = (alarm: TelemetryAlarm): void => {
    const key = toAlarmKey(alarm);
    setConfirmingAlarmKey(null);

    setPendingAlarms((previous) => previous.filter((candidate) => toAlarmKey(candidate) !== key));
    setAckedAlarmKeys((previous) => {
      const next = new Set(previous);
      next.add(key);
      return next;
    });
  };

  const requestConfirmAlarm = (alarm: TelemetryAlarm): void => {
    setConfirmingAlarmKey(toAlarmKey(alarm));
  };

  const cancelConfirm = (): void => {
    setConfirmingAlarmKey(null);
  };

  const acknowledgeAllVisible = (): void => {
    if (visibleAlarms.length === 0) {
      return;
    }

    setPendingAlarms([]);
    setAckedAlarmKeys((previous) => {
      const next = new Set(previous);

      for (const alarm of visibleAlarms) {
        next.add(toAlarmKey(alarm));
      }

      return next;
    });
  };

  return (
    <>
      <div
        className="panel alarms-left"
        aria-label="Alarm info panel"
      >
        <div className="panel__header">
          <div className="panel__title">
            Alarm Info
            {visibleAlarms.length > 0 && (
              <span
                className={`alarm-count-badge${criticalAlarms.length > 0 ? ' alarm-count-badge--critical' : ''}`}
              >
                {visibleAlarms.length}
              </span>
            )}
          </div>
          {visibleAlarms.length > 0 && (
            <button className="alarm-ack-btn alarm-ack-btn--all" onClick={acknowledgeAllVisible}>
              Ack All
            </button>
          )}
        </div>
        <div className="panel__content alarms-panel">
          {visibleAlarms.length === 0 ? (
            <div className="alarms-empty">
              <span className="alarms-empty__icon">✓</span>
              <span>No active alarms</span>
            </div>
          ) : (
            <div className="alarms-list">
              {visibleAlarms.map((alarm) => (
                <div
                  key={toAlarmKey(alarm)}
                  className={`alarm-item alarm-item--${alarm.severity}${alarm.severity === 'critical' ? ' alarm-item--pulse' : ''}`}
                >
                  <div className="alarm-item__icon">
                    {alarm.severity === 'critical' ? '🔴' : alarm.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div className="alarm-item__content">
                    <div className="alarm-item__header-row">
                      <span className="alarm-item__code">{alarm.code}</span>
                      <span className={`alarm-item__severity alarm-item__severity--${alarm.severity}`}>
                        {alarm.severity}
                      </span>
                    </div>
                    <div className="alarm-item__message">{alarm.message}</div>
                    <div className="alarm-item__time">{new Date(alarm.raisedAt).toLocaleTimeString()}</div>
                  </div>
                  {alarm.severity !== 'info' && (
                  <button
                    className={`alarm-ack-btn alarm-ack-btn--${alarm.severity}`}
                    onClick={() => acknowledgeAlarm(alarm)}
                    aria-label={`Acknowledge alarm ${alarm.code}`}
                  >
                    Ack
                  </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {criticalAlarms.length > 0 && (
        <div className="alarm-overlay" role="alert" aria-live="assertive" aria-label="Active critical alarm overlay">
          <div className="alarm-overlay__card alarm-overlay__card--critical">
            <div className="alarm-overlay__title alarm-overlay__title--critical">{overlayTitle}</div>
            <div className="alarm-overlay__list">
              {criticalAlarms.map((alarm) => {
                const key = toAlarmKey(alarm);
                const isConfirming = confirmingAlarmKey === key;
                return (
                  <div key={key} className={`alarm-item alarm-item--${alarm.severity}`}>
                    <div className="alarm-item__content">
                      <div className="alarm-item__code">{alarm.code}</div>
                      <div className="alarm-item__message">{alarm.message}</div>
                    </div>
                    <div className="alarm-item__actions">
                      <div className={`alarm-item__severity alarm-item__severity--${alarm.severity}`}>
                        {alarm.severity}
                      </div>
                      {isConfirming ? (
                        <div className="alarm-item__confirm-actions">
                          <button
                            className="alarm-ack-btn alarm-ack-btn--confirm"
                            onClick={() => acknowledgeAlarm(alarm)}
                          >
                            ✓ Confirm Ack
                          </button>
                          <button
                            className="alarm-ack-btn alarm-ack-btn--cancel"
                            onClick={cancelConfirm}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="alarm-ack-btn alarm-ack-btn--critical alarm-ack-btn--large"
                          onClick={() => requestConfirmAlarm(alarm)}
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
