import { Module } from '@nestjs/common';
import { billingService } from './billing.service';
import { BillingsController } from './billing.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Billing, BillingSchema } from './billing.entity';
import { UsersModule } from '@/app/account/users';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Billing.name, schema: BillingSchema }]),
    UsersModule,
  ],
  controllers: [BillingsController],
  providers: [billingService],
  exports: [billingService],
})
export class BillingsModule {}
