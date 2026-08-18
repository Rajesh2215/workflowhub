import { CallHandler, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Histogram } from "prom-client";
import { Observable, tap } from "rxjs";

@Injectable()
export class MetricsInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    public readonly histogram: Histogram<string>
  ) { }

  // intercept is a predefined method name required by NestJS.
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    if (!request || !request.method) {
      return next.handle()
    }

    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000;
        // Use the normalized route pattern to avoid high-cardinality Prometheus labels.
        // Fall back to controller/handler names instead of request.url, which may contain dynamic IDs.

        const route =
          request.route?.path ||
          `${context.getClass().name}.${context.getHandler().name}`;

        this.histogram.observe(
          {
            method: request.method,
            route,
            status_code: response.statusCode.toString()
          },
          duration
        )

      })
    )

  }
}