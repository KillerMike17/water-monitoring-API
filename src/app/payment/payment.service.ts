import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Payment, PaymentDocument, PaymentDto } from './payment.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';
import { UserFromToken } from '@/shared/models';

@Injectable()
export class paymentService extends MongoGenericRepository<Payment> {
  constructor(
    @InjectModel(Payment.name) private resultModel: Model<PaymentDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
  ) {
    super(resultModel);
  }

  async getPaymentData(dto: PaymentDto, user: UserFromToken, currency: string) {
    // Replace this with real logic if you're using plans
    const amount = 200; // flat monthly rate
    return {
      amount,
      plan: { name: 'Standard Water Plan', id: 'default-plan-id' },
    };
  }

  async updateUsersPaymentStatus(userId): Promise<any> {
    try {
      await this.usersService.updateById(userId, {
        hasPaid: true,
        paymentDate: new Date().toString(),
      });
      return { ok: true, message: 'Access updated' };
    } catch (err) {
      return { ok: false, errMessage: 'Could not update water access', code: 500 };
    }
  }
}
