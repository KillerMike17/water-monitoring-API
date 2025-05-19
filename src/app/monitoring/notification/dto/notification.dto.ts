import { OmitType, PartialType } from '@nestjs/swagger';
import { PaginationInput } from '../notification.dependencies';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationInput {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  body?: string;

  @IsOptional()
  type?: NotificationEnum;

  @IsOptional()
  to?: string;
}

export class UpdateDto extends PartialType(CreateNotificationInput) {}

export class markReadDto {
  id?: string;
}

export class NotificationQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  to?: string;

  @IsOptional()
  type?: NotificationEnum;

  @IsOptional()
  userId?: string;
}

export enum NotificationEnum {
  General = 'General',
  Individual = 'Individual',
}

export enum NotificationMessage {
  Information = 'Information',
  Warning = 'Warning',
  Success = 'Success',
  Error = 'Error',
}

export enum NotificationStatus {
  Read = 'Read',
  Unread = 'Unread',
}
export enum NotificationPurpose {
  Ticket = 'Ticket',
  WaterQuality = 'WaterQuality',
  WaterControl = 'WaterControl',
  WaterAlert = 'WaterAlert',
  SystemHealth = 'SystemHealth',
}
