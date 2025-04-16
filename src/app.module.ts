import { UsersModule } from '@/app/account/users';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './app/account/auth/auth.module';
import { ProfileModule } from './app/account/profile/profile.module';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { DatabaseModule } from './providers/database/databaseModule';
import { ConfigModule } from '@/common/config/config.module';
import { NotificationModule } from './app/monitoring/notification/notification.module';
import { SensorModule } from './app/monitoring/sensor/sensor.module';
import { TicketsModule } from './app/monitoring/support_ticket/ticket.module';
import { BillingsModule } from './app/monitoring/billing/billing.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,

    //Account modules
    UsersModule,
    AuthModule,
    ProfileModule,
    NotificationModule,
    SensorModule,
    TicketsModule,
    BillingsModule,

    // Background Job Module
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
