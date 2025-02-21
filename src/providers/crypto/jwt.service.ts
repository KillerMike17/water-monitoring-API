import { Injectable } from '@nestjs/common';

import { verify, JwtPayload, sign } from 'jsonwebtoken';
import { ENV_TYPES } from '@/common/config/config.utills';
import { EnvVar } from '@/common/config/config.instances';

import { FAIL, Resp, Succeed } from '@/common/constants/return.const';
import { UserFromToken } from '@/shared/models';
import { logTrace } from '@/common/logger';

@Injectable()
export class CustomJwtService {
  private _envConfig: ENV_TYPES;

  constructor() {
    this._envConfig = EnvVar.getInstance;
  }

  // =============== Any other Token, user provides the secret & payload type
  //  A numeric value is interpreted as a seconds
  // otherwise milliseconds unit is used by default ("120" is equal to "120ms").
  public async signJwtToken(payload: any, secret: string, options) {
    return sign(payload, secret, options);
  }

  public async verifyJwtToken(token: string, secret: string) {
    return verify(token, secret, {
      algorithms: ['HS256'],
    }) as JwtPayload;
  }

  // =====================   Access & refresh Tokens
  public async signAccessToken(payload: any) {
    logTrace('expiry time', this._envConfig.JWT_EXPIRY_TIME);
    const token = sign(payload, this._envConfig.JWT_ACCESS_SECRET, {
      expiresIn: this._envConfig.JWT_EXPIRY_TIME,
      algorithm: 'HS256',
    });
    return `Bearer ${token}`;
  }

  public async verifyAccessToken(authorization: string) {
    const [_, token] = authorization.split(' ');
    // logTrace('Access Token==', token);
    const decoded = await verify(token, this._envConfig.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      complete: true,
    });
    return decoded.payload;
    // return jwt.verify(token, this._envConfig.jwt.jwtAccessSecret, {
    //   algorithms: ['HS256'],
    //   complete: true
    // })
  }

  public async signRefreshToken(payload: any) {
    const token = sign(payload, this._envConfig.JWT_REFRESH_SECRET, {
      expiresIn: this._envConfig.JWT_REFRESH_EXPIRY_TIME,
      algorithm: 'HS256',
    });

    return `Bearer ${token}`;
  }

  public async verifyRefreshToken(authorization: string): Promise<Resp<UserFromToken>> {
    try {
      const [_, token] = authorization.split(' ');
      const decoded = verify(token, this._envConfig.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;
      logTrace('decoded token==', decoded);
      if (!decoded._id) return FAIL('NO User id found on the JWT');
      const userToken: UserFromToken = {
        expiryDate: decoded.exp,
        _id: decoded._id,
        role: decoded.role,
        sessionId: decoded.sessionId,
      };
      return Succeed(userToken);
    } catch (e) {
      return FAIL(e.message);
    }
  }
}
