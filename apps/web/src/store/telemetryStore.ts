import { create } from 'zustand';
import type {
  ConnectionState,
  FreshnessState,
  RawTelemetryFrame,
  TelemetryAlarm,
  TrustState,
  UiTelemetrySnapshot,
  ViewState,
} from '../types/telemetry';
import { getReconnectDelay } from '../utils/backoff';
import { buildUiSnapshot } from '../utils/freshness';

interface TelemetryStateShape {
  rawFrame: RawTelemetryFrame | null;
  uiSnapshot: UiTelemetrySnapshot;
  lastReceiveTime: number | null;
  alarms: TelemetryAlarm[];
  connectionState: ConnectionState;
  freshnessState: FreshnessState;
  trustState: TrustState;
  viewState: ViewState;
  reconnectAttempt: number;
  nextReconnectDelayMs: number;
  now: number;
}

interface TelemetryActions {
  receiveFrame: (frame: RawTelemetryFrame, receivedAt?: number) => void;
  syncClock: (now?: number) => void;
  markConnecting: (now?: number) => void;
  markConnected: (now?: number) => void;
  markReconnecting: (now?: number) => void;
  markDisconnected: (now?: number) => void;
  resetState: (now?: number) => void;
}

export type TelemetryStoreState = TelemetryStateShape & TelemetryActions;

type DerivationSource = Pick<
  TelemetryStateShape,
  'rawFrame' | 'lastReceiveTime' | 'alarms' | 'connectionState' | 'reconnectAttempt' | 'now'
>;

function buildDerivedState(source: DerivationSource): Pick<
  TelemetryStateShape,
  'uiSnapshot' | 'freshnessState' | 'trustState' | 'viewState' | 'nextReconnectDelayMs'
> {
  const uiSnapshot = buildUiSnapshot({
    rawFrame: source.rawFrame,
    alarms: source.alarms,
    connectionState: source.connectionState,
    lastReceiveTime: source.lastReceiveTime,
    now: source.now,
    reconnectAttempt: source.reconnectAttempt,
    nextReconnectDelayMs: getReconnectDelay(source.reconnectAttempt),
  });

  return {
    uiSnapshot,
    freshnessState: uiSnapshot.freshnessState,
    trustState: uiSnapshot.trustState,
    viewState: uiSnapshot.viewState,
    nextReconnectDelayMs: getReconnectDelay(source.reconnectAttempt),
  };
}

function createStatePatch(
  state: Pick<
    TelemetryStateShape,
    'rawFrame' | 'lastReceiveTime' | 'alarms' | 'connectionState' | 'reconnectAttempt' | 'now'
  >,
  updates: Partial<DerivationSource>,
): TelemetryStateShape {
  const nextState: DerivationSource = {
    rawFrame: updates.rawFrame ?? state.rawFrame,
    lastReceiveTime: updates.lastReceiveTime ?? state.lastReceiveTime,
    alarms: updates.alarms ?? state.alarms,
    connectionState: updates.connectionState ?? state.connectionState,
    reconnectAttempt: updates.reconnectAttempt ?? state.reconnectAttempt,
    now: updates.now ?? state.now,
  };

  return {
    ...nextState,
    ...buildDerivedState(nextState),
  };
}

function createInitialState(now: number): TelemetryStateShape {
  return createStatePatch(
    {
      rawFrame: null,
      lastReceiveTime: null,
      alarms: [],
      connectionState: 'idle',
      reconnectAttempt: 0,
      now,
    },
    {},
  );
}

export const useTelemetryStore = create<TelemetryStoreState>((set) => ({
  ...createInitialState(Date.now()),

  receiveFrame: (frame, receivedAt = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        rawFrame: frame,
        lastReceiveTime: receivedAt,
        alarms: frame.alarms,
        connectionState: 'open',
        reconnectAttempt: 0,
        now: receivedAt,
      }),
    );
  },

  syncClock: (now = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        now,
      }),
    );
  },

  markConnecting: (now = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        connectionState: 'connecting',
        now,
      }),
    );
  },

  markConnected: (now = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        connectionState: 'open',
        now,
      }),
    );
  },

  markReconnecting: (now = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        connectionState: 'reconnecting',
        reconnectAttempt: state.reconnectAttempt + 1,
        now,
      }),
    );
  },

  markDisconnected: (now = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        connectionState: 'disconnected',
        now,
      }),
    );
  },

  resetState: (now = Date.now()) => {
    set(() => createInitialState(now));
  },
}));