import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, GrpcMethod, KafkaContext, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS, RedisService } from '@app/shared';
import { AnalyticsServiceService } from './analytics-service.service';

@Controller()
export class AnalyticsServiceController {
  private readonly logger = new Logger(AnalyticsServiceController.name);

  constructor(
    private readonly analyticsService: AnalyticsServiceService,
    private readonly redisService: RedisService,
  ) { }

  // Kafka consumer for task.created events
  @EventPattern(KAFKA_TOPICS.TASK_CREATED)
  async handleTaskCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    const taskId = data.taskId || data.eventId;
    const userId = data.userId;

    if (!userId || !taskId) {
      this.logger.warn(`Missing userId or taskId in event payload: ${JSON.stringify(data)}`);
      return;
    }

    // Idempotency check using Redis (prefix key with analytics: to avoid collision)
    const redis = this.redisService.getClient();
    const lockKey = `analytics:event:${taskId}`;

    const result = await redis.set(
      lockKey,
      'processed',
      'EX',
      86400, // 24 hours
      'NX'
    );

    if (result !== 'OK') {
      this.logger.warn(`Duplicate event detected for taskId: ${taskId} in Analytics. Skipping processing.`);
      return;
    }

    try {
      await this.analyticsService.incrementUserCounter(userId);
      this.logger.log(`Successfully processed task.created event for taskId: ${taskId}, userId: ${userId}`);
    } catch (error) {
      // Clear key if process failed so it can be retried on re-delivery
      await redis.del(lockKey);
      this.logger.error(`Failed to increment task counter for taskId ${taskId}: ${error.message}`);
      throw error;
    }
  }

  // gRPC handler for querying analytics
  @GrpcMethod('AnalyticsService', 'GetUserCounter')
  async grpcGetUserCounter(data: { userId: string }) {
    this.logger.log(`[gRPC] GetUserCounter requested for user: ${data.userId}`);
    const counter = await this.analyticsService.getUserCounter(data.userId);
    return {
      userId: data.userId,
      taskCount: counter ? counter.taskCount : 0,
    };
  }
}
