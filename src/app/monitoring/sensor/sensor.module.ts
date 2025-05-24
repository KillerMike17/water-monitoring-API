// sensor.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorController } from './sensor.controller';
import { SensorService } from './sensor.service';
import { Sensor, SensorSchema } from './sensor.entity';
import { SensorGateway } from './sensor.gateway';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '@/app/account/users';
import { MqttModule } from './mqtt.module';
import { BillingsModule } from '../billing/billing.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sensor.name, schema: SensorSchema }]),
    NotificationModule,
    UsersModule,
    MqttModule,
    BillingsModule,
  ],
  controllers: [SensorController],
  providers: [SensorService, SensorGateway],
  exports: [SensorService, SensorGateway],
})
export class SensorModule {}
