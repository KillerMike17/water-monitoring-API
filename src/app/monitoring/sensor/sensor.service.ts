import { HttpException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  Sensor,
  SENSOR_INFO_TYPE,
  SENSOR_STATUS,
  SensorAlertDTO,
  SensorDocument,
  SensorDto,
  SensorWaterDataDTO,
} from './sensor.entity';
import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '@/app/account/users';
import { Resp } from '@/common/constants/return.const';

@Injectable()
export class SensorService extends MongoGenericRepository<Sensor> {
  constructor(
    @InjectModel(Sensor.name) private sensorModel: Model<SensorDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private notifService: NotificationService,
    private userService: UserService,
  ) {
    super(sensorModel);
  }

  async createWaterReading(createDto: SensorWaterDataDTO): Promise<Resp<Sensor>> {
    //find userid by deviceId
    const user = await this.userService.findOne({ deviceId: createDto.deviceId });
    if (!user) {
      throw new HttpException('User not found for the given deviceId', 400);
    }

    //save reading
    const reading = await this.sensorModel.create({
      flowRate: createDto.flowRate,
      turbidity: createDto.turbidity,
      valveStatus: createDto.valveState,
      deviceId: createDto.deviceId,
      timestamp: createDto.timestamp,
      userId: user.val._id,
    });

    if (!reading) {
      throw new HttpException('Failed to save reading', 500);
    }

    return { ok: true, val: reading, error: null };
  }

  async createWaterReadingAlert(createDto: SensorAlertDTO): Promise<Resp<Sensor>> {
    //find userid by deviceId
    const user = await this.userService.findOne({ deviceId: createDto.deviceId });
    if (!user) {
      throw new HttpException('User not found for the given deviceId', 400);
    }

    //save reading
    const reading = await this.sensorModel.create({
      type: SENSOR_INFO_TYPE.ALERT,
      deviceId: createDto.deviceId,
      timestamp: createDto.timestamp,
      userId: user.val._id,
      alertType: createDto.alertType,
      message: createDto.message,
      // status: SENSOR_STATUS.INACTIVE,
    });

    if (!reading) {
      throw new HttpException('Failed to save Alert', 500);
    }

    return { ok: true, val: reading, error: null };
  }

  // async getLatestReading(deviceId: string) {
  //   const reading = await this.sensorModel
  //     .findOne({ deviceId })
  //     .sort({ timestamp: -1 })
  //     .limit(1)
  //     .exec();
  //   return { ok: true, val: reading };
  // }

  // async getDeviceStats(deviceId: string) {
  //   const stats = await this.sensorModel.aggregate([
  //     { $match: { deviceId } },
  //     {
  //       $group: {
  //         _id: null,
  //         avgFlowRate: { $avg: '$flowRate' },
  //         maxFlowRate: { $max: '$flowRate' },
  //         minFlowRate: { $min: '$flowRate' },
  //         avgTurbidity: { $avg: '$turbidity' },
  //         maxTurbidity: { $max: '$turbidity' },
  //         minTurbidity: { $min: '$turbidity' },
  //       },
  //     },
  //   ]);
  //   return { ok: true, val: stats[0] || {} };
  // }
}
