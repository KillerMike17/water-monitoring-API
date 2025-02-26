import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Billing, BillingDocument } from './billing.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';

@Injectable()
export class billingService extends MongoGenericRepository<Billing> {
  constructor(
    @InjectModel(Billing.name) private resultModel: Model<BillingDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
  ) {
    super(resultModel);
  }
}
