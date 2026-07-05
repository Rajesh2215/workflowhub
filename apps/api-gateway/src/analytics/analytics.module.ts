import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AnalyticsController } from './analytics.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthJwtModule } from '@app/auth';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'ANALYTICS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'analytics',
            protoPath: join(__dirname, '../../../libs/shared/src/proto/analytics.proto'),
            url: config.get('ANALYTICS_SERVICE_GRPC_URL') || 'localhost:50053',
          },
        }),
      },
    ]),
    AuthJwtModule
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
