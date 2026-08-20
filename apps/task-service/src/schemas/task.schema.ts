import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type TaskDocument = Task & Document

@Schema()
export class Task {
  @Prop({ required: true })
  title!: string
  
  @Prop({ required: true })
  description!: string
  
  @Prop({ required: true })
  userId!: string
}

export const TaskSchema = SchemaFactory.createForClass(Task)

// Index for the primary query pattern: find tasks by userId
// Matches the exact query in findAllByUserId: taskModel.find({ userId })
TaskSchema.index({ userId: 1 })