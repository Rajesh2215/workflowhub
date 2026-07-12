import { JwtAuthGuard } from '@app/auth/jwt-auth.guard';
import { Controller, Get, HttpException, Inject, Req, UseGuards, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { getGrpcMetadata, toHttpStatus, wrapWithCircuitbreaker } from '@app/shared';

interface AnalyticsServiceClient {
  getUserCounter(data: { userId: string }, metadata?: any): any;
}

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'analytics',
  version: '1',
})
export class AnalyticsController implements OnModuleInit {
  private analyticsService!: AnalyticsServiceClient;

  constructor(
    @Inject('ANALYTICS_SERVICE')
    private readonly analyticsClient: ClientGrpc,
  ) { }

  onModuleInit() {
    this.analyticsService = wrapWithCircuitbreaker(this.analyticsClient.getService<AnalyticsServiceClient>('AnalyticsService'), 'AnalyticsService');
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
