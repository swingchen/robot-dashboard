import type { ScenarioController, ScenarioName } from './controller.js';

interface AutoFaultSchedulerOptions {
  controller: ScenarioController;
}

type FaultStep =
  | { kind: 'scenario'; scenario: Exclude<ScenarioName, 'alarm'>; durationMs: number }
  | { kind: 'alarm'; severity: 'warning' | 'critical'; durationMs: number };

const SEQUENCE: readonly FaultStep[] = [
  { kind: 'scenario', scenario: 'stale', durationMs: 4500 },
  { kind: 'scenario', scenario: 'live', durationMs: 7000 },
  { kind: 'alarm', severity: 'warning', durationMs: 5500 },
  { kind: 'scenario', scenario: 'live', durationMs: 7000 },
  { kind: 'scenario', scenario: 'drop', durationMs: 5000 },
  { kind: 'scenario', scenario: 'live', durationMs: 8000 },
  { kind: 'alarm', severity: 'critical', durationMs: 6000 },
  { kind: 'scenario', scenario: 'stale', durationMs: 4500 },
  { kind: 'scenario', scenario: 'live', durationMs: 9000 },
];

export class AutoFaultScheduler {
  private timer: NodeJS.Timeout | undefined;

  private stepIndex = 0;

  private stopped = false;

  constructor(private readonly options: AutoFaultSchedulerOptions) {}

  start(): void {
    if (this.timer) {
      return;
    }

    this.stopped = false;
    this.stepIndex = 0;
    console.log('[auto-fault] scheduler started');
    this.runCurrentStep();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  isRunning(): boolean {
    return this.timer !== undefined;
  }

  private runCurrentStep(): void {
    const step = SEQUENCE[this.stepIndex];

    if (!step) {
      this.stepIndex = 0;
      this.runCurrentStep();
      return;
    }

    if (step.kind === 'alarm') {
      this.options.controller.setAlarmSeverity(step.severity);
      this.options.controller.setScenario('alarm');
      console.log(`[auto-fault] alarm ${step.severity} for ${step.durationMs}ms`);
    } else {
      this.options.controller.setScenario(step.scenario);
      console.log(`[auto-fault] scenario ${step.scenario} for ${step.durationMs}ms`);
    }

    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.stopped) return;
      this.stepIndex = (this.stepIndex + 1) % SEQUENCE.length;
      this.runCurrentStep();
    }, step.durationMs);
  }
}
