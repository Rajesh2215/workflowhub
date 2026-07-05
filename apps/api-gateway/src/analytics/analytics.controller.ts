import { JwtAuthGuard } from '@app/auth/jwt-auth.guard';
import { Controller, Get, HttpException, Inject, Req, UseGuards, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { getGrpcMetadata } from '@app/shared';

interface AnalyticsServiceClient {
  getUserCounter(data: { userId: string }, metadata?: any): any;
}

function toHttpStatus(err: any) {
  if (err?.code) {
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
@Controller('analytics')
export class AnalyticsController implements OnModuleInit {
  private analyticsService!: AnalyticsServiceClient;

  constructor(
    @Inject('ANALYTICS_SERVICE')
    private readonly analyticsClient: ClientGrpc,
  ) { }

  onModuleInit() {
    this.analyticsService = this.analyticsClient.getService<AnalyticsServiceClient>('AnalyticsService');
  }

  @Get('counter')
  getCounter(@Req() req: any) {
    return this.analyticsService
      .getUserCounter({ userId: req.user.id }, getGrpcMetadata())
      .pipe(
        catchError((err) => {
          console.log('🚀 ~ AnalyticsController ~ getCounter ~ err:', err);
          throw new HttpException(
            err.details || err.message || 'Failed to fetch analytics counter',
            toHttpStatus(err),
          );
        }),
      );
  }
}
