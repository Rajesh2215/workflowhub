import { Body, Controller, HttpException, Inject, Post, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { RegistrationSagaService } from './registration-saga.service';
import { RegisterDto, LoginDto, getGrpcMetadata, wrapWithCircuitbreaker, toHttpStatus } from '@app/shared'; // <-- Import DTOs and metadata helper

interface AuthServiceClient {
  register(data: RegisterDto, metadata?: any): any;
  login(data: LoginDto, metadata?: any): any;
}

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController implements OnModuleInit {
  private authService: AuthServiceClient;

  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientGrpc,
    private readonly registrationSagaService: RegistrationSagaService,
  ) { }

  onModuleInit() {
    this.authService = wrapWithCircuitbreaker(this.authClient.getService<AuthServiceClient>('AuthService'), 'AuthService');
  }

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body, getGrpcMetadata()).pipe(
      catchError((err) => {
        console.log('🚀 ~ AuthController ~ register ~ err:', err?.message);
        throw new HttpException(
          err.details || err.message || 'Authentication failed',
          toHttpStatus(err), // <-- Maps circuit breaker/gRPC errors to HTTP status
        );
      }),
    );
  }

  // Use same api for Saga pattern
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body, getGrpcMetadata()).pipe(
      catchError((err) => {
        console.log('🚀 ~ AuthController ~ login ~ err:', err?.message);
        throw new HttpException(
          err.details || err.message || 'Authentication failed',
          toHttpStatus(err), // <-- Maps circuit breaker/gRPC errors to HTTP status
        );
      }),
    );
  }

  @Post('register-saga')
  registerSaga(@Body() body: RegisterDto) {
    return this.registrationSagaService.executeRegistrationSaga(body);
  }
}
