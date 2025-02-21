import {
  IsBoolean,
  IsMobilePhone,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { RoleType } from '@/shared/models';
import { ApiHideProperty } from '@nestjs/swagger';

export class TokenInput {
  @IsString()
  @IsOptional()
  refreshToken: string;

  @IsOptional()
  @IsBoolean()
  isCookie: boolean;
}

export class EmailInput {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class UserNameInput {
  @IsString()
  @IsNotEmpty()
  userName: string;
}

export class VerifyCodeInput {
  @IsString()
  @IsNotEmpty()
  phoneOrEmail: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class LoginUserInput {
  @IsString()
  @IsNotEmpty()
  phoneOrEmail: string;

  @IsString()
  @MinLength(3)
  password: string;

  @IsOptional()
  @IsBoolean()
  isPhone?: boolean = false;

  @IsOptional()
  role?: RoleType;
}

// User change password directly on website

export class ChangePasswordInput {
  @IsString()
  oldPassword: string;

  @MinLength(6)
  @IsString()
  newPassword: string;

  @IsOptional()
  @IsString()
  role?: RoleType;
}

export class ChangePasswordResp {
  @ApiHideProperty()
  message: string;
}

// user's input when verifying token to change password
export class ResetPasswordInput {
  @IsString()
  emailOrUserName: string;

  @IsString()
  code: string;

  @MinLength(6)
  @IsString()
  newPassword: string;

  @IsBoolean()
  resetAllSessions: boolean;
}

// user's input when verifying token to change password
export class ResetPasswordWithPhone {
  @IsString()
  token: string;

  @MinLength(6)
  @IsString()
  newPassword: string;

  @IsBoolean()
  resetAllSessions: boolean;
}

export class RequestForgotPasswordInput {
  @IsMobilePhone()
  phone: string;
}
