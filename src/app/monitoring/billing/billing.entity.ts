import { PAYMENTSTATUS } from '@/app/account/profile/dto/profile.dto';
import { PaginationInputs } from '@/common/common.types.dto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Document } from 'mongoose';

@Schema()
export class Billing {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  refNo?: string;

  @Prop({ type: String })
  uuid?: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  date: string;

  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: Number })
  waterConsumption: number;

  @Prop({ type: String, enum: Object.values(PAYMENTSTATUS) })
  specialization?: PAYMENTSTATUS;
}

export type BillingDocument = Billing & Document;
export const BillingSchema = SchemaFactory.createForClass(Billing);
// Create indexes
BillingSchema.index({ name: 'text' });

export class BillingDto extends OmitType(Billing, ['_id']) {}

export class UpdateDto extends PartialType(BillingDto) {}

export class BillingQuery extends PaginationInputs {
  @IsOptional()
  userId?: string;

  @IsOptional()
  adventureId?: string;

  @IsOptional()
  month?: string;

  @IsOptional()
  sort?: string = 'count';
}
