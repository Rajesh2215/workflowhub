import { JwtAuthGuard } from '@app/auth/jwt-auth.guard';
import { Body, Controller, Get, HttpException, Inject, Post, Req, UseGuards, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { TaskDto, getGrpcMetadata, toHttpStatus, wrapWithCircuitbreaker } from '@app/shared';

interface TaskServiceClient {
  createTask(data: any, metadata?: any): any;
  getTasks(data: { userId: string }, metadata?: any): any;
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
    private readonly taskClient: ClientGrpc & ClientProxy,
  ) { }

  onModuleInit() {
    this.taskService = wrapWithCircuitbreaker(this.taskClient.getService<TaskServiceClient>('TaskService'), 'TaskService');
  }

  @Post('create')
  create(@Body() body: TaskDto, @Req() req: any) {
    return this.taskService
      .createTask({ ...body, userId: req.user.id }, getGrpcMetadata())
      .pipe(
        catchError((err) => {
          console.log('🚀 ~ TaskController ~ create ~ err:', err?.message);
          throw new HttpException(
            err.details || err.message || 'Task Creation failed',
            toHttpStatus(err),
          );
        }),
      );
  }

  @Get('all')
  getAll(@Req() req: any) {
    return this.taskClient
      .send('task.findAllByUserId', { userId: req.user.id })
      .pipe(
        catchError((err) => {
          console.log('🚀 ~ TaskController ~ getAll ~ err:', err);
          throw new HttpException(
            err.message || 'Failed to fetch tasks',
            toHttpStatus(err),
          );
        }),
      );
  }
}
