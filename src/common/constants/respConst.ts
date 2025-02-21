import { HttpCodes } from './http.codes';

export enum RespConst {
  INTERNAL_ERROR = 'Internal Error',
  INVALID_INPUT = 'Your input is invalid',
  USER_EXISTS = 'USER_EXISTS',
  TOKEN_NOT_VALID = 'TOKEN_NOT_VALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  GOOGLE_SIGNIN_ONLY = "It looks like you signed up using Google. Please use the 'Sign in with Google' button to log in.",
  NOT_FOUND = 'NOT_FOUND',
  INVALID_CODE = 'Code is not valid or expired',
  INVALID_CREDENTIALS = 'Invalid credentials',
  VERIFICATION_FAILED = 'verification failed please try again or use a different account',
  COULD_NOT_CREATE_USER = 'Could not create user',
  OPERATION_SUCCESS = 'operation is successful',
  VERIFICATION_SENT = 'verification message Sent',
  VERIFICATION_PENDING = 'verification is pending please wait for 3 minutes',
}

export const SystemConst = {
  VERIFICATION_CODE_EXP: 1000 * 60 * 10, // 10 minutes
  VERIFICATION_ALLOWED_RESET: 1000 * 60 * 3, // 3 minutes
  REFRESH_COOKIE: 'REFRESH_TOKEN',
};
type ErrorConstantMap = {
  [key in RespConst]: number;
};
export const errCode: ErrorConstantMap = {
  //500
  [RespConst.COULD_NOT_CREATE_USER]: HttpCodes.INTERNAL_SERVER_ERROR,
  [RespConst.INTERNAL_ERROR]: HttpCodes.INTERNAL_SERVER_ERROR,
  //400
  [RespConst.INVALID_INPUT]: HttpCodes.BAD_REQUEST,
  //409
  [RespConst.USER_EXISTS]: HttpCodes.CONFLICT,
  //404
  [RespConst.USER_NOT_FOUND]: HttpCodes.NOT_FOUND,
  [RespConst.NOT_FOUND]: HttpCodes.NOT_FOUND,
  //401
  [RespConst.UNAUTHORIZED]: HttpCodes.UNAUTHORIZED,
  [RespConst.GOOGLE_SIGNIN_ONLY]: HttpCodes.UNAUTHORIZED,
  [RespConst.TOKEN_NOT_VALID]: HttpCodes.UNAUTHORIZED,
  [RespConst.INVALID_CODE]: HttpCodes.UNAUTHORIZED,
  [RespConst.INVALID_CREDENTIALS]: HttpCodes.UNAUTHORIZED,
  [RespConst.VERIFICATION_FAILED]: HttpCodes.UNAUTHORIZED,
  //not necessary
  [RespConst.OPERATION_SUCCESS]: HttpCodes.CREATED,
  [RespConst.VERIFICATION_SENT]: HttpCodes.OK,
  [RespConst.VERIFICATION_PENDING]: HttpCodes.CONFLICT,
};
