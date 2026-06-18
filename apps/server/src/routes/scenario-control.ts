import { Router } from 'express';
import type { TelemetryBroadcaster } from '../telemetry/broadcaster.js';
import {
  isScenarioName,
  scenarioNames,
  type ScenarioController,
} from '../scenarios/controller.js';

interface ScenarioRequestBody {
  scenario?: string;
}

export function createScenarioControlRouter(
  controller: ScenarioController,
  broadcaster: TelemetryBroadcaster,
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

    const snapshot = controller.setScenario(scenario);

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

  return router;
}
