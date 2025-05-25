import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Billing, BillingDocument } from './billing.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';
import { PAYMENTSTATUS } from '@/app/account/profile/dto/profile.dto';

@Injectable()
export class billingService extends MongoGenericRepository<Billing> {
  constructor(
    @InjectModel(Billing.name) private resultModel: Model<BillingDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
  ) {
    super(resultModel);
  }

  // update all as paid
  async updateBillingStatus(uuid, date, tx_ref): Promise<any> {
    try {
      await this.updateMany(uuid, {
        status: PAYMENTSTATUS.PAID,
        date: date,
        tx_ref,
      });
      return { ok: true, message: 'Access updated' };
    } catch (err) {
      return { ok: false, errMessage: 'Could not update water access', code: 500 };
    }
  }
}
