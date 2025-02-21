import { Module } from '@nestjs/common';
//self import
import { AuthService } from './auth.service';

//modules
import { User, UserSchema, UsersModule } from '../users';
import { CryptoModule } from '@/providers/crypto';

//common

//services
import { GuardsModule } from '@/providers/guards/guards.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { FirebaseModule } from '@/providers/firebase';
import { EmailModule } from '@/email';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    CryptoModule,
    GuardsModule,
    FirebaseModule,
    EmailModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, UsersModule],
})
export class AuthModule {}
