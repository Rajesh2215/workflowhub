import { Controller, Logger } from '@nestjs/common';
import { TaskServiceService } from './task.service';
import { GrpcMethod, MessagePattern } from '@nestjs/microservices';
import { TaskDto } from '@app/shared';

@Controller('task')
export class TaskServiceController {
  private readonly logger = new Logger(TaskServiceController.name);

  constructor(private readonly taskService: TaskServiceService) { }

  @GrpcMethod('TaskService', 'CreateTask')
  async grpcCreateTask(data: TaskDto) {
    this.logger.log(`[gRPC] Creating task: ${data.title}`);
    const result = await this.taskService.create(data);
    return {
      id: result.task._id.toString(),
      title: result.task.title,
      description: result.task.description,
      userId: result.task.userId,
      message: result.message,
    };
  }

  @MessagePattern('task.findAllByUserId')
  findAllByUserId(body: { userId: string }) {
    return this.taskService.findAllByUserId(body.userId);
  }

  @GrpcMethod('TaskService', 'CreateSaga')
  async grpcCreateSaga(data: { userId: string; title: string; description: string }) {
    this.logger.log(`[gRPC] Creating welcome task via Saga for user: ${data.userId}`);
    const result = await this.taskService.createSaga(data);
    return {
      id: result.task._id.toString(),
      title: result.task.title,
      description: result.task.description,
      userId: result.task.userId,
      message: result.message,
    };
  }

  @GrpcMethod('TaskService', 'DeleteSaga')
  async grpcDeleteSaga(data: { taskId: string }) {
    this.logger.log(`[gRPC] Deleting task via Saga: ${data.taskId}`);
    const result = await this.taskService.deleteSaga(data.taskId);
    return {
      success: result.success,
      message: result.message,
    };
  }
}
