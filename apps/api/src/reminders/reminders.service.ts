import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateReminderDto,
  UpdateReminderDto,
  SnoozeReminderDto,
  Reminder,
  ReminderStatus,
} from '@susmi/types';

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createReminderDto: CreateReminderDto): Promise<Reminder> {
    const reminder = await this.prisma.reminders.create({
      data: {
        title: createReminderDto.title,
        description: createReminderDto.description,
        type: createReminderDto.type,
        triggerAt: createReminderDto.triggerAt,
        taskId: createReminderDto.taskId,
        eventId: createReminderDto.eventId,
        userId,
      },
    });

    return reminder as any;
  }

  async findAll(userId: string): Promise<Reminder[]> {
    const reminders = await this.prisma.reminders.findMany({
      where: { userId },
      orderBy: { triggerAt: 'asc' },
      include: {
        tasks: true,
        events: true,
      },
    });

    return reminders as any;
  }

  async findPending(userId: string): Promise<Reminder[]> {
    const reminders = await this.prisma.reminders.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'SNOOZED'] },
        OR: [
          { triggerAt: { lte: new Date() } },
          { snoozedUntil: { lte: new Date() } },
        ],
      },
      orderBy: { triggerAt: 'asc' },
      include: {
        tasks: true,
        events: true,
      },
    });

    return reminders as any;
  }

  async findOne(id: string, userId: string): Promise<Reminder> {
    const reminder = await this.prisma.reminders.findUnique({
      where: { id },
      include: {
        tasks: true,
        events: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado');
    }

    if (reminder.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return reminder as any;
  }

  async update(id: string, userId: string, updateReminderDto: UpdateReminderDto): Promise<Reminder> {
    await this.findOne(id, userId);

    const updatedReminder = await this.prisma.reminders.update({
      where: { id },
      data: updateReminderDto,
    });

    return updatedReminder as any;
  }

  async snooze(id: string, userId: string, snoozeDto: SnoozeReminderDto): Promise<Reminder> {
    await this.findOne(id, userId);

    const snoozedUntil = new Date();
    snoozedUntil.setMinutes(snoozedUntil.getMinutes() + snoozeDto.minutes);

    const updatedReminder = await this.prisma.reminders.update({
      where: { id },
      data: {
        status: ReminderStatus.SNOOZED,
        snoozedUntil,
      },
    });

    return updatedReminder as any;
  }

  async dismiss(id: string, userId: string): Promise<Reminder> {
    await this.findOne(id, userId);

    const updatedReminder = await this.prisma.reminders.update({
      where: { id },
      data: {
        status: ReminderStatus.DISMISSED,
      },
    });

    return updatedReminder as any;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.reminders.delete({ where: { id } });
  }

  async markAsSent(id: string): Promise<void> {
    await this.prisma.reminders.update({
      where: { id },
      data: {
        status: ReminderStatus.SENT,
        notificationSent: true,
      },
    });
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const now = new Date();

    const reminders = await this.prisma.reminders.findMany({
      where: {
        status: { in: ['PENDING', 'SNOOZED'] },
        notificationSent: false,
        OR: [
          { triggerAt: { lte: now }, status: 'PENDING' },
          { snoozedUntil: { lte: now }, status: 'SNOOZED' },
        ],
      },
      include: {
        users: true,
        tasks: true,
        events: true,
      },
    });

    return reminders as any;
  }
}
