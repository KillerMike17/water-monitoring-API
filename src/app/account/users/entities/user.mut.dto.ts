import { OmitType, PartialType, ApiHideProperty } from '@nestjs/swagger';
import { RoleType } from '@/shared/models';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { RegistrationMethod } from '@/app/account/users/entities/user.entity';
import { ACCOUNT_STATUS, GENDER } from '@/app/account/profile/dto/profile.dto';

export class RegisterUserInput {
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiHideProperty()
  @IsOptional()
  registerMethod?: RegistrationMethod;
}

export class RegisterDirectly extends OmitType(RegisterUserInput, ['email']) {
  @IsOptional()
  @ApiHideProperty()
  encryptedPwd: string;

  @IsOptional()
  @ApiHideProperty()
  role: RoleType;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  accountStatus?: ACCOUNT_STATUS;

  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  active: boolean;
}

export class RegisterWithPhoneInput extends OmitType(RegisterUserInput, ['email']) {
  @IsNotEmpty()
  firebaseToken?: string;

  @ApiHideProperty()
  @IsOptional()
  phone?: string;
}

export class UpdateMeDto extends PartialType(OmitType(RegisterUserInput, ['email', 'password'])) {
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class UpdateUserWithRole extends UpdateMeDto {
  @IsString()
  @IsOptional()
  role?: RoleType;

  @IsString()
  @IsOptional()
  userName?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateUser extends RegisterUserInput {
  @IsNotEmpty()
  role: RoleType;

  @IsBoolean()
  @IsNotEmpty()
  active: boolean;
}

export class CreateUsers extends RegisterUserInput {
  @IsNotEmpty()
  role: RoleType;

  @IsBoolean()
  @IsNotEmpty()
  active: boolean;

  @IsOptional()
  accountStatus?: ACCOUNT_STATUS;

  @IsOptional()
  uuid?: string;
}

export class FilterUser extends PartialType(OmitType(RegisterUserInput, ['password'])) {
  @IsOptional()
  phone?: string;

  @IsOptional()
  _id?: string;

  @IsOptional()
  gender?: GENDER;

  @IsOptional()
  accountStatus?: ACCOUNT_STATUS;
  @IsOptional()
  registerMethod?: RegistrationMethod;
}

export class UpdateEmailInput {
  @IsEmail()
  newEmail: string;
}
