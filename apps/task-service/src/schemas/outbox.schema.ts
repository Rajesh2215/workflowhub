import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OutboxDocument = Outbox & Document;

// Enum representing the status lifecycle of an outbox message
export enum OutboxStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt fields
export class Outbox {
  @Prop({ required: true })
  pattern!: string; // The event/topic name (e.g., 'task.created')

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload!: Record<string, any>; // The serialized event message payload

  @Prop({ required: true, enum: OutboxStatus, default: OutboxStatus.PENDING })
  status!: OutboxStatus; // Tracks whether the message is PENDING, COMPLETED, or FAILED

  @Prop({ required: true, default: 0 })
  attempts!: number; // Counter tracking how many times we attempted to publish this message

  @Prop({ required: false })
  error?: string; // Optional field to store error logs if publishing fails

  @Prop({ required: false })
  processedAt?: Date; // Timestamp when the event was finished (either COMPLETED or FAILED)
}

export const OutboxSchema = SchemaFactory.createForClass(Outbox);

// Compound index to optimize the polling query: finding PENDING records sorted by creation date
OutboxSchema.index({ status: 1, createdAt: 1 });
// Automatically delete documents 7 days (604800 seconds) after they are processed
OutboxSchema.index({ processedAt: 1 }, { expireAfterSeconds: 604800 });

