import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GraphUpdateEventDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
  namespace: '/graph',
})
export class GraphGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GraphGateway.name);
  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`Client connected: ${client.id} (Total: ${this.connectedClients.size})`);

    // Send initial connection acknowledgment
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, data: { eventTypes?: string[] }) {
    const eventTypes = data.eventTypes || ['all'];
    this.logger.log(`Client ${client.id} subscribed to: ${eventTypes.join(', ')}`);

    // Join rooms for specific event types
    eventTypes.forEach((type) => {
      client.join(type);
    });

    return {
      success: true,
      subscribedTo: eventTypes,
    };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, data: { eventTypes?: string[] }) {
    const eventTypes = data.eventTypes || [];
    this.logger.log(`Client ${client.id} unsubscribed from: ${eventTypes.join(', ')}`);

    // Leave rooms for specific event types
    eventTypes.forEach((type) => {
      client.leave(type);
    });

    return {
      success: true,
      unsubscribedFrom: eventTypes,
    };
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    return {
      event: 'pong',
      timestamp: new Date(),
    };
  }

  // Emit graph update to all connected clients
  emitGraphUpdate(event: GraphUpdateEventDto) {
    this.logger.debug(`Emitting graph update: ${event.eventType}`);

    // Emit to all clients
    this.server.emit('graph_update', event);

    // Also emit to specific event type room
    this.server.to(event.eventType).emit('graph_update', event);

    // Emit to 'all' room
    this.server.to('all').emit('graph_update', event);
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      rooms: this.server.sockets.adapter.rooms.size,
    };
  }
}
