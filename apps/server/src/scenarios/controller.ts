export const scenarioNames = ['live', 'stale', 'drop', 'manual-disconnect'] as const;

export type ScenarioName = (typeof scenarioNames)[number];

export interface ScenarioSnapshot {
  current: ScenarioName;
  changedAt: number;
}

type ScenarioListener = (next: ScenarioSnapshot, previous: ScenarioSnapshot) => void;

export function isScenarioName(value: string): value is ScenarioName {
  return scenarioNames.some((scenario) => scenario === value);
}

export function parseScenarioName(value: string | undefined): ScenarioName {
  if (value && isScenarioName(value)) {
    return value;
  }

  return 'live';
}

export class ScenarioController {
  private snapshot: ScenarioSnapshot;

  private readonly listeners = new Set<ScenarioListener>();

  constructor(initialScenario: ScenarioName = 'live') {
    this.snapshot = {
      current: initialScenario,
      changedAt: Date.now(),
    };
  }

  getSnapshot(): ScenarioSnapshot {
    return this.snapshot;
  }

  setScenario(nextScenario: ScenarioName): ScenarioSnapshot {
    if (nextScenario === this.snapshot.current) {
      return this.snapshot;
    }

    const previous = this.snapshot;

    this.snapshot = {
      current: nextScenario,
      changedAt: Date.now(),
    };

    for (const listener of this.listeners) {
      listener(this.snapshot, previous);
    }

    return this.snapshot;
  }

  subscribe(listener: ScenarioListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  shouldStream(): boolean {
    return this.snapshot.current === 'live';
  }
}