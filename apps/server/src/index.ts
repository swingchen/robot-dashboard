import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { ConnectionManager } from './connection/manager.js';
import { createScenarioControlRouter } from './routes/scenario-control.js';
import { applyScenario } from './scenarios/applyScenario.js';
import { AutoFaultScheduler } from './scenarios/autoFaultScheduler.js';
import { ScenarioController, parseScenarioName } from './scenarios/controller.js';
import { TelemetryBroadcaster } from './telemetry/broadcaster.js';
import { TelemetryGenerator } from './telemetry/generator.js';

const STREAM_HZ = 15;
const AUTO_FAULTS_ENABLED = process.env.AUTO_FAULTS_ENABLED !== 'false';
const app = express();
const port = Number(process.env.PORT ?? 3001);
const initialScenario = parseScenarioName(process.env.BOOT_SCENARIO);
const scenarioController = new ScenarioController(initialScenario);
const connectionManager = new ConnectionManager();
const telemetryGenerator = new TelemetryGenerator();
const telemetryBroadcaster = new TelemetryBroadcaster({
  controller: scenarioController,
  connectionManager,
  generator: telemetryGenerator,
  streamHz: STREAM_HZ,
});
const autoFaultScheduler = new AutoFaultScheduler({
  controller: scenarioController,
});

app.use(cors());
app.use(express.json());
app.use('/api', createScenarioControlRouter(scenarioController, telemetryBroadcaster));

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    scenario: scenarioController.getSnapshot().current,
    clients: connectionManager.getClientCount(),
    streamHz: STREAM_HZ,
    autoFaultsEnabled: AUTO_FAULTS_ENABLED,
  });
});

const server = createServer(app);
const wsServer = new WebSocketServer({
  server,
  path: '/telemetry',
});

wsServer.on('connection', (socket) => {
  const accepted = connectionManager.addConnection(socket, scenarioController.getSnapshot());

  if (!accepted) {
    return;
  }

  const latestFrame = telemetryBroadcaster.getLatestFrame();

  if (latestFrame && scenarioController.shouldStream()) {
    socket.send(JSON.stringify(latestFrame));
  }
});

scenarioController.subscribe((next, previous) => {
  applyScenario(next, previous, connectionManager);
  console.log(`[scenario] ${previous.current} -> ${next.current}`);
});

telemetryBroadcaster.start();

if (AUTO_FAULTS_ENABLED) {
  autoFaultScheduler.start();
}

const shutdown = () => {
  autoFaultScheduler.stop();
  telemetryBroadcaster.stop();
  wsServer.close();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(port, () => {
  console.log(`Telemetry server listening on http://localhost:${port}`);
  console.log(`Telemetry websocket listening on ws://localhost:${port}/telemetry`);
  console.log(`Initial scenario: ${initialScenario}`);
  console.log(`Auto faults: ${AUTO_FAULTS_ENABLED ? 'enabled' : 'disabled'}`);
});