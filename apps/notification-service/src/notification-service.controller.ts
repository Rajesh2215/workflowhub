import { Controller, Logger } from '@nestjs/common';
import { NotificationServiceService } from './notification-service.service';
import { Ctx, EventPattern, KafkaContext, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { QUEUES, EXCHANGES, getRetryCount, RedisService, KAFKA_TOPICS } from '@app/shared';

@Controller()
export class NotificationServiceController {
  private readonly logger = new Logger(NotificationServiceController.name);

  constructor(
    private readonly notificationService: NotificationServiceService,
    private readonly redisService: RedisService, // <-- Inject Redis
  ) { }

  @EventPattern(KAFKA_TOPICS.TASK_CREATED)
  async handleTaskCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    // 1. Idempotency Check using Redis
    const redis = this.redisService.getClient();
    const key = `event:${data.taskId || data.eventId}`;

    const result = await redis.set(
      key,
      'processed',
      'EX',
      86400, // 24 Hours TTL
      'NX'   // Only set if it doesn't exist
    );

    if (result !== 'OK') {
      console.warn(`Duplicate event detected for taskId: ${data.taskId}. Skipping processing.`);
      return; // Just return; NestJS will auto-commit this skipped message offset
    }

    // 2. Process message
    try {
      await this.notificationService.handleTaskCreated(data);
    } catch (error) {
      // 3. Clear Redis key if processing fails so we can retry on re-delivery
      await redis.del(key);
      this.logger.error(`Failed to process notification for task ${data.taskId}: ${error.message}`);

      // Throw the error so NestJS knows processing failed (and does not commit offset)
      throw error;
    }
  }

  @MessagePattern('notification.sendSaga')
  async sendSaga(@Payload() data: any) {
    try {
      this.logger.log(`Sending welcome notification via Saga for user: ${data.userId}`);
      const notification = await this.notificationService.createNotification(data);
      return {
        message: 'Notification sent successfully via Saga',
        notification,
      };
    } catch (error) {
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Notification creation failed in Saga',
      });
    }
  }

  @MessagePattern('notification.deleteSaga')
  async deleteNotification(@Payload() data: { notificationId: string }) {
    try {
      const result = await this.notificationService.deleteNotification(data.notificationId);
      return result;
    } catch (error) {
      throw new RpcException({
        statusCode: 404,
        message: error.message || 'Notification deletion failed',
      });
    }
  }
}
