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
import { PaymentsModule } from './app/payment/payment.module';
import { UsersModule } from './app/account/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,

    // Account modules
    UsersModule,
    AuthModule,
    ProfileModule,
    NotificationModule,
    SensorModule,
    TicketsModule,
    BillingsModule,
    PaymentsModule,

    // Background Job Module
    ScheduleModule.forRoot(),

    // Mongoose Module for MongoDB
    MongooseModule.forRoot('mongodb://username:password@host:port/database', {
      // Replace with your MongoDB connection string
      // other options if needed
    }),

    // MQTT Client Module
    ClientsModule.register([
      {
        name: 'MQTT_CLIENT',
        transport: Transport.MQTT,
        options: {
          url: 'mqtt://your-mqtt-broker:1883', // Replace with your MQTT broker URL
          // other MQTT options if needed
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
// eslint-disable-next-line prettier/prettier
export class AppModule {}