import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RegistrationSagaService } from './registration-saga.service';
import { QUEUES, CorrelationIdClientRmq } from '@app/shared';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(process.cwd(), 'libs/shared/src/proto/auth.proto'),
            url: config.get('AUTH_SERVICE_GRPC_URL') || 'localhost:50051',
          },
        }),
      },
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          customClass: CorrelationIdClientRmq,
          options: {
            urls: [config.get('RABBITMQ_URL')],
            queue: 'notification_queue',
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': 'retry.exchange',
                'x-dead-letter-routing-key': QUEUES.NOTIFY.RETRY,
              },
            },
          },
        }),
      },
      {
        name: 'TASK_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'task',
            protoPath: join(process.cwd(), 'libs/shared/src/proto/task.proto'),
            url: config.get('TASK_SERVICE_GRPC_URL') || 'localhost:50052',
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [RegistrationSagaService]
})
export class AuthModule { }
