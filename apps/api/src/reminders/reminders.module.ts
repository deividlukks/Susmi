import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { ReminderScheduler } from './reminder.scheduler';

@Module({
  providers: [RemindersService, ReminderScheduler],
  controllers: [RemindersController],
  exports: [RemindersService],
})
export class RemindersModule {}
