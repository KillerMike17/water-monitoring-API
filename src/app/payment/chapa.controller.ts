import { Body, Controller, HttpException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import * as crypto from 'crypto';
import { ChapaService } from 'chapa-nestjs';
import { Request, Response } from 'express';

import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Endpoint } from '@/shared/modelConsts';
import { RoleType, UserFromToken } from '@/shared/models';

import { ColorEnums, logTrace } from '@/common/logger';
import { EnvVar } from '@/common/config/config.instances';
import { ApiTags } from '@nestjs/swagger';
import {
  Currency,
  PaymentMethod,
  PaymentStatus,
  Payment,
  PaymentDto,
  PaymentInput,
} from './payment.entity';
import { paymentService } from './payment.service';
import { billingService } from '../monitoring/billing/billing.service';

@ApiTags(Endpoint.Payment)
@Controller(Endpoint.Payment)
export class ChapaController {
  constructor(
    private readonly chapaService: ChapaService,
    private readonly paymentServ: paymentService,
    private readonly billingServ: billingService,
  ) {}

  @Post('chapa')
  @Roles(RoleType.Customer, RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async chapaCreateOne(@Req() req: Request, @Body() createDto: PaymentDto): Promise<Payment> {
    //--------  Getting user data
    const user: UserFromToken = req['user'];

    const paymentData = await this.paymentServ.getPaymentData(createDto.uuid);
    if (!paymentData.ok) throw new HttpException('No bill found', 500);

    const tx_ref = await this.chapaService.generateTransactionReference();
    // logTrace('found tx_ref', tx_ref);
    const response = await this.chapaService.initialize({
      first_name: createDto.first_name,
      last_name: createDto.last_name,
      email: createDto.email,
      currency: createDto.currency,
      amount: `${paymentData.val.amount}`,
      tx_ref: tx_ref,
      // callback_url: 'https://2d6a-102-213-69-203.ngrok-free.app/Payments/hook2',
      return_url: `https://water-monitoring-api-k06t.onrender.com/payment/status?tx_ref=${tx_ref}`,
      customization: {
        title: `WaterMonitoring`,
        description: `Payment for WaterMonitoring`,
      },
    });

    const data: PaymentInput = {
      amount: paymentData.val.amount,
      checkout_url: response.data.checkout_url,
      tx_ref: tx_ref,
      userId: user._id,
      currency: Currency.ETB,
      paymentMethod: PaymentMethod.CHAPA,
      status: PaymentStatus.PENDING,
    };

    const resp = await this.paymentServ.createOne(data);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Post('verify/:tx')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.Customer)
  async verify(@Req() req: Request, @Param('tx') tx: string) {
    const inputQuery = { tx_ref: tx };
    const user: UserFromToken = req['user'];
    // if (user.role != RoleType.ADMIN) {
    //   inputQuery['parentId'] = user._id;
    // }
    const payment = await this.paymentServ.findOne(inputQuery);
    if (!payment.ok) {
      logTrace('transaction not found', payment.errMessage);
      throw new HttpException(payment.errMessage, payment.code);
    }

    if (payment.val.status === PaymentStatus.SUCCESS) return payment.val;

    const response = await this.chapaService.verify({
      tx_ref: tx,
    });

    // if the user have not still been verified
    if (response.status === 'success' && payment.val.status === PaymentStatus.PENDING) {
      const updatedResponse = await this.paymentServ.updateById(payment.val._id, {
        ...response.data,
        timestamp: response.data.updated_at,
        status: PaymentStatus.SUCCESS,
        charge: response.data.charge,
        reference: response.data.reference,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        // event: response.data?.event,
      });

      if (updatedResponse.ok) {
        this.billingServ.updateBillingStatus(payment.val.uuid, response.data.updated_at, tx);
      }

      if (!updatedResponse.ok)
        throw new HttpException(updatedResponse.errMessage, updatedResponse.code);
      return this.paymentServ.updateUsersPaymentStatus(updatedResponse.val.userId);
    }

    return payment.val;
  }

  @Post('hook')
  async hook(@Req() req: Request, @Body() body, @Res() res: Response) {
    logTrace('this is hook 111', req.headers['x-chapa-signature']);
    const hash = crypto
      .createHmac('sha256', EnvVar.getInstance.CHAPA_SECRET_HASH)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash == req.headers['Chapa-Signature'] || hash == req.headers['x-chapa-signature']) {
      const payment = await this.paymentServ.findOne({
        tx_ref: req.body.tx_ref,
      });
      if (!payment.ok) throw new HttpException(payment.errMessage, payment.code);

      if (payment.ok && payment.val.status === PaymentStatus.PENDING) {
        const updatedResponse = await this.paymentServ.updateById(payment.val._id, {
          timestamp: body.data.updated_at,
          status: PaymentStatus.SUCCESS,
          ...req.body.data,
          charge: body.data.charge,
          reference: body.data.reference,
          created_at: body.data.created_at,
          updated_at: body.data.updated_at,
          // event: response.data?.event,
        });

        if (updatedResponse.ok) {
          this.billingServ.updateBillingStatus(
            payment.val.uuid,
            body.data.updated_at,
            req.body.tx_ref,
          );
        }

        if (!updatedResponse.ok)
          throw new HttpException(updatedResponse.errMessage, updatedResponse.code);
        return this.paymentServ.updateUsersPaymentStatus(updatedResponse.val.userId);
      } else {
        logTrace('payment is ', payment.val.status);
        return;
      }
    } else {
      logTrace('hash is not equal', hash, ColorEnums.BgCyan);
      return res.status(404);
    }
  }
}
