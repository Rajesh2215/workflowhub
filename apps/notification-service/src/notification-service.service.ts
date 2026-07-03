import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from '../schema/create-notification.schema';
import { Model } from 'mongoose';

@Injectable()
export class NotificationServiceService {

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Document>
  ) { }

  async handleTaskCreated(data: any) {
    // send email or push notification
    return this.notificationModel.create(data)
  }

  async createNotification(data: any) {
    const result = await this.notificationModel.create(data)
    if (!result) {
      throw new Error('Notification creation failed in Saga')
    }
    return result
  }

  async deleteNotification(notificationId: string) {
    const result = await this.notificationModel.findByIdAndDelete(notificationId);
    if (!result) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    return { success: true, message: 'Notification deleted successfully' };
  }
}
