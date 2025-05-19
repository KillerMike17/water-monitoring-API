import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  port: 3001,
})
export class SensorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map to track clientId to socket.id
  private clients: Map<string, string> = new Map();

  // When a client connects, they should send their ID
  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { clientId: string }) {
    console.log(`Client registered with ID: ${payload.clientId}`);
    this.clients.set(payload.clientId, client.id);
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Remove disconnected client from map
    for (const [key, socketId] of this.clients.entries()) {
      if (socketId === client.id) {
        this.clients.delete(key);
        break;
      }
    }
  }

  // Send data to a specific client by their clientId
  sendToClient(clientId: string, payload: any) {
    const socketId = this.clients.get(clientId);
    if (socketId) {
      this.server.to(socketId).emit('sensor-data', payload);
      console.log(`Sent data to client ${clientId}`);
    } else {
      console.log(`Client ${clientId} not connected`);
    }
  }
}
