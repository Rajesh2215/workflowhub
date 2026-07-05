import { initTracer, KAFKA_CONFIG } from '@app/shared';
initTracer('analytics-service');
import { NestFactory } from '@nestjs/core';
import { AnalyticsServiceModule } from './analytics-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppLogger, RpcCorrelationIdInterceptor } from '@app/shared';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsServiceModule, {
    logger: new AppLogger(),
  });

  // 1. Connect gRPC Microservice (for queries from api-gateway)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'analytics',
      protoPath: join(__dirname, '../../../libs/shared/src/proto/analytics.proto'),
      url: '0.0.0.0:50053', // analytics-service listens on port 50053
    },
  });

  // 2. Connect Kafka Microservice (to consume task.created events)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'analytics-client', // Different client ID to differentiate from notification
        brokers: process.env.KAFKA_BROKERS?.split(',') || KAFKA_CONFIG.BROKERS,
      },
      consumer: {
        groupId: 'analytics-group', // Different consumer group!
        allowAutoTopicCreation: true,
      },
    },
  });

  // 3. Bind global correlation ID interceptor
  app.useGlobalInterceptors(new RpcCorrelationIdInterceptor());

  await app.init();
  await app.startAllMicroservices();
}
bootstrap();
