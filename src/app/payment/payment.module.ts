import { Module } from '@nestjs/common';
import { paymentService } from './payment.service';
import { PaymentsController } from './payment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './payment.entity';
import { UsersModule } from '@/app/account/users';
import { ChapaModule } from 'chapa-nestjs';
import { EnvVar } from '@/common/config/config.instances';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    ChapaModule.register({
      secretKey: EnvVar.getInstance.CHAPA_SECRET_KEY,
    }),
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [paymentService],
  exports: [paymentService],
})
export class PaymentsModule {}
