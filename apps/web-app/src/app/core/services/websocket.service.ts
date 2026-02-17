import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface GraphUpdateEvent {
  eventType: string;
  timestamp: string;
  payload: unknown;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: Socket | null = null;
  readonly graphUpdate = signal<GraphUpdateEvent | null>(null);

  connect(): void {
    if (this.socket) return;
    this.socket = io(environment.topologyWsUrl, { transports: ['websocket'] });
    this.socket.on('graph_update', (payload: GraphUpdateEvent) => this.graphUpdate.set(payload));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
