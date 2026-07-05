import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './api-gateway.controller';
import { AppService } from './api-gateway.service';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/̉task.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HttpCorrelationMiddleware, RabbitmqSetupModule, RedisModule } from '@app/shared';
import { RedisThrottlerGuard } from './common/guards/redis-throttler.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { makeHistogramProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

// 1. Define the histogram provider
const httpMetricProvider = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
    }),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/api-gateway/.env' }),
    AuthModule,
    TaskModule,
    AnalyticsModule,
    RabbitmqSetupModule,
    RedisModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    httpMetricProvider,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RedisThrottlerGuard,
    },
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpCorrelationMiddleware).forRoutes('*');
  }
}
