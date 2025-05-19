import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { emailRegex, User, UserDocument } from './entities/user.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import { logTrace } from '@/common/logger';
import { FilterQuery, Model } from 'mongoose';
import { CreateUsers, FilterUserNew } from './entities/user.mut.dto';
import { CryptoService } from '@/providers/crypto';
import { ChangePasswordInput } from '../auth/dto/auth.input.dto';
import { FAIL, Resp, Succeed } from '@/common/constants/return.const';
import { RespConst } from '@/common/constants/respConst';
import { ACCOUNT_STATUS } from '../profile/dto/profile.dto';
import { PaginatedRes } from '@/common/common.types.dto';

@Injectable()
export class UserService extends MongoGenericRepository<User> {
  constructor(
    private cryptoService: CryptoService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async searchWithPaginateNew(conditions: any[] = [], filter: FilterUserNew): Promise<any> {
    try {
      // Build search query if search parameter exists
      if (filter.search?.trim()) {
        const searchRegex = new RegExp(filter.search.trim(), 'i');
        conditions.push({
          $or: [
            { firstName: { $regex: searchRegex } },
            { lastName: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            ...(filter.includeSpecialization ? [{ specialization: { $regex: searchRegex } }] : []),
          ].filter(Boolean), // Remove undefined entries
        });
      }

      // Add role filter if specified
      if (filter.role) {
        conditions.push({ role: filter.role });
      }

      const query = conditions.length > 0 ? { $and: conditions } : {};
      const sort = filter.sort || { createdAt: -1 }; // Default sorting

      const [data, total] = await Promise.all([
        this.userModel
          .find(query)
          .skip(filter.skip)
          .limit(filter.limit)
          .sort(sort)
          .lean<User[]>()
          .exec(),
        this.userModel.countDocuments(query).exec(),
      ]);

      return {
        ok: true,
        val: {
          data,
          total,
          limit: filter.limit,
          skip: filter.skip,
        },
      };
    } catch (error) {
      return {
        ok: false,
        errMessage: 'Failed to fetch users',
        code: 500,
        details: error.message,
      };
    }
  }

  public async createUser(createDto: CreateUsers): Promise<Resp<User>> {
    // organization members must have organization id
    createDto.accountStatus = ACCOUNT_STATUS.PENDING;

    createDto.password = await this.cryptoService.createHash(createDto.password);
    return this.createOne(createDto);
  }

  public async findOneWithPwd(where: FilterQuery<User>): Promise<User> {
    // logTrace('findinguser=', where);
    const user: User = await this.userModel
      .findOne(where)
      .select('+password +verificationCodeHash +verificationCodeExpires +hashedRefreshToken')
      .lean();
    // logTrace('foundUser=', user);
    return user;
  }

  public async findOneWithSelect(where: FilterQuery<User>, select: string): Promise<User> {
    const user: User = await this.userModel.findOne(where).select(select);
    logTrace('foundUser=', user);
    return user;
  }

  async anyUserExists(phoneOrEmail: string) {
    const isEmail = emailRegex.test(phoneOrEmail);
    let user: User | null;
    if (isEmail) {
      user = await this.findOneWithPwd({ email: phoneOrEmail });
    } else {
      user = await this.findOneWithPwd({ userName: phoneOrEmail });
    }
    if (!user) return null;
    return user;
  }

  async activeUserExists(phoneOrEmail: string, isPhone = false) {
    const isEmail = emailRegex.test(phoneOrEmail);
    let user: User | null;
    if (isEmail) {
      user = await this.findOneWithPwd({ email: phoneOrEmail, active: true });
    } else if (isPhone) {
      user = await this.findOneWithPwd({ phone: phoneOrEmail, active: true });
    } else {
      logTrace('here--', phoneOrEmail);
      user = await this.findOneWithPwd({ userName: phoneOrEmail, active: true });
      logTrace('user--', user);
    }
    if (!user) return null;
    return user;
  }

  async changePassword(id: string, input: ChangePasswordInput): Promise<Resp<string>> {
    const { newPassword, oldPassword } = input;
    //
    if (newPassword === oldPassword) return FAIL('Old password cant be same as new one', 400);
    /**
         find the user
         */
    const changePwdUser = await this.findOneWithPwd({ _id: id, active: true });
    if (!changePwdUser) return FAIL(RespConst.USER_NOT_FOUND, 404);
    /**
     * check if the old password matches
     */
    const pwdHashMatch = await this.cryptoService.verifyHash(changePwdUser.password, oldPassword);
    if (!pwdHashMatch) return FAIL('Password dont Match', 400);
    /**
     * set the Encrypted
     */

    const encryptedPwd = '';
    const newHash = await this.cryptoService.createHash(newPassword);
    const usr = await this.upsertOneAndReturnCnt(
      { _id: id },
      {
        password: newHash,
        encryptedPwd: encryptedPwd,
      },
    );
    if (!usr.ok) return FAIL('Failed to update Pwd', 500);

    return Succeed('Successfully changed password');
  }
}
