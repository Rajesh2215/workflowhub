import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TaskController } from './task.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthJwtModule } from '@app/auth';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.registerAsync([
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
    AuthJwtModule
  ],
  controllers: [TaskController],
})
export class TaskModule { }
