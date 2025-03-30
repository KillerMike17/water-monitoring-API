import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../../account/users';
import {
  NotificationEnum,
  NotificationMessage,
  NotificationPurpose,
  NotificationStatus,
} from '../dto/notification.dto';
import { Prop as MProp } from '@nestjs/mongoose/dist/decorators/prop.decorator';
import { IsString } from 'class-validator';

@Schema({ timestamps: true })
export class Notification {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsString()
  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  body?: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.Unread,
  })
  status?: NotificationStatus;

  @MProp({
    type: String,
    enum: Object.values(NotificationMessage),
  })
  messageType?: NotificationMessage;

  @MProp({
    type: String,
    enum: Object.values(NotificationPurpose),
  })
  purpose?: NotificationPurpose;

  @MProp({
    type: String,
    enum: Object.values(NotificationEnum),
    default: NotificationEnum.Individual,
  })
  type?: NotificationEnum; //general, single user

  @Prop({ type: String, required: false, ref: 'User' })
  to: string;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
// Create indexes
NotificationSchema.index({ name: 'text' });
