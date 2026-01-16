import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TelegrafModule.forRoot({
      // O '!' garante que a variável existe. Alternativamente use um ConfigService.
      token: process.env.TELEGRAM_BOT_TOKEN!, 
    }),
    UsersModule,
  ],
  providers: [BotUpdate],
})
export class BotModule {}