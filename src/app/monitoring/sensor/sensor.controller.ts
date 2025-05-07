import { PaginatedRes } from '@/common/common.types.dto';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Endpoint } from '@/shared/modelConsts';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoleType } from '@/shared/models';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  Sensor,
  SensorAlertDTO,
  SensorDto,
  SensorQuery,
  SensorWaterDataDTO,
  UpdateSensorDto,
} from './sensor.entity';
import { SensorService } from './sensor.service';
import { NotificationService } from '../notification/notification.service';
import {
  NotificationEnum,
  NotificationMessage,
  NotificationPurpose,
} from '../notification/dto/notification.dto';

@ApiTags(Endpoint.Sensor)
@Controller(Endpoint.Sensor)
export class SensorController {
  constructor(
    private readonly sensorService: SensorService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('water-data')
  //   @Roles(RoleType.ADMIN, RoleType.IOT_DEVICE)
  //   @UseGuards(JwtGuard)
  async createReading(@Body() createDto: SensorWaterDataDTO): Promise<Sensor> {
    const resp = await this.sensorService.createWaterReading(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    if (createDto.turbidity > 10) {
      await this.notificationService.createOne({
        userId: resp.val.userId,
        type: NotificationEnum.Individual,
        title: 'High Turbidity Alert',
        body: `Device ${createDto.deviceId} detected high turbidity: ${createDto.turbidity} NTU`,
        messageType: NotificationMessage.Warning,
        purpose: NotificationPurpose.WaterQuality,
      });
    }

    return resp.val;
  }

  @Post('water-alert')
  //   @Roles(RoleType.ADMIN, RoleType.IOT_DEVICE)
  //   @UseGuards(JwtGuard)
  async createAlert(@Body() createDto: SensorAlertDTO): Promise<Sensor> {
    const resp = await this.sensorService.createWaterReadingAlert(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    await this.notificationService.createOne({
      userId: resp.val.userId,
      type: NotificationEnum.Individual,
      title: '.... Alert',
      body: `Device ${createDto.deviceId} detected ...U`,
      messageType: NotificationMessage.Warning,
      purpose: NotificationPurpose.WaterAlert,
    });

    return resp.val;
  }

  // @GET('water-data')
  // //   @Roles(RoleType.ADMIN, RoleType.IOT_DEVICE)
  // //   @UseGuards(JwtGuard)
  // async getReading(): Promise<Sensor> {
  //   try {
  //     const espResponse = await this.sensorService.getRealTimeDataFromESP32();
  //     return espResponse;
  //   } catch (error) {
  //     console.error("Error fetching real-time data from ESP32:", error.message);
  //     throw new HttpException('Error getting real-time data from ESP32', 500);
  //   }

  //   return resp.val;
  // }

  // @Get('water-data')
  // @Roles(RoleType.ADMIN, RoleType.TECHNICIAN)
  // async getWaterData() {
  //   return this.sensorService.getLatestSensorData();
  // }

  // @Post('water-alert')
  // @Roles(RoleType.IOT_DEVICE)
  // @UseGuards(JwtGuard)
  // async storeAlert(
  //   @Body() alert: { alertType: string; message: string; timestamp: Date; deviceId: string },
  // ) {
  //   return this.sensorService.storeAlert(alert);
  // }

  //   @Post()
  //   @Roles(RoleType.ADMIN, RoleType.IOT_DEVICE)
  //   @UseGuards(JwtGuard)
  //   async createReading(@Body() createDto: SensorDto): Promise<Sensor> {
  //   const resp = await this.sensorService.createReading(createDto);
  //   if (!resp.ok) throw new HttpException(resp.val.errors.message, 400);

  //   if (createDto.turbidity > 10) {
  //     await this.notificationService.createOne({
  //       userId: 'user', //todo: logic for geting their id by matching sensor id
  //       type: NotificationEnum.Individual,
  //       title: 'High Turbidity Alert',
  //       body: `Device ${createDto.deviceId} detected high turbidity: ${createDto.turbidity} NTU`,
  //       messageType: NotificationMessage.Warning,
  //       purpose: NotificationPurpose.WaterQuality,
  //     });
  //   }

  //   return resp.val;
  //   }

  //   @Patch(':id/valve')
  //   @Roles(RoleType.ADMIN, RoleType.IOT_DEVICE)
  //   @UseGuards(JwtGuard)
  //   async toggleValve(@Param('id') id: string, @Body() { status }: { status: boolean }) {
  //     const res = await this.sensorService.updateById(id, { valveStatus: status });
  //     if (!res.ok) throw new HttpException(res.errMessage, res.code);

  //     await this.notificationService.createOne({
  //       userId: 'user', //todo: logic for geting their id by matching sensor id
  //       type: NotificationEnum.Individual,
  //       title: `Valve ${status ? 'Opened' : 'Closed'}`,
  //       body: `Valve status changed for device ${res.val.deviceId}`,
  //       messageType: NotificationMessage.Information,
  //       purpose: NotificationPurpose.WaterControl,
  //     });

  //     return res.val;
  //   }

  // @Get()
  // @UseGuards(JwtGuard)
  // async getReadings(@Query() inputQuery: SensorQuery): Promise<PaginatedRes<Sensor>> {
  //   const res = await this.sensorService.searchWithPaginate([], inputQuery);
  //   if (!res.ok) throw new HttpException(res.errMessage, res.code);
  //   return res.val;
  // }

  //   @Get('device/:deviceId/latest')
  //   @UseGuards(JwtGuard)
  //   async getLatestReading(@Param('deviceId') deviceId: string) {
  //     const res = await this.sensorService.getLatestReading(deviceId);
  //     if (!res.ok) throw new HttpException(res.val.errors.message, 400);
  //     return res.val;
  //   }
}
