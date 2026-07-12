import { Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { firstValueFrom, from, Observable } from 'rxjs';

//firstValueFrom converts an Observable into a Promise
//from converts a Promise back into an Observable


// Extend opossum's Options to support fallbacks for specific method names
export interface CircuitBreakerOptions extends CircuitBreaker.Options {
  fallbacks?: Record<string | symbol, (...args: any[]) => any>;
}

export function wrapWithCircuitbreaker<T extends object>(
  service: T,
  serviceName: string,
  options?: CircuitBreakerOptions,
): T {
  const logger = new Logger(serviceName);
  logger.log("Service name: ", serviceName);

  // A map to store active circuit breakers, keyed by method name
  const breakers = new Map<string | symbol, CircuitBreaker>();

  return new Proxy(service, {

    // The "get" trap intercepts property access on the service object
    get(target, prop, receiver) {
      const originalMethod: any = Reflect.get(target, prop, receiver);

      // If the property is not a function (e.g. metadata or a configuration field), return it as is
      if (typeof originalMethod !== 'function' && originalMethod !== Object.prototype.hasOwnProperty) {
        return originalMethod;
      }

      let breaker = breakers.get(prop);
      if (!breaker) {
        const methodLogger = new Logger(`CircuitBreaker: ${serviceName}: ${String(prop)}`)

        // Opossum requires an async action returning a Promise
        const action = async (...args: any) => {
          const result = originalMethod.apply(target, args);
          if (result instanceof Observable) {
            return firstValueFrom(result)
          }
          return result
        }
        // Instantiate the opossum circuit breaker with defaults
        breaker = new CircuitBreaker(action, {
          timeout: 5000,                // 5 seconds execution timeout
          errorThresholdPercentage: 50, // Trip if 50% or more requests fail
          resetTimeout: 10000,          // Wait 10 seconds before attempting to close again
          volumeThreshold: 5,           // Minimum 5 requests in a rolling window to trip
          errorFilter: (err) => {
            logger.log("Error caught by circuit breaker: ", err?.code);
            // Check if it's a server-side gRPC error code:
            // Add 2 (UNKNOWN) to allow NestJS mapped business exceptions (like Invalid Credentials) to bypass the breaker
            // 3: INVALID_ARGUMENT, 5: NOT_FOUND, 6: ALREADY_EXISTS, 7: PERMISSION_DENIED, 16: UNAUTHENTICATED
            if (err?.code !== undefined) {
              const serverCodes = [2, 3, 5, 6, 7, 16];
              if (serverCodes.includes(err.code)) {
                return true; // Ignore this error (do NOT count as system failure)
              }
            }
            return false; // Count other errors (connection, timeout, database crashes) as system failures
          },
          ...options,
        });

        // Register custom fallback if defined for this specific method
        if (options?.fallbacks?.[prop]) {
          breaker.fallback(options.fallbacks[prop]);
        }

        // Add event listeners to log state transitions
        breaker.on('open', () => {
          methodLogger.warn(`🔴 Circuit OPEN for ${serviceName}.${String(prop)}! Failing fast.`);
        });
        breaker.on('close', () => {
          methodLogger.log(`🟢 Circuit CLOSED for ${serviceName}.${String(prop)}. Resuming normal operations.`);
        });
        breaker.on('halfOpen', () => {
          methodLogger.log(`🟡 Circuit HALF-OPEN for ${serviceName}.${String(prop)}. Testing connection...`);
        });
        breakers.set(prop, breaker);
      }
      // Return a function that runs the circuit breaker and returns an Observable
      return function (...args: any[]) {
        return from(breaker.fire(...args));
      };
    },
  });

}

/**
 * Maps common errors (gRPC, HTTP, and Opossum Circuit Breaker errors) to HTTP status codes.
 */
export function toHttpStatus(err: any): number {
  // If the error already has an HTTP status, use it
  if (err?.status || err?.statusCode) {
    const status = Number(err.status ?? err.statusCode);
    if (Number.isInteger(status)) return status;
  }
  // Map gRPC status codes to HTTP status codes
  if (err?.code !== undefined) {
    switch (err.code) {
      case 3: return 400;  // INVALID_ARGUMENT -> BadRequest
      case 5: return 404;  // NOT_FOUND -> NotFound
      case 6: return 409;  // ALREADY_EXISTS -> Conflict
      case 16: return 401; // UNAUTHENTICATED -> Unauthorized
      case 4: return 504;  // DEADLINE_EXCEEDED -> Gateway Timeout
      case 14: return 503; // SERVICE_UNAVAILABLE -> Service Unavailable
    }
  }
  // Map Opossum Circuit Breaker errors to HTTP status codes
  // Map Opossum Circuit Breaker errors to HTTP status codes
  if (
    err?.name === 'OpenCircuitError' ||
    err?.message === 'The circuit is open' ||
    err?.message === 'Breaker is open' ||
    err?.code === 'EOPENBREAKER'
  ) {
    return 503; // Service Unavailable
  }

  return 500;
}