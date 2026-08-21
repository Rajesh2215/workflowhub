import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { THROTTLE_KEY, ThrottleOptions } from "../decorators/throttle.decorator";
import { RedisService } from "@app/shared";
import { ConfigService } from "@nestjs/config";

// Atomically increments a counter and sets its TTL only on first creation.
// Using a Lua script ensures INCR + EXPIRE execute as a single Redis operation,
// preventing the race condition where concurrent requests all see ttl === -1
// before any EXPIRE is applied.
const THROTTLE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

@Injectable()
export class RedisThrottlerGuard implements CanActivate {

  private readonly logger = new Logger(RedisThrottlerGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") {
      // Rate limiting is for external REST API endpoints
      return true
    }

    const handler = context.getHandler();
    const controller = context.getClass();

    const options = this.reflector.getAllAndOverride<ThrottleOptions>(THROTTLE_KEY, [
      handler,
      controller,
    ]) || {
      limit: Number(this.configService.get('API_GATEWAY_THROTTLE_LIMIT', 60)),
      ttl: Number(this.configService.get('API_GATEWAY_THROTTLE_TTL', 60)),
    };

    const request = context.switchToHttp().getRequest();

    // Resolve client identifier (User ID if authenticated, otherwise IP)
    const clientIdentifier = this.getClientIdentifier(request);

    // Generate an unique Redis key namespace based on the route and identifier
    const routePath = request.route?.path || request.url;
    const redisKey = `throttle:${routePath}:${clientIdentifier}`;
    const redis = this.redisService.getClient();

    try {
      // Atomically increment and, on first creation, set the TTL window.
      // The Lua script runs as a single Redis operation — no race condition.
      const currentRequests = await redis.eval(
        THROTTLE_SCRIPT, 1, redisKey, String(options.ttl),
      ) as number;
      // Check if threshold exceeded
      if (currentRequests > options.limit) {
        this.logger.warn(`Rate limit exceeded for client: ${clientIdentifier} on path: ${routePath}`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later.',
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Fail-open: log connection errors to Redis and allow requests through
      this.logger.error(`Throttler Redis error: ${error.message}. Allowing request to proceed...`);
    }

    return true
  }

  private getClientIdentifier(request: any): string {
    // Use user ID if set by JwtAuthGuard
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    // Resolve IP address from headers (helpful behind Docker proxy / reverse proxy)
    const ip =
      request.headers['x-forwarded-for'] ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';

    return `ip:${ip.split(',')[0].trim()}`; // Get first IP if x-forwarded-for contains a list
  }
}