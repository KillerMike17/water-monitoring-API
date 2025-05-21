import { PaginationInputs } from '@/common/common.types.dto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsString } from 'class-validator';
import { Document } from 'mongoose';

export enum SENSOR_STATUS {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  MAINTENANCE = 'Maintenance',
}
export enum SENSOR_INFO_TYPE {
  'STATUS' = 'Status',
  'ALERT' = 'Alert',
}

@Schema()
export class Sensor {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: Number, required: true })
  flowRate: number;

  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: Number, required: true })
  turbidity: number;

  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: Number, required: true })
  monthlyConsumption: number;

  @IsNotEmpty()
  @IsBoolean()
  @Prop({ type: Boolean, required: true })
  valveStatus: boolean;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  userId: string;

  @IsString()
  @Prop({ type: String, required: false })
  alertType?: string;

  @IsString()
  @Prop({ type: String, required: false })
  message?: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @IsOptional()
  @Prop({ type: String, enum: Object.values(SENSOR_STATUS), default: SENSOR_STATUS.ACTIVE })
  status?: SENSOR_STATUS;

  @IsOptional()
  @Prop({ type: String, enum: Object.values(SENSOR_INFO_TYPE), default: SENSOR_INFO_TYPE.STATUS })
  type?: SENSOR_INFO_TYPE;
}

@Schema()
export class SensorWaterDataDTO {
  @Prop({ type: Number, required: true })
  flowRate: number;

  @Prop({ type: Number, required: true })
  monthlyConsumption: number;

  @Prop({ type: Number, required: true })
  turbidity: number;

  @Prop({ type: Boolean, required: true })
  valveState: boolean;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: String, required: true })
  deviceId: string;
}

@Schema()
export class SensorAlertDTO {
  @Prop({ type: Boolean, required: true })
  valveStatus: boolean;

  @Prop({ type: String, required: true })
  alertType: string;

  @Prop({ type: String, required: true })
  flowRate: string;

  @Prop({ type: String, required: true })
  monthlyConsumption: string;

  @Prop({ type: String, required: true })
  turbidity: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: String, required: true })
  deviceId: string;
}

export type SensorDocument = Sensor & Document;
export const SensorSchema = SchemaFactory.createForClass(Sensor);
SensorSchema.index({ deviceId: 1 });
SensorSchema.index({ timestamp: -1 });

export class SensorDto extends OmitType(Sensor, ['_id']) {}

export class UpdateSensorDto extends PartialType(SensorDto) {}

export class SensorQuery extends PaginationInputs {
  @IsOptional()
  deviceId?: string;

  @IsOptional()
  status?: SENSOR_STATUS;

  @IsOptional()
  fromDate?: Date;

  @IsOptional()
  toDate?: Date;
}
