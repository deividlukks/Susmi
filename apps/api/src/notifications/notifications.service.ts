import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotificationsGateway, NotificationPayload } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  // Helper method to create and send notifications
  private createNotification(
    type: NotificationPayload['type'],
    title: string,
    message: string,
    userId?: string,
    data?: any,
  ): NotificationPayload {
    return {
      id: randomUUID(),
      type,
      title,
      message,
      userId,
      timestamp: new Date(),
      data,
    };
  }

  // Send success notification
  sendSuccess(title: string, message: string, userId?: string, data?: any) {
    const notification = this.createNotification('success', title, message, userId, data);

    if (userId) {
      this.notificationsGateway.sendToUser(userId, notification);
    } else {
      this.notificationsGateway.broadcast(notification);
    }
  }

  // Send info notification
  sendInfo(title: string, message: string, userId?: string, data?: any) {
    const notification = this.createNotification('info', title, message, userId, data);

    if (userId) {
      this.notificationsGateway.sendToUser(userId, notification);
    } else {
      this.notificationsGateway.broadcast(notification);
    }
  }

  // Send warning notification
  sendWarning(title: string, message: string, userId?: string, data?: any) {
    const notification = this.createNotification('warning', title, message, userId, data);

    if (userId) {
      this.notificationsGateway.sendToUser(userId, notification);
    } else {
      this.notificationsGateway.broadcast(notification);
    }
  }

  // Send error notification
  sendError(title: string, message: string, userId?: string, data?: any) {
    const notification = this.createNotification('error', title, message, userId, data);

    if (userId) {
      this.notificationsGateway.sendToUser(userId, notification);
    } else {
      this.notificationsGateway.broadcast(notification);
    }
  }

  // Send notification to multiple users
  sendToUsers(userIds: string[], notification: Omit<NotificationPayload, 'id' | 'timestamp'>) {
    const fullNotification = this.createNotification(
      notification.type,
      notification.title,
      notification.message,
      undefined,
      notification.data,
    );

    this.notificationsGateway.sendToUsers(userIds, fullNotification);
  }

  // Notification templates for common actions
  notifyTaskCreated(userId: string, taskTitle: string) {
    this.sendSuccess(
      'Nova Tarefa',
      `A tarefa "${taskTitle}" foi criada`,
      userId,
      { type: 'task' },
    );
  }

  notifyTaskCompleted(userId: string, taskTitle: string) {
    this.sendSuccess(
      'Tarefa Concluída',
      `A tarefa "${taskTitle}" foi concluída`,
      userId,
      { type: 'task' },
    );
  }

  notifyEventCreated(userId: string, eventTitle: string) {
    this.sendInfo(
      'Novo Evento',
      `O evento "${eventTitle}" foi criado`,
      userId,
      { type: 'event' },
    );
  }

  notifyHabitCheckIn(userId: string, habitTitle: string, streak: number) {
    this.sendSuccess(
      'Check-in Realizado',
      `Check-in no hábito "${habitTitle}" - ${streak} dias de sequência!`,
      userId,
      { type: 'habit', streak },
    );
  }

  notifyProjectUpdate(userIds: string[], projectTitle: string, updateType: string) {
    this.sendToUsers(userIds, {
      type: 'info',
      title: 'Projeto Atualizado',
      message: `O projeto "${projectTitle}" foi ${updateType}`,
      data: { type: 'project' },
    });
  }

  notifyCardAssigned(userId: string, cardTitle: string, projectTitle: string) {
    this.sendInfo(
      'Card Atribuído',
      `Você foi atribuído ao card "${cardTitle}" no projeto "${projectTitle}"`,
      userId,
      { type: 'card' },
    );
  }
}
