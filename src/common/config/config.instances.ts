import {
  ENV_DEFAULT,
  ENV_NAMES,
  ENV_TYPES,
  getFireBasePrivateKey,
  getMongoUri,
  tryReadEnv,
} from './config.utills';
import { ColorEnums, logTrace } from '../logger';
import * as dotenv from 'dotenv';
import { Injectable, OnModuleInit } from '@nestjs/common';
// import fs from 'fs';

export const LOAD_ENVS = (req = false): ENV_TYPES => {
  return {
    ...ENV_DEFAULT,
    NODE_ENV: tryReadEnv('NODE_ENV'),
    PORT: tryReadEnv(ENV_NAMES.PORT, req),

    //Database
    MONGODB_URI: getMongoUri(ENV_NAMES.MONGODB_URI, req, tryReadEnv(ENV_NAMES.IS_MONGO_REMOTE)),
    //Jwt Related
    JWT_ACCESS_SECRET: tryReadEnv(ENV_NAMES.JWT_ACCESS_SECRET, req),
    JWT_REFRESH_SECRET: tryReadEnv(ENV_NAMES.JWT_REFRESH_SECRET, req),
    // JWT_EXPIRY_TIME: tryReadEnv(ENV_NAMES.JWT_EXPIRY_TIME, req, `${ENV_DEFAULT.JWT_EXPIRY_TIME}`),
    JWT_EXPIRY_TIME: tryReadEnv(ENV_NAMES.JWT_EXPIRY_TIME, req, `${ENV_DEFAULT.JWT_EXPIRY_TIME}`),

    JWT_REFRESH_EXPIRY_TIME: tryReadEnv(
      ENV_NAMES.JWT_REFRESH_EXPIRY_TIME,
      req,
      `${ENV_DEFAULT.JWT_REFRESH_EXPIRY_TIME}`,
    ),

    ENCRYPTION_KEY: tryReadEnv(ENV_NAMES.ENCRYPTION_KEY, req),
    //  Firebase envs
    FIREBASE_PRIVATE_KEY: getFireBasePrivateKey(),
    FIREBASE_PRIVATE_KEY_STRING: tryReadEnv(ENV_NAMES.FIREBASE_PRIVATE_KEY_STRING, req),
    FIREBASE_CLIENT_EMAIL: tryReadEnv(ENV_NAMES.FIREBASE_CLIENT_EMAIL, req),
    FIREBASE_PROJECT_ID: tryReadEnv(ENV_NAMES.FIREBASE_PROJECT_ID, req),
    FIREBASE_PROJECT_NAME: tryReadEnv(ENV_NAMES.FIREBASE_PROJECT_NAME, req),
  };
};

@Injectable()
export class EnvVar implements OnModuleInit {
  private static _instance: EnvVar;
  envVariables: ENV_TYPES;

  constructor() {
    // we must have a .env file to tell us the Enviroment at first, it first read the .env file then it loads the other env files
    dotenv.config({ path: `.env` });
    let mode = tryReadEnv('NODE_ENV', false, '');

    // MODE IS PRODUCTION
    if (mode === 'production') {
      // logTrace(`NODE_ENV is --| == ${mode ? mode : 'NO Node_ENV'} ==`, '', ColorEnums.BgMagenta);
      dotenv.config({ path: `.env.${mode}` });
      this.envVariables = LOAD_ENVS(true);
    } else {
      // MODE COULD BE TEST || dev
      logTrace(`NODE_ENV is --| == ${mode ? mode : 'NO Node_ENV'} ==`, '', ColorEnums.BgMagenta);
      if (!mode) mode = 'dev';
      dotenv.config({ path: `.env.${mode}` });
      this.envVariables = LOAD_ENVS(false);
    }
  }

  onModuleInit() {
    EnvVar._instance = new EnvVar();
  }

  static get getInstance() {
    if (!EnvVar._instance) {
      EnvVar._instance = new EnvVar();
    }
    return this._instance.envVariables;
    // Do you need arguments? Make it a regular static method instead.
    // return this._instance || (this._instance = new this());
  }

  getVariables() {
    return this.envVariables;
  }

  // loadEnv(req: boolean) {
  //   try {
  //     this.envVariables = LoadEnvConfig(req);
  //   } catch (e) {
  //     logTrace('z error is', e.message, ColorEnums.BgRed);
  //   }
  // }
}

// export const EnvConfigs = EnvVar.getInstance;
