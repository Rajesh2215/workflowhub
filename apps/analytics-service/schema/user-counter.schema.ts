import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserCounterDocument = UserCounter & Document;

@Schema({ timestamps: true })
export class UserCounter {
  @Prop({ required: true, unique: true })
  userId!: string;

  @Prop({ required: true, default: 0 })
  taskCount!: number;
}

export const UserCounterSchema = SchemaFactory.createForClass(UserCounter);
