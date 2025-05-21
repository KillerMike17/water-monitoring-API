import { HttpException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { SensorGateway } from './sensor.gateway';
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
import {
  NotificationEnum,
  NotificationMessage,
  NotificationPurpose,
} from '../notification/dto/notification.dto';

@Injectable()
export class SensorService extends MongoGenericRepository<Sensor> {
  constructor(
    @InjectModel(Sensor.name) private sensorModel: Model<SensorDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private notifService: NotificationService,
    private userService: UserService,
    private readonly sensorGateway: SensorGateway,
  ) {
    super(sensorModel);
  }

  async validateUuidAndDeviceId(uuid: string, deviceId: string): Promise<void> {
    const user = await this.userService.findById(uuid);

    if (!user || user.val.deviceId !== deviceId) {
      throw new HttpException('UUID and device ID mismatch', 403);
    }
  }

  private async upsertNormalReading(data: any, userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existing = await this.sensorModel.findOne({
      deviceId: data.deviceId,
      type: { $ne: SENSOR_INFO_TYPE.ALERT },
      timestamp: { $gte: startOfDay },
    });

    if (existing) {
      await this.sensorModel.findByIdAndUpdate(existing._id, {
        $set: {
          flowRate: data.flowRate,
          monthlyConsumption: data.monthlyConsumption,
          turbidity: data.turbidity,
          valveStatus: data.valveStatus,
          timestamp: data.timestamp,
        },
      });
    } else {
      await this.sensorModel.create({
        userId,
        deviceId: data.deviceId,
        flowRate: data.flowRate,
        monthlyConsumption: data.monthlyConsumption,
        turbidity: data.turbidity,
        valveStatus: data.valveStatus,
        timestamp: data.timestamp,
      });
    }
  }

  private async saveOrUpdateAlert(alertDto: SensorAlertDTO, userId: string) {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const recentAlert = await this.sensorModel.findOne({
      deviceId: alertDto.deviceId,
      type: SENSOR_INFO_TYPE.ALERT,
      timestamp: { $gte: tenMinutesAgo },
    });

    if (recentAlert) {
      if (recentAlert.alertType === alertDto.alertType) {
        // Replace existing
        await this.sensorModel.findByIdAndUpdate(recentAlert._id, {
          $set: {
            ...alertDto,
            userId,
            type: SENSOR_INFO_TYPE.ALERT,
          },
        });
        return;
      }
    }

    await this.sensorModel.create({
      ...alertDto,
      userId,
      type: SENSOR_INFO_TYPE.ALERT,
    });
  }

  // old code
  async createWaterReading(createDto: SensorWaterDataDTO): Promise<Resp<Sensor>> {
    //find userid by deviceId
    const user = await this.userService.findOne({ deviceId: createDto.deviceId });
    if (!user) {
      throw new HttpException('User not found for the given deviceId', 400);
    }

    //save reading
    const reading = await this.sensorModel.create({
      flowRate: createDto.flowRate,
      monthlyConsumption: createDto.monthlyConsumption,
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
      flowRate: createDto.flowRate,
      monthlyConsumption: createDto.monthlyConsumption,
      turbidity: createDto.turbidity,
      valveStatus: createDto.valveStatus,
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

  async processMqttMessage(data: any): Promise<{
    received: any;
    status: string;
    hasAlert?: boolean;
    error?: string;
  }> {
    try {
      const turbidity = parseFloat(data.turbidity);
      const flowRate = parseFloat(data.flowRate);

      const isTurbidityUnsafe = turbidity > 5;
      const isTurbidityAbnormal = turbidity < 0.5;
      const isFlowRateAbnormal = flowRate > 15 || flowRate < 1;

      const user = await this.userService.findOne({ deviceId: data.deviceId });
      console.log(isTurbidityUnsafe, isTurbidityAbnormal, isFlowRateAbnormal, flowRate, turbidity); //

      // Emit real-time data to the specific client based on deviceId
      this.sensorGateway.sendToClient(user.val.uuid, {
        flowRate,
        turbidity,
        valveState: data.valveStatus,
        monthlyConsumption: data.monthlyConsumption,
        timestamp: data.timestamp,
        deviceId: data.deviceId,
      });
      console.log('Sending data to client:', user.val.uuid, user.val.deviceId);
      if (isTurbidityUnsafe) {
        await this.handleUnsafeWaterAlert(data, turbidity, user);
        return { received: data, status: 'processed', hasAlert: true };
      }

      if (isTurbidityAbnormal || isFlowRateAbnormal) {
        await this.handleSensorCheckAlert(data, turbidity, flowRate, user);
        return { received: data, status: 'processed', hasAlert: true };
      }

      // Store normal reading (no alert)
      if (user) {
        // await this.createOne({
        //   userId: user.val._id,
        //   flowRate: data.flowRate,
        //   monthlyConsumption: data.monthlyConsumption,
        //   turbidity: data.turbidity,
        //   valveStatus: data.valveStatus,
        //   deviceId: data.deviceId,
        //   timestamp: data.timestamp,
        // });
        await this.upsertNormalReading(data, user.val._id);
      }

      return { received: data, status: 'processed', hasAlert: false };
    } catch (error) {
      console.error('Error processing MQTT message:', error);
      return {
        received: data,
        status: 'error',
        error: error.message,
      };
    }
  }

  private async handleUnsafeWaterAlert(data: any, turbidity: number, user: any) {
    const alertDto: SensorAlertDTO = {
      valveStatus: data.valveStatus,
      flowRate: data.flowRate,
      turbidity: data.turbidity,
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      monthlyConsumption: data.monthlyConsumption,
      alertType: 'UNSAFE_WATER',
      message: `Unsafe water detected: Turbidity is ${turbidity} NTU.`,
    };

    // await this.createWaterReadingAlert(alertDto);
    await this.saveOrUpdateAlert(alertDto, user.val._id);

    if (user) {
      await this.notifService.createOne({
        userId: user.val._id,
        type: NotificationEnum.Individual,
        title: 'Unsafe Water Alert',
        body: alertDto.message,
        messageType: NotificationMessage.Warning,
        purpose: NotificationPurpose.WaterQuality,
      });
    }
  }

  private async handleSensorCheckAlert(data: any, turbidity: number, flowRate: number, user: any) {
    const alertDto: SensorAlertDTO = {
      flowRate: data.flowRate,
      turbidity: data.turbidity,
      valveStatus: data.valveStatus,
      monthlyConsumption: data.monthlyConsumption,
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      alertType: 'SENSOR_CHECK',
      message: `Abnormal sensor readings: Turbidity ${turbidity} NTU, Flow Rate ${flowRate} L/min.`,
    };

    // await this.createWaterReadingAlert(alertDto);
    await this.saveOrUpdateAlert(alertDto, user.val._id);

    if (user) {
      await this.notifService.createOne({
        userId: user.val._id,
        type: NotificationEnum.Individual,
        title: 'Sensor Issue Detected',
        body: alertDto.message,
        messageType: NotificationMessage.Warning,
        purpose: NotificationPurpose.SystemHealth,
      });
    }
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
