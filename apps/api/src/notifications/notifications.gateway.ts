import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface NotificationPayload {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  timestamp: Date;
  data?: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove socket from user mappings
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(client.id);
      if (index > -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: string) {
    this.logger.log(`User ${userId} registered with socket ${client.id}`);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }

    const sockets = this.userSockets.get(userId);
    if (sockets && !sockets.includes(client.id)) {
      sockets.push(client.id);
    }

    return { status: 'registered', userId };
  }

  // Send notification to specific user
  sendToUser(userId: string, notification: NotificationPayload) {
    const socketIds = this.userSockets.get(userId);

    if (socketIds && socketIds.length > 0) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
      });
      this.logger.log(`Notification sent to user ${userId}: ${notification.title}`);
    }
  }

  // Broadcast notification to all connected users
  broadcast(notification: NotificationPayload) {
    this.server.emit('notification', notification);
    this.logger.log(`Broadcast notification: ${notification.title}`);
  }

  // Send notification to multiple users
  sendToUsers(userIds: string[], notification: NotificationPayload) {
    userIds.forEach((userId) => {
      this.sendToUser(userId, notification);
    });
  }
}
