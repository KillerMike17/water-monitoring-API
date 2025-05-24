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
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoleType } from '@/shared/models';
import { billingService } from '../billing/billing.service';
import { PAYMENTSTATUS } from '@/app/account/profile/dto/profile.dto';

@Injectable()
export class SensorService extends MongoGenericRepository<Sensor> {
  constructor(
    @InjectModel(Sensor.name) private sensorModel: Model<SensorDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private notifService: NotificationService,
    private userService: UserService,
    private billingService: billingService,
    private readonly sensorGateway: SensorGateway,
  ) {
    super(sensorModel);
  }

  // This cron job will run at 00:00 on the 1st day of every month
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyBilling() {
    const users = await this.userService.find({ filter: { role: RoleType.Customer } });

    for (const user of users.val) {
      const today = new Date();

      // Determine the target billing month (e.g., the previous calendar month)
      const targetMonthStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // First day of the previous month
      const targetMonthEndDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of the previous month

      try {
        // 1. Find the last sensor entry for the user within the target billing month
        const currentMonthEndSensorEntry = await this.sensorModel
          .findOne({
            userId: user._id,
            timestamp: {
              $gte: targetMonthStartDate,
              $lte: targetMonthEndDate,
            },
          })
          .sort({ timestamp: -1 }) // Get the very last entry within the target month
          .exec();

        if (currentMonthEndSensorEntry) {
          // 2. Find the last sensor entry *before* the target billing month started
          const previousRecordedSensorEntry = await this.sensorModel
            .findOne({
              userId: user._id,
              timestamp: {
                $lt: targetMonthStartDate, // Strictly less than the start of the target month
              },
            })
            .sort({ timestamp: -1 }) // Get the very last entry before the target month
            .exec();

          const billingDate = targetMonthEndDate.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'

          // Check if a billing entry already exists for this user and month to prevent duplicates
          const existingBilling = await this.billingService.findOne({
            userId: user._id,
            date: billingDate,
          });

          if (!existingBilling.ok) {
            let waterConsumptionForMonth = 0;

            if (previousRecordedSensorEntry) {
              // Calculate monthly consumption: current month's total - previous recorded total before this month
              waterConsumptionForMonth =
                currentMonthEndSensorEntry.monthlyConsumption -
                previousRecordedSensorEntry.monthlyConsumption;
            } else {
              // If no previous entry exists at all before the target month,
              // then the entire 'monthlyConsumption' of the current month's end entry
              // represents the consumption for this specific month (assuming it started from 0).
              console.warn(
                `No sensor data found before ${targetMonthStartDate.toDateString()} for user ${
                  user._id
                }. Using current month's total as monthly consumption.`,
              );
              waterConsumptionForMonth = currentMonthEndSensorEntry.monthlyConsumption;
            }

            // Ensure consumption is not negative (can happen if readings are reset or inconsistent)
            if (waterConsumptionForMonth < 0) {
              console.warn(
                `Negative water consumption calculated for user ${user._id} for ${billingDate}. Setting to 0. Calculated: ${waterConsumptionForMonth}`,
              );
              waterConsumptionForMonth = 0;
            }

            const bill = await this.billingService.createOne({
              userId: user._id,
              date: billingDate,
              waterConsumption: waterConsumptionForMonth,
              status: PAYMENTSTATUS.NOTPIAD,
              uuid: user.uuid,
            });
            console.log({
              userId: user._id,
              date: billingDate,
              waterConsumption: waterConsumptionForMonth,
              status: PAYMENTSTATUS.NOTPIAD,
              uuid: user.uuid,
            });
            console.log(bill.val);
          } else {
            console.log(
              `Billing entry already exists for user ${user._id} for the date ${billingDate}. Skipping.`,
              existingBilling.val,
            );
          }
        } else {
          console.log(
            `No sensor data found for user ${
              user._id
            } for the target billing month (${targetMonthStartDate.toDateString()} - ${targetMonthEndDate.toDateString()}). Skipping billing entry.`,
          );
        }
      } catch (error) {
        console.log(`Error processing billing for user ${user._id}: ${error.message}`, error.stack);
      }
    }
    console.log('Monthly billing job completed.');
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
        // await this.sensorModel.findByIdAndUpdate(recentAlert._id, {
        //   $set: {
        //     ...alertDto,
        //     userId,
        //     type: SENSOR_INFO_TYPE.ALERT,
        //   },
        // });
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

  async processAlertMessage(data: any) {
    const { deviceId, timestamp, alertType, message } = data;
    if (!deviceId || !alertType || !message) {
      throw new Error('Missing required alert data: deviceId, alertType, or message.');
    }

    // Find user by deviceId
    const user = await this.userService.findOne({ deviceId });

    if (!user) {
      throw new Error(`No user found for device ID: ${deviceId}`);
    } else {
      await this.handleWaterAlert(data, user, timestamp, message, alertType);
    }
    return { received: data, status: 'processed', hasAlert: true };
  }

  async processMqttMessage(data: any): Promise<{
    received: any;
    status: string;
    hasAlert?: boolean;
    error?: string;
  }> {
    try {
      // const { deviceId, turbidity, flowRate, valveStatus, monthlyConsumption, timestamp } = data;
      if (
        !data.deviceId ||
        data.turbidity == null ||
        data.flowRate == null ||
        data.monthlyConsumption == null
      ) {
        throw new Error('Missing required sensor data: deviceId, turbidity, or flowRate.');
      }

      const turbidity = parseFloat(data.turbidity);
      const flowRate = parseFloat(data.flowRate);

      // const isTurbidityUnsafe = turbidity > 5;
      // const isTurbidityAbnormal = turbidity < 0.5;
      // const isFlowRateAbnormal = flowRate > 15 || flowRate < 1;

      const user = await this.userService.findOne({ deviceId: data.deviceId });
      // console.log(isTurbidityUnsafe, isTurbidityAbnormal, isFlowRateAbnormal, flowRate, turbidity); //
      if (!user) {
        throw new Error(`No user found for device ID: ${data.deviceId}`);
      }
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
      // if (isTurbidityUnsafe) {
      // await this.handleUnsafeWaterAlert(data, turbidity, user);
      //   return { received: data, status: 'processed', hasAlert: true };
      // }

      // if (isTurbidityAbnormal || isFlowRateAbnormal) {
      //   await this.handleSensorCheckAlert(data, turbidity, flowRate, user);
      //   return { received: data, status: 'processed', hasAlert: true };
      // }

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

  private async handleWaterAlert(
    data: any,
    user: any,
    timestamp: any,
    message: any,
    alertType: any,
  ) {
    const alertDto: SensorAlertDTO = {
      // valveStatus: data.valveStatus,
      // flowRate: data.flowRate,
      // turbidity: data.turbidity,
      deviceId: data.deviceId,
      timestamp,
      // monthlyConsumption: data.monthlyConsumption,
      alertType,
      message,
    };

    // await this.createWaterReadingAlert(alertDto);
    await this.saveOrUpdateAlert(alertDto, user.val._id);

    if (user) {
      await this.notifService.createOne({
        userId: user.val._id,
        type: NotificationEnum.Individual,
        title: 'Water Alert',
        body: alertDto.message,
        messageType: NotificationMessage.Warning,
        purpose: alertType,
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
