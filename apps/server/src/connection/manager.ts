import { WebSocket } from 'ws';
import type { ScenarioSnapshot } from '../scenarios/controller.js';
import { MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON } from './constants.js';

export class ConnectionManager {
  private readonly sockets = new Set<WebSocket>();

  addConnection(socket: WebSocket, scenario: ScenarioSnapshot): boolean {
    if (scenario.current === 'drop') {
      socket.terminate();
      return false;
    }

    if (scenario.current === 'manual-disconnect') {
      socket.close(MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON);
      return false;
    }

    this.sockets.add(socket);

    socket.on('close', () => {
      this.sockets.delete(socket);
    });

    socket.on('error', () => {
      this.sockets.delete(socket);
    });

    return true;
  }

  broadcast(payload: string): void {
    for (const socket of Array.from(this.sockets)) {
      if (socket.readyState !== WebSocket.OPEN) {
        this.sockets.delete(socket);
        continue;
      }

      socket.send(payload, (error) => {
        if (!error) {
          return;
        }

        this.sockets.delete(socket);
        socket.terminate();
      });
    }
  }

  closeAll(code: number, reason: string): void {
    for (const socket of Array.from(this.sockets)) {
      this.sockets.delete(socket);
      socket.close(code, reason);
    }
  }

  terminateAll(): void {
    for (const socket of Array.from(this.sockets)) {
      this.sockets.delete(socket);
      socket.terminate();
    }
  }

  getClientCount(): number {
    return this.sockets.size;
  }
}