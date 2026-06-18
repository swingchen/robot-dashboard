import { Router } from 'express';
import type { TelemetryBroadcaster } from '../telemetry/broadcaster.js';
import type { AutoFaultScheduler } from '../scenarios/autoFaultScheduler.js';
import {
  isScenarioName,
  scenarioNames,
  type AlarmSeverity,
  type ScenarioController,
  type ScenarioName,
} from '../scenarios/controller.js';

interface ScenarioRequestBody {
  scenario?: string;
}

const manualAlarmCycle: AlarmSeverity[] = ['info', 'warning', 'critical'];
let manualAlarmIndex = 0;

export function createScenarioControlRouter(
  controller: ScenarioController,
  broadcaster: TelemetryBroadcaster,
  autoFaultScheduler: AutoFaultScheduler,
  autoFaultsEnabled: boolean,
): Router {
  const router = Router();

  router.get('/scenario', (_request, response) => {
    response.json({
      scenario: controller.getSnapshot().current,
      availableScenarios: scenarioNames,
    });
  });

  router.post('/scenario', (request, response) => {
    const { scenario } = request.body as ScenarioRequestBody;

    if (!scenario || !isScenarioName(scenario)) {
      response.status(400).json({
        error: 'scenario must be one of the supported demo scenario names',
        availableScenarios: scenarioNames,
      });
      return;
    }

    // 手动点击 Alarm 时轮转告警级别: info → warning → critical → info
    if (scenario === 'alarm') {
      const severity = manualAlarmCycle[manualAlarmIndex];
      controller.setAlarmSeverity(severity);
      manualAlarmIndex = (manualAlarmIndex + 1) % manualAlarmCycle.length;
    }

    const snapshot = controller.setScenario(scenario satisfies ScenarioName ? scenario : 'live');

    response.json({
      scenario: snapshot.current,
      changedAt: snapshot.changedAt,
    });
  });

  router.post('/scenario/reset', (_request, response) => {
    const snapshot = controller.setScenario('live');

    response.json({
      scenario: snapshot.current,
      changedAt: snapshot.changedAt,
    });
  });

  router.post('/stream/pause', (_request, response) => {
    broadcaster.pause();

    response.json({
      status: 'paused',
      timestamp: Date.now(),
    });
  });

  router.post('/stream/resume', (_request, response) => {
    broadcaster.resume();

    response.json({
      status: 'resumed',
      timestamp: Date.now(),
    });
  });

  router.get('/stream/status', (_request, response) => {
    response.json({
      isPaused: broadcaster.isPausedNow(),
      timestamp: Date.now(),
    });
  });

  router.get('/auto-faults/status', (_request, response) => {
    response.json({
      enabled: autoFaultsEnabled,
      isRunning: autoFaultsEnabled && autoFaultScheduler.isRunning(),
      timestamp: Date.now(),
    });
  });

  router.post('/auto-faults/pause', (_request, response) => {
    if (!autoFaultsEnabled) {
      response.status(400).json({
        error: 'auto faults are disabled by server configuration',
        enabled: false,
      });
      return;
    }

    autoFaultScheduler.stop();
    response.json({
      status: 'paused',
      isRunning: false,
      timestamp: Date.now(),
    });
  });

  router.post('/auto-faults/resume', (_request, response) => {
    if (!autoFaultsEnabled) {
      response.status(400).json({
        error: 'auto faults are disabled by server configuration',
        enabled: false,
      });
      return;
    }

    autoFaultScheduler.start();
    response.json({
      status: 'running',
      isRunning: true,
      timestamp: Date.now(),
    });
  });

  return router;
}
