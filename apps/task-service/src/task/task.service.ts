import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Task, TaskDocument } from '../schemas/task.schema';
import { Connection, Model } from 'mongoose';
import { ClientKafka, ClientProxy, RpcException } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/shared';
import { Outbox, OutboxDocument, OutboxStatus } from '../schemas/outbox.schema';

@Injectable()
export class TaskServiceService {
  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,

    @InjectModel(Outbox.name)
    private outboxModel: Model<OutboxDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,

  ) { }

  async create(body) {

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Note: Mongoose requires an array of payloads when a session is supplied
      const [task] = await this.taskModel.create([body], { session });
      await this.outboxModel.create([
        {
          pattern: KAFKA_TOPICS.TASK_CREATED,
          payload: {
            userId: body.userId,
            taskId: task._id.toString(),
            title: task.title,
            message: 'Task Created Successfully',
            type: 'EMAIL',
          },
          status: OutboxStatus.PENDING,
          attempts: 0,
        }
      ], { session });

      await session.commitTransaction();
      return {
        message: 'Task created successfully',
        task,
      };
    } catch (error) {
      await session.abortTransaction();
      throw new RpcException({
        statusCode: 400,
        message: `Task creation transaction failed: ${error.message}`,
      });
    } finally {
      // 7. End the session to clean up database connections
      await session.endSession();
    }
  }

  async findAllByUserId(userId: string) {
    const tasks = await this.taskModel.find({ userId });

    return {
      message: 'Tasks fetched successfully',
      tasks,
    };
  }
  async createSaga(body) {
    const task = await this.taskModel.create(body)
    if (!task) {
      throw new RpcException({
        statusCode: 400,
        message: 'Task creation failed via Saga',
      });
    }

    return {
      message: 'Task created successfully via Saga',
      task,
    };
  }

  async deleteSaga(taskId: string) {
    const result = await this.taskModel.findByIdAndDelete(taskId);
    if (!result) {
      throw new RpcException({
        statusCode: 404,
        message: `Task with ID ${taskId} not found for deletion`,
      });
    }
    return { success: true, message: 'Task deleted successfully' };
  }
}
