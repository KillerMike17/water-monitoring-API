import { SPECIALIZATIONS } from '@/app/account/profile/dto/profile.dto';
import { PaginationInputs } from '@/common/common.types.dto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Document } from 'mongoose';

export enum TICKETSTATUS {
  PENDING = 'Pending',
  INPROGRESS = 'InProgress',
  RESOLVED = 'Resolved',
}

@Schema()
export class Ticket {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String })
  description: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  userId: string;

  @IsString()
  @Prop({ type: String })
  technicianId: string;

  @IsNotEmpty()
  @Prop({ type: String, enum: Object.values(SPECIALIZATIONS) })
  type: SPECIALIZATIONS;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, enum: Object.values(TICKETSTATUS) })
  status: TICKETSTATUS;
}

export type TicketDocument = Ticket & Document;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
// Create indexes
TicketSchema.index({ name: 'text' });

export class TicketDto extends OmitType(Ticket, ['_id']) {}

export class UpdateDto extends PartialType(TicketDto) {}

export class TicketQuery extends PaginationInputs {
  @IsOptional()
  userId?: string;

  @IsOptional()
  adventureId?: string;

  @IsOptional()
  month?: string;

  @IsOptional()
  sort?: string = 'count';
}
