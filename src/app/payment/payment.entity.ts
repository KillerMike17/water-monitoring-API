import { SPECIALIZATIONS, STATUS } from '@/app/account/profile/dto/profile.dto';
import { PaginationInputs } from '@/common/common.types.dto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Document } from 'mongoose';

@Schema()
export class Payment {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String })
  description: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: String, enum: Object.values(STATUS) })
  type: STATUS;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
// Create indexes
PaymentSchema.index({ name: 'text' });

export class PaymentDto extends OmitType(Payment, ['_id']) {}

export class UpdateDto extends PartialType(PaymentDto) {}

export class PaymentQuery extends PaginationInputs {
  @IsOptional()
  userId?: string;

  @IsOptional()
  adventureId?: string;

  @IsOptional()
  month?: string;

  @IsOptional()
  sort?: string = 'count';
}
