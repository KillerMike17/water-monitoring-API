import { UsersModule } from '@/app/account/users';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './app/account/auth/auth.module';
import { ProfileModule } from './app/account/profile/profile.module';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { DatabaseModule } from './providers/database/databaseModule';
import { ConfigModule } from '@/common/config/config.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,

    //Account modules
    UsersModule,
    AuthModule,
    ProfileModule,

    // Background Job Module
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
