import { Document } from 'mongoose';
import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '@/common/common.types.dto';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  // FAILED = 'FAILED',
}

export enum PaymentMethod {
  CHAPA = 'CHAPA',
}

export enum Currency {
  ETB = 'ETB',
}

export enum PaymentMadeBy {
  self = 'self',
  other = 'other',
}

@Schema()
export class BasePayment {
  // ============
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String })
  uuid?: string;

  // generic items ====================
  @IsNotEmpty()
  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
  })
  paymentMethod: PaymentMethod;

  @IsNotEmpty()
  @Prop({
    type: String,
    enum: Object.values(Currency),
    default: Currency.ETB,
  })
  currency: Currency;

  @IsNotEmpty()
  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
  })
  status: PaymentStatus;

  @Prop({ type: String })
  first_name?: string;

  @Prop({ type: String })
  last_name?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone_number?: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentMadeBy),
    default: PaymentMadeBy.self,
  })
  paymentMadeBy?: PaymentMadeBy;
}

export interface PaymentBill {
  uuid: string;
  userId: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
}

@Schema()
export class Payment extends BasePayment {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  /**
   *============================   Generic common fields, fields to be merged
   */
  //@TBR: outTradeNo
  @IsNotEmpty()
  @Prop({ type: String, unique: true })
  tx_ref: string;

  // @Prop({ type: String })
  // outTradeNo?: string;

  /**
   * ==== this is the amount the user actually pays
   */
  //@TBR: totalAmount
  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: Number, required: true })
  amount: number;

  // //TBR
  // @Prop({ type: String })
  // totalAmount?: string;

  //@TBR -subject
  @IsOptional()
  @IsString()
  @Prop({ type: String })
  title?: string;

  // @Prop({ type: String })
  // subject?: string;

  //CHP
  @IsOptional()
  @IsString()
  @Prop({ type: String })
  description?: string;

  //------------  Returned data
  //@TBR: = toPayUrl
  @IsNotEmpty()
  @Prop({ type: String, unique: true, sparse: true })
  checkout_url: string;

  // @IsNotEmpty()
  // @Prop({ type: String, unique: true, sparse: true })
  // toPayUrl?: string;

  //@TBR -- timestamp
  @IsOptional()
  @Prop({ type: String })
  created_at?: string;

  // @Prop({ type: String })
  // timestamp?: string;

  //@TBR -- tradeDate
  @IsOptional()
  @Prop({ type: String })
  updated_at?: string;

  // //@CHP -- updated_at
  // @Prop({ type: String })
  // tradeDate?: string;

  /**
   * +++++++++++++++++++++++   chapa specific data
   * =======================================================
   */

  //------------     chapa Returned Data
  @IsOptional()
  @IsNumber()
  @Prop({ type: Number })
  charge?: number;

  //is this test or live mode
  @IsOptional()
  @Prop({ type: String })
  mode?: string;

  @IsOptional()
  @Prop({ type: String })
  event?: string;

  // test or d/t
  @IsOptional()
  @Prop({ type: String })
  method?: string;

  @IsOptional()
  @Prop({ type: String })
  type?: string;

  @IsOptional()
  @Prop({ type: String })
  reference?: string;

  /**
   * +++++++++++++++++++++++   TELE-BIRR specific data
   * =============================== ================================
   *
   */
  // this is the organization name
  @Prop({ type: String })
  receiveName?: string;

  @Prop({ type: String })
  nonce?: string;

  @Prop({ type: String })
  timeoutExpress?: string;

  //--------------  telebirr Returned data

  @Prop({ type: String })
  msisdn?: string;

  @Prop({ type: String })
  tradeNo?: string;

  @Prop({ type: String })
  tradeStatus?: string;

  @Prop({ type: String })
  transactionNo?: string;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create indexes
export class PaymentDto extends PickType(Payment, [
  'email',
  'first_name',
  'last_name',
  'userId',
  'description',
  'title',
  'uuid',
  'currency',
]) {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class PaymentInput extends OmitType(Payment, ['_id']) {}

export class UpdateDto extends PartialType(PaymentDto) {}

export class PaymentQuery extends PaginationInputs {
  @IsOptional()
  tx_ref?: string;

  @IsOptional()
  transactionNo?: string;

  @IsOptional()
  msisdn?: string;

  @IsOptional()
  tradeNo?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  userId?: string;

  @IsOptional()
  uuid?: string;

  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsOptional()
  status?: PaymentStatus;

  @IsOptional()
  first_name?: string;

  @IsOptional()
  last_name?: string;

  @IsOptional()
  phone_number?: string;

  @IsOptional()
  amount: number;
}
