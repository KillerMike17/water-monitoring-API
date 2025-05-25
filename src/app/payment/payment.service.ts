import { HttpException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  BasePayment,
  Payment,
  PaymentBill,
  PaymentDocument,
  PaymentStatus,
} from './payment.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';
import { UserFromToken } from '@/shared/models';
import { Resp } from '@/common/constants/return.const';
import { billingService } from '../monitoring/billing/billing.service';
import { logTrace } from '@/common/logger';

@Injectable()
export class paymentService extends MongoGenericRepository<Payment> {
  constructor(
    @InjectModel(Payment.name) private resultModel: Model<PaymentDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
    private billingService: billingService,
  ) {
    super(resultModel);
  }

  async getPaymentData(uuid: string): Promise<Resp<PaymentBill & { breakdown: any[] }>> {
    const WATER_RATE_PER_UNIT = 5; // adjust if needed

    try {
      const billingResp = await this.billingService.getAll({ uuid });
      if (!billingResp.ok || !billingResp.val.length) {
        return {
          ok: false,
          val: null,
          error: new Error('No billing records found'),
          errMessage: 'No billing records found',
          code: 404,
        };
      }

      const billingList = billingResp.val;
      const userId = billingList[0].userId;

      // Get latest successful payment
      const paymentResp = await this.getAll({
        uuid,
        status: PaymentStatus.SUCCESS,
      });

      let lastPaidDate = new Date('1970-01-01T00:00:00Z');
      if (paymentResp.ok && paymentResp.val.length > 0) {
        const latest = paymentResp.val.sort(
          (a: Payment, b: Payment) =>
            new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime(),
        )[0];
        lastPaidDate = new Date(latest.created_at ?? lastPaidDate);
      }

      // Filter billing records after the last payment date
      const unpaidBillings = billingList.filter((bill) => new Date(bill.date) > lastPaidDate);

      const breakdown = unpaidBillings.map((bill) => {
        const charge = bill.waterConsumption * WATER_RATE_PER_UNIT;
        return {
          date: bill.date,
          waterConsumption: bill.waterConsumption,
          charge,
        };
      });

      const totalAmount = breakdown.reduce((sum, entry) => sum + entry.charge, 0);

      const result: PaymentBill & { breakdown: any[] } = {
        uuid,
        userId,
        dueDate: unpaidBillings.at(-1)?.date ?? '',
        amount: totalAmount,
        status: totalAmount > 0 ? PaymentStatus.PENDING : PaymentStatus.SUCCESS,
        breakdown,
      };
      logTrace('getPaymentData result:', result);
      return { ok: true, val: result, error: null };
    } catch (err) {
      console.error('getPaymentData error:', err);
      return {
        ok: false,
        val: null,
        error: err,
        errMessage: err.message,
        code: 500,
      };
    }
  }

  async getPaymentHistory(uuid: string): Promise<Resp<BasePayment[]>> {
    try {
      const payments = await this.getAll({ uuid });
      if (!payments.ok) {
        return {
          ok: false,
          val: [],
          error: payments.error,
          errMessage: payments.errMessage,
          code: payments.code,
        };
      }
      return payments;
    } catch (err) {
      console.error('getPaymentHistory error:', err);
      return { ok: false, val: [], error: err, errMessage: err.message, code: 500 };
    }
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
