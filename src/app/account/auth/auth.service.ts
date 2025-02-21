import { HttpException, Injectable } from '@nestjs/common';

import { ColorEnums, logTrace } from '@/common/logger';
import { CryptoService, CustomJwtService } from '@/providers/crypto';

import { User } from '../users';
import { RespConst as ErrConst } from '../../../common/constants/respConst';
import { UserFromToken } from '@/shared/models';
//--self
import { AuthToken, AuthTokenResponse, AuthTokenWithSubscription } from './dto/auth.response.dto';
import {
  LoginUserInput,
  ResetPasswordInput,
  ResetPasswordWithPhone,
  VerifyCodeInput,
} from './dto/auth.input.dto';
//- users
import { RegisterUserInput } from '@/app/account/users/entities/user.mut.dto';
import { UserService } from '@/app/account/users';
import { FAIL, Resp, Succeed } from '@/common/constants/return.const';
import { RespConst, SystemConst } from '@/common/constants/respConst';
import { RegisterWithPhoneInput, UpdateEmailInput } from '../users/entities/user.mut.dto';
import { HttpCodes } from '@/common/constants/http.codes';
import { ENV_TYPES } from '@/common/config/config.utills';
import { EnvVar } from '@/common/config/config.instances';
import { FirebaseService } from '@/providers/firebase';
import { RegistrationMethod } from '@/app/account/users/entities/user.entity';
import { VerificationService } from '@/verification';

@Injectable()
export class AuthService {
  private _envConfig: ENV_TYPES;

  constructor(
    private usersService: UserService,
    private jwtService: CustomJwtService,
    private cryptoService: CryptoService,
    private firebaseService: FirebaseService,
    private verificationService: VerificationService,
  ) {
    this._envConfig = EnvVar.getInstance;
  }

  //AS-1.1:registerWithEmailCode - check user exist, - generate code & create user with that code, - send verification via email
  public async registerWithEmailCode(input: RegisterUserInput): Promise<Resp<string>> {
    try {
      const user = await this.usersService.findOneWithPwd({
        email: input.email,
        // active: true,
      });

      //If the user exists
      if (user) {
        if (user.active) {
          // TODO: send a warning email/sms to users that some one is trying to log with their credintials
          return FAIL(RespConst.USER_EXISTS, HttpCodes.BAD_REQUEST);
        }
        // if user is not Verified yet and waiting for verification dont do any thing
        // TODO :make him wait some minutes before re assigning (verificationExpires > date.now + (VerExp - allowed Reset))
        if (
          user.verificationCodeExpires >
          Date.now() + (SystemConst.VERIFICATION_CODE_EXP - SystemConst.VERIFICATION_ALLOWED_RESET)
        ) {
          return FAIL(RespConst.VERIFICATION_PENDING, HttpCodes.TOO_EARLY);
        }
        // else {
        //   return FAIL(ErrConst.VERIFICATION_FAILED);
        // }
      }
      input.password = await this.cryptoService.createHash(input.password);
      input.registerMethod = RegistrationMethod.EMAIL;
      return this.sendCodeAndUpdateHash(input.email, input, {
        title: 'Please confirm your email address in order to activate your account.',
        message: 'Please confirm your email address by Filling the code below To Signup.',
        userName: `${input.firstName} ${input.lastName}`,
        warning: 'by sign up on our Platform',
      });
    } catch (e) {
      return FAIL(e.message);
    }
  }

  async sendWarningEmail(emailAdress): Promise<Resp<any>> {
    return Succeed('');
  }

  // AuS-1.1: sendCodeAndUpdateHash
  async sendCodeAndUpdateHash(addressedEmail, input, data = {}): Promise<Resp<string>> {
    //---  generate random code & update the verification hash
    // const code = '0000';
    let code = this.cryptoService.randomCode();
    if (this._envConfig.USE_MOCK_EMAIL === 'true') {
      logTrace('WE ARE USING MOCK EMAIL', this._envConfig.USE_MOCK_EMAIL, ColorEnums.BgMagenta);
      code = '0000';
    }
    const codeHash = await this.cryptoService.createHash(code);

    // save the hashed value of the Code and set its expire time now + 30 min
    const usr = await this.usersService.upsertOneAndReturnCnt(
      { email: input.email },
      {
        ...input,
        verificationCodeHash: codeHash,
        verificationCodeExpires: Date.now() + SystemConst.VERIFICATION_CODE_EXP,
      },
    );

    if (!usr.ok || (usr.val.modifiedCount == 0 && usr.val.upsertedCount == 0)) {
      // logTrace('update op=', usr);
      return FAIL(ErrConst.COULD_NOT_CREATE_USER);
    }
    if (this._envConfig.USE_MOCK_EMAIL !== 'true') {
      const emRes = await this.verificationService.sendVerificationCode(addressedEmail, code, data);
    }

    return Succeed(RespConst.VERIFICATION_SENT);
  }

  //===============  Verifying & activating user by code

  //AuSr-2: - checks user exists, - check if the hash of codes matches & is not expired, - activates user
  public async activateAccountByCode(phoneOrEmail: string, code: string): Promise<Resp<User>> {
    /**
     * verify the code, user is not active
     */
    const verifyToActivate = await this.verifyCode(phoneOrEmail, code);
    if (!verifyToActivate) return FAIL(ErrConst.INVALID_CODE);
    if (verifyToActivate.active == true) return FAIL(ErrConst.USER_EXISTS);

    // TODO! FIXME !: depend on the project Phone Or email
    const updatedUser = await this.usersService.findOneAndUpdate(
      { email: phoneOrEmail },
      {
        active: true,
      },
    );
    if (!updatedUser.ok) return FAIL(updatedUser.errMessage, updatedUser.code);
    // await this.emailService.sendWelcome(newUser.email)
    return Succeed(updatedUser.val);
  }

  //Au.S-2.1
  async verifyCode(phoneOrEmail: string, code: string): Promise<User> {
    //1. check that a user exists with this email or phone number
    const userToVerify = await this.usersService.anyUserExists(phoneOrEmail);
    if (!userToVerify) {
      logTrace('not found', code);
      return null;
    }
    const verificationCodeHashMatch = await this.cryptoService.verifyHash(
      userToVerify.verificationCodeHash,
      code,
    );
    if (!verificationCodeHashMatch || userToVerify.verificationCodeExpires < Date.now()) {
      logTrace('dont match', code);
      return null;
    }
    userToVerify.verificationCodeHash = '';
    userToVerify.password = '';
    return userToVerify;
  }

  //AuSr-3
  async login(input: LoginUserInput): Promise<Resp<AuthTokenResponse>> {
    // 3.1 validate user
    const user: User = await this.loginValidateUser(input);

    if (!user) return FAIL(ErrConst.INVALID_CREDENTIALS);
    const res = await this.generateAndUpdate({
      _id: user._id,
      role: user.role,
    });
    if (!res.ok) return FAIL(ErrConst.INTERNAL_ERROR);

    return Succeed({ authToken: res.val, user });
  }

  async generateAndUpdate(user: UserFromToken, update = false): Promise<Resp<AuthToken>> {
    //  2. generate new refresh tokens
    const authToken: AuthToken = await this.generateAuthToken(user, update);
    if (!authToken) return FAIL(ErrConst.INTERNAL_ERROR);

    //This is updated if the half lif have passed
    // 3.3: update users hashed token
    const updated = await this.updateHashedToken(user._id, authToken.refreshToken);
    if (!updated) return FAIL(ErrConst.INTERNAL_ERROR);

    return Succeed(authToken);
  }

  //Au.S-3.1
  async loginValidateUser(input: LoginUserInput): Promise<User> {
    const { phoneOrEmail, password } = input;
    logTrace('the user-', input);
    const userToLogin = await this.usersService.activeUserExists(phoneOrEmail, input.isPhone);
    if (!userToLogin) return null;

    // Check password hash
    const pwdHashMatch = await this.cryptoService.verifyHash(userToLogin.password, password);

    if (!pwdHashMatch) return null;
    userToLogin.password = '';
    userToLogin.verificationCodeHash = '';
    return userToLogin;
  }

  //AuS-3.2:  generate access & refresh tokens: for [login & resetToken]
  public async generateAuthToken(payload: UserFromToken, update = false): Promise<AuthToken> {
    // 1. create random session id When user first logins
    const sessionId = this.cryptoService.randomCode();

    // 2. create a payload for the user, on resetTokens old session id is used
    const newPayload: UserFromToken = {
      _id: payload._id,
      sessionId: update ? payload.sessionId : sessionId,
      role: payload.role,
    };
    // 3. generate refresh and access tokens
    const accessToken = await this.jwtService.signAccessToken(newPayload);
    const refreshToken = await this.jwtService.signRefreshToken(newPayload);

    const authToken: AuthToken = {
      accessToken,
      refreshToken,
      sessionId: newPayload.sessionId,
    };

    return authToken;
  }

  // AuS-3.3: update users hashed token
  async updateHashedToken(id, refreshToken): Promise<boolean> {
    const hashedRefreshToken = await this.cryptoService.createHash(refreshToken);
    //Update users hashed tokens: this is bad for half life tokens
    const usr = await this.usersService.upsertOneAndReturnCnt(
      { _id: id },
      {
        hashedRefreshToken,
      },
    );
    if (!usr.ok) return false;
    return usr.val.modifiedCount > 0;
  }

  // Au.S-4
  async logOut(token: string): Promise<Resp<boolean>> {
    try {
      const user = await this.getUserFromRefreshToken(token);
      if (!user.ok) return FAIL(user.errMessage);
      const userRes = await this.usersService.upsertOneAndReturnCnt(
        { _id: user.val._id },
        { hashedRefreshToken: '' },
      );
      if (!userRes.ok || userRes.val.modifiedCount < 1) return FAIL('Could Not Update');
      return Succeed(true);
    } catch (e) {
      return FAIL(e.message);
    }
  }

  //AuSr-5.1:
  async resetTokens(resetToken: string): Promise<Resp<AuthTokenWithSubscription>> {
    //  1. verify the refresh token
    const user = await this.getUserFromRefreshToken(resetToken);
    if (!user.ok) return user;

    //  2. generate new refresh token
    const authToken = await this.generateAndUpdate(user.val, true);

    const authTokenWithSubscription: AuthTokenWithSubscription = {
      accessToken: authToken.val.accessToken,
      refreshToken: authToken.val.refreshToken,
      sessionId: authToken.val.sessionId,
    };
    return Succeed(authTokenWithSubscription);
  }

  // when users access token experis, verifies users refresh token & returns the refresh token
  //Au.S-4.1  [logout & resetTokens]
  public async getUserFromRefreshToken(refreshToken: string): Promise<Resp<UserFromToken>> {
    if (!refreshToken) return null;
    //1.verify the refresh token
    const decoded = await this.jwtService.verifyRefreshToken(refreshToken);
    if (!decoded.ok) return decoded;
    // find the User from database
    const user: User = await this.usersService.findOneWithPwd({
      _id: decoded.val._id,
    });
    if (!user) return FAIL(ErrConst.USER_NOT_FOUND);

    //compare the hashed refresh token and the users refresh token
    const isRefreshTokenMatching = await this.cryptoService.verifyHash(
      user.hashedRefreshToken,
      refreshToken,
    );
    if (!isRefreshTokenMatching) return FAIL('Tokens Not Matching');
    return decoded;
  }

  //  ==========================   PASSWORD RESET OPERATIONS

  //AuSr-6 : request password/other reset code
  async sendResetCode(email: string) {
    try {
      // check the user exists, if it doesn't return null
      const user = await this.usersService.findOne({
        email: email,
        active: true,
      });
      if (!user.ok) return FAIL(ErrConst.USER_NOT_FOUND, user.code);

      return this.sendCodeAndUpdateHash(
        email,
        { email },
        {
          title: `Your Password for Account with ${user.val.email}  emailIs Bieng Reset.`,
          message: `Use the code below to Reset Yout Password for the account with ${user.val.email}  email.`,
          warning: 'For Password Reset',
        },
      );
    } catch (e) {
      return FAIL(e.message);
    }
  }

  //AuSr-7: reset password
  async resetPassword(input: ResetPasswordInput) {
    try {
      const verifyToResetPwd = await this.verifyCode(input.emailOrUserName, input.code);
      if (!verifyToResetPwd) return FAIL('Code is wrong Or Have Expired');

      const hashedPwd = await this.cryptoService.createHash(input.newPassword);
      const usr = await this.usersService.findOneAndUpdate(
        { email: input.emailOrUserName },
        {
          password: hashedPwd,
          hashedRefreshToken: '',
        },
      );
      if (!usr.ok) return FAIL(usr.errMessage, usr.code);
      return Succeed(RespConst.OPERATION_SUCCESS);
    } catch (e) {
      return FAIL(e.message, 500);
    }
  }

  //AuSr-7.2: reset password with phone token
  async resetPasswordWithPhone(input: ResetPasswordWithPhone) {
    try {
      const decodedToken = await this.firebaseService.firebaseVerifyToken(input.token);
      if (!decodedToken.ok) return FAIL('Failed to verify token', decodedToken.code);

      const hashedPwd = await this.cryptoService.createHash(input.newPassword);
      const usr = await this.usersService.findOneAndUpdate(
        { phone: decodedToken.val.phone_number },
        {
          password: hashedPwd,
          hashedRefreshToken: '',
        },
      );
      if (!usr.ok) return FAIL(usr.errMessage, usr.code);
      return Succeed(RespConst.OPERATION_SUCCESS);
    } catch (e) {
      return FAIL(e.message, 500);
    }
  }

  // 7.3: reset   password using email
  async ResetPwd(input: ResetPasswordInput) {
    try {
      const verifyToResetPwd = await this.verifyCode(input.emailOrUserName, input.code);
      if (!verifyToResetPwd) return FAIL('Code is wrong Or Have Expired');

      const hashedPwd = await this.cryptoService.createHash(input.newPassword);
      const usr = await this.usersService.findOneAndUpdate(
        { userName: input.emailOrUserName },
        {
          password: hashedPwd,
          hashedRefreshToken: '',
        },
      );
      if (!usr.ok) return FAIL(usr.errMessage, usr.code);
      return Succeed(RespConst.OPERATION_SUCCESS);
    } catch (e) {
      return FAIL(e.message, 500);
    }
  }

  async updateResetHashByUserName(userName): Promise<Resp<{ code: string; user: User }>> {
    // const code = '0000';
    const code = this.cryptoService.randomCode();
    const codeHash = await this.cryptoService.createHash(code);
    // save the hashed value of the Code and set its expire time now + 30 min
    const usr = await this.usersService.findOneAndUpdate(
      { userName },
      {
        verificationCodeHash: codeHash,
        verificationCodeExpires: Date.now() + SystemConst.VERIFICATION_CODE_EXP,
      },
    );

    if (!usr.ok) {
      // logTrace('update op=', usr);
      return FAIL(ErrConst.COULD_NOT_CREATE_USER);
    }
    return Succeed({ code, user: usr.val });
  }

  // =====================================   Email Changing operations

  //  AuSr-8
  public async requestEmailChange(id: string, input: UpdateEmailInput) {
    //1. verify a user with the new email address doesnt exists
    const user = await this.usersService.findOneWithPwd({
      email: input.newEmail,
      active: true,
    });
    if (user) return FAIL(ErrConst.USER_EXISTS);

    //2. get the correct user
    const usr = await this.usersService.findById(id);
    if (!usr.ok) return FAIL(ErrConst.USER_NOT_FOUND);

    if (usr.val.email == input.newEmail) return FAIL(ErrConst.INVALID_INPUT);

    //3. send reset email code with the new email
    return this.sendCodeAndUpdateHash(
      input.newEmail,
      {
        newEmail: input.newEmail,
        email: usr.val.email,
      },
      {
        title: `Your Current Email ${usr.val.email}  is bieng changed to ${input.newEmail}.`,
        message: `Use the code below to verify your new Email ${input.newEmail}  .`,
        userName: `${usr.val.firstName} ${usr.val.lastName}`,

        warning: 'To changing Your Email',
      },
    );
  }

  //  AuSr-9
  public async verifyUpdateEmail(id: string, input: VerifyCodeInput) {
    //1. get the current user
    const user = await this.usersService.findOneWithPwd({ _id: id });
    if (!user) return FAIL(ErrConst.USER_NOT_FOUND);

    // verify the code
    const verifyToUpdateEmail = await this.verifyCode(user.email, input.code);
    if (!verifyToUpdateEmail) return FAIL('Code is wrong Or Have Expired');
    // console.log('newEmail===', user.newEmail);
    const usr = await this.usersService.updateById(user._id, {
      email: user.newEmail,
      newEmail: '',
    });
    // console.log('updated email,', usr);
    if (!usr.ok) return FAIL(ErrConst.INTERNAL_ERROR);
    return Succeed(RespConst.OPERATION_SUCCESS);
  }

  //  ------------------------   AUTHORIZATION OPERATIONS
  //  AuSr--
  public async getUserFromToken(token: string): Promise<User | null> {
    if (!token) return null;
    // logTrace('token ', token);
    const decoded = (await this.jwtService.verifyAccessToken(token)) as UserFromToken;
    if (!decoded || !decoded?._id) return null;
    logTrace('token Verified', decoded);
    const realUser = await this.usersService.findById(decoded._id);
    if (!realUser.val) return null;
    return realUser.val;
  }
}
