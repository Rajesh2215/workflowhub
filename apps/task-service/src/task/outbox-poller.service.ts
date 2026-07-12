import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Outbox, OutboxDocument, OutboxStatus } from '../schemas/outbox.schema';

@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private pollingInterval!: NodeJS.Timeout;
  private isPolling = false;

  constructor(
    @InjectModel(Outbox.name)
    private readonly outboxModel: Model<OutboxDocument>,

    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) { }

  onModuleInit() {
    this.logger.log('Initializing Outbox Poller background worker...');
    // Start polling the outbox every 5 seconds (5000ms)
    this.pollingInterval = setInterval(() => this.pollOutbox(), 5000);
  }

  onModuleDestroy() {
    // Clear the interval when the application shuts down to prevent memory leaks
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  async pollOutbox() {
    // Prevent overlapping executions: if the previous poll is still executing, skip this run
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      // Find oldest pending events, limiting the batch size (e.g. up to 10 events per poll)
      const pendingEvents = await this.outboxModel
        .find({ status: OutboxStatus.PENDING })
        .sort({ createdAt: 1 })
        .limit(10)
        .exec();

      if (pendingEvents.length === 0) {
        this.isPolling = false;
        return;
      }

      this.logger.log(`Found ${pendingEvents.length} pending outbox events to process.`);

      for (const event of pendingEvents) {
        try {
          this.logger.log(`Publishing outbox event ${event._id} to Kafka topic "${event.pattern}"`);

          // 1. Emit the event to Kafka and convert the RxJS Observable to a Promise to await success
          await firstValueFrom(this.kafkaClient.emit(event.pattern, event.payload));

          // 2. Mark the event as COMPLETED in the database on success
          event.status = OutboxStatus.COMPLETED;
          event.processedAt = new Date(); // Sets the deletion countdown
          event.attempts += 1;
          await event.save();

          this.logger.log(`Successfully published outbox event ${event._id}`);
        } catch (error: any) {
          event.attempts += 1;
          event.error = error.message || String(error);

          // 3. If it failed too many times (e.g. 5), set status to FAILED to quarantine it
          if (event.attempts >= 25) {
            event.status = OutboxStatus.FAILED;
            event.processedAt = new Date();
            this.logger.error(`Outbox event ${event._id} permanently failed after ${event.attempts} attempts. Error: ${event.error}`);
          } else {
            // Keep status as PENDING so it will be retried on the next poll
            this.logger.warn(`Retrying outbox event ${event._id} later. Attempt ${event.attempts}. Error: ${event.error}`);
          }
          await event.save();
        }
      }
    } catch (error) {
      this.logger.error('Error occurred during Outbox Poller execution loop:', error);
    } finally {
      this.isPolling = false;
    }
  }
}
