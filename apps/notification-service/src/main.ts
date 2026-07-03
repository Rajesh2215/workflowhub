import { initTracer, KAFKA_CONFIG } from '@app/shared';
initTracer('notification-service');
import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { QUEUES, AppLogger, RpcCorrelationIdInterceptor } from '@app/shared';

async function bootstrap() {
  // 1. Create a Nest application context (allowing multiple transports)
  const app = await NestFactory.create(NotificationServiceModule, {
    logger: new AppLogger(),
  });

  // 2. Connect the RabbitMQ Microservice (retaining this for Sagas)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'],
      queue: QUEUES.NOTIFY.MAIN,
      noAck: false,
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'retry.exchange',
          'x-dead-letter-routing-key': QUEUES.NOTIFY.RETRY,
        },
      },
    },
  });

  // 3. Connect the Kafka Microservice (for event streaming)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CONFIG.CLIENT_ID,
        brokers: process.env.KAFKA_BROKERS?.split(',') || KAFKA_CONFIG.BROKERS,
      },
      consumer: {
        groupId: KAFKA_CONFIG.GROUP_ID,
        allowAutoTopicCreation: true
      }
    },
  });

  // 4. Bind our global correlation ID interceptor
  app.useGlobalInterceptors(new RpcCorrelationIdInterceptor());

  await app.init();
  // 5. Start all connected microservices
  await app.startAllMicroservices();
}
bootstrap();
