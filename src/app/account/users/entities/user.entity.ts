import { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty } from '@nestjs/swagger';

import { RoleType } from '@/shared/models';

import { ACCOUNT_STATUS, GENDER, SPECIALIZATIONS } from '../../profile/dto/profile.dto';

export const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

export enum RegistrationMethod {
  EMAIL = 'EMAIL',
}

@Schema({ timestamps: true })
export class User {
  // @Prop({
  //   get: (id: string) => {
  //     return id
  //   },
  // })
  readonly _id: string;

  @Prop({ type: String, unique: true, sparse: true })
  email: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: String })
  fullName?: string;

  @Prop({ type: String, select: false })
  @ApiHideProperty()
  password: string;

  @Prop({ type: String })
  dateOfBirth: string;

  @Prop({ required: false })
  avatar?: string;

  @Prop({
    type: String,
    enum: Object.values(RoleType),
    default: RoleType.Customer,
  })
  role: RoleType = RoleType.Customer;

  @Prop({ type: Boolean, required: false })
  active: boolean;

  //=======================  other models related

  //=========================================  Auth Related fields
  //===========================================================================================
  @ApiHideProperty()
  @Prop({ type: String, select: false })
  hashedRefreshToken: string;

  @Prop({ type: String, select: false, required: false })
  @ApiHideProperty()
  verificationCodeHash: string;

  @Prop({ select: false, required: false })
  @ApiHideProperty()
  verificationCodeExpires: number;

  @ApiHideProperty()
  @Prop({ required: false, select: false })
  newEmail: string;

  @Prop({
    type: String,
    enum: Object.values(RegistrationMethod),
  })
  registerMethod?: RegistrationMethod;

  /**
   * ================  These are properties specific for
   * ===================================================
   */

  @ApiHideProperty()
  @Prop({ required: false, select: false })
  encryptedPwd: string;

  @Prop({
    type: String,
    enum: Object.values(GENDER),
  })
  gender: GENDER;

  @Prop({
    type: String,
    enum: Object.values(ACCOUNT_STATUS),
  })
  accountStatus: ACCOUNT_STATUS;

  @Prop({ type: String })
  refNo?: string;

  @Prop({ type: String })
  uuid?: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: String, enum: Object.values(SPECIALIZATIONS) })
  specialization?: SPECIALIZATIONS;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
// Create indexes
UserSchema.index({ phone: 'text', email: 'text' });

// Hook before insert or save

UserSchema.pre('save', setDefaultFullName);

UserSchema.virtual('id').get(function () {
  return this._id;
});

async function setDefaultFullName(this: User, next) {
  try {
    if (this.firstName && !this.fullName) {
      this.fullName = this.firstName + ' ' + this.lastName;
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
