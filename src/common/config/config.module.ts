import { Module, Global } from '@nestjs/common';
import { EnvVar } from './config.instances';

@Global()
@Module({
  providers: [EnvVar],
  exports: [EnvVar], //
})
export class ConfigModule {}
