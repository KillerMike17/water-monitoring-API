import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorController } from './sensor.controller';
import { SensorService } from './sensor.service';
import { Sensor, SensorSchema } from './sensor.entity';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '@/app/account/users';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sensor.name, schema: SensorSchema }]),
    NotificationModule,
    UsersModule,
  ],
  controllers: [SensorController],
  providers: [SensorService],
  exports: [SensorService],
})
export class SensorModule {}
