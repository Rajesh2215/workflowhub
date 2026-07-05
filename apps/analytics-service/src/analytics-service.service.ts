import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserCounter, UserCounterDocument } from '../schema/user-counter.schema';

@Injectable()
export class AnalyticsServiceService {
  private readonly logger = new Logger(AnalyticsServiceService.name);

  constructor(
    @InjectModel(UserCounter.name)
    private readonly userCounterModel: Model<UserCounterDocument>,
  ) {}

  async incrementUserCounter(userId: string): Promise<void> {
    this.logger.log(`Incrementing counter for user: ${userId}`);
    await this.userCounterModel.updateOne(
      { userId },
      { $inc: { taskCount: 1 } },
      { upsert: true }
    );
  }

  async getUserCounter(userId: string): Promise<UserCounter | null> {
    this.logger.log(`Fetching counter for user: ${userId}`);
    return this.userCounterModel.findOne({ userId }).exec();
  }
}
