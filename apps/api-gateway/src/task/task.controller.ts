import { JwtAuthGuard } from '@app/auth/jwt-auth.guard';
import { Body, Controller, Get, HttpException, Inject, Post, Req, UseGuards, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { TaskDto, getGrpcMetadata } from '@app/shared';

interface TaskServiceClient {
  createTask(data: any, metadata?: any): any;
  getTasks(data: { userId: string }, metadata?: any): any;
}

function toHttpStatus(err: any) {
  if (err?.code) {
    // Map common gRPC codes to HTTP status
    switch (err.code) {
      case 3: return 400; // INVALID_ARGUMENT
      case 5: return 404; // NOT_FOUND
      case 6: return 409; // ALREADY_EXISTS
      case 16: return 401; // UNAUTHENTICATED
    }
  }
  const status = Number(err?.statusCode ?? err?.status);
  return Number.isInteger(status) ? status : 500;
}

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'task',
  version: '1',
})
export class TaskController implements OnModuleInit {
  private taskService: TaskServiceClient;

  constructor(
    @Inject('TASK_SERVICE')
    private readonly taskClient: ClientGrpc,
  ) { }

  onModuleInit() {
    this.taskService = this.taskClient.getService<TaskServiceClient>('TaskService');
  }

  @Post('create')
  create(@Body() body: TaskDto, @Req() req: any) {
    return this.taskService
      .createTask({ ...body, userId: req.user.id }, getGrpcMetadata())
      .pipe(
        catchError((err) => {
          console.log('🚀 ~ TaskController ~ create ~ err:', err);
          throw new HttpException(
            err.details || err.message || 'Task Creation failed',
            toHttpStatus(err),
          );
        }),
      );
  }

  @Get('all')
  getAll(@Req() req: any) {
    return this.taskService
      .getTasks({ userId: req.user.id }, getGrpcMetadata())
      .pipe(
        catchError((err) => {
          console.log('🚀 ~ TaskController ~ getAll ~ err:', err);
          throw new HttpException(
            err.details || err.message || 'Failed to fetch tasks',
            toHttpStatus(err),
          );
        }),
      );
  }
}
