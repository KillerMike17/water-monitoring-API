import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { RegisterUserInput } from '@/app/account/users/entities/user.mut.dto';
import { RoleType } from '@/shared/models';
import { PaginationInputs } from '@/common/common.types.dto';

export class customerProfileDto extends OmitType(RegisterUserInput, ['email']) {
  @ApiHideProperty()
  @IsOptional()
  role: RoleType;

  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  active: boolean;

  @IsOptional()
  @ApiHideProperty()
  encryptedPwd: string;

  /**
   * properties specific to customer
   */
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsNumber()
  grade?: number;

  @IsString()
  @IsOptional()
  gender: GENDER;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  accountStatus?: ACCOUNT_STATUS;

  @IsOptional()
  @ApiHideProperty()
  assessmentStatus?: boolean;
}

export enum GENDER {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class customerFillProfile {
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  favSubj: string;

  @IsNotEmpty()
  userName: string;

  @IsOptional()
  @IsString()
  favAnimal?: string;

  @IsOptional()
  @IsString()
  hobby?: string;

  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsOptional()
  newPassword?: string;

  @IsOptional()
  @ApiHideProperty()
  accountStatus?: ACCOUNT_STATUS;

  @IsOptional()
  @ApiHideProperty()
  assessmentStatus?: boolean;
}

export class UpdateMe extends PartialType(PickType(customerFillProfile, ['avatar'])) {}

export class customerQuery extends PaginationInputs {
  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;
}

export enum ACCOUNT_STATUS {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export enum PAYMENTSTATUS {
  PAID = 'PAID',
  NOTPIAD = 'NOTPAID',
}

export enum SPECIALIZATIONS {
  SENSOR = 'SENSOR',
  HARDWARE = 'hardware',
}

export enum STATUS {
  SUCCESSFULL = 'successfull',
  PENDING = 'pending',
  UNSUCCESSFULL = 'unsuccessfull',
}
