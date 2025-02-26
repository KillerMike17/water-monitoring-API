import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Payment, PaymentDocument } from './payment.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';

@Injectable()
export class paymentService extends MongoGenericRepository<Payment> {
  constructor(
    @InjectModel(Payment.name) private resultModel: Model<PaymentDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
  ) {
    super(resultModel);
  }
}
