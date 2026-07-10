import { Body, Controller, HttpException, Inject, Post, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { RegistrationSagaService } from './registration-saga.service';
import { RegisterDto, LoginDto, getGrpcMetadata } from '@app/shared'; // <-- Import DTOs and metadata helper

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
    this.authService = this.authClient.getService<AuthServiceClient>('AuthService');
  }

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body, getGrpcMetadata()).pipe(
      catchError((err) => {
        console.log('🚀 ~ AuthController ~ register ~ err:', err);
        throw new HttpException(
          err.details || err.message || 'Authentication failed',
          err.code === 6 ? 409 : (err.code === 3 ? 400 : 500),
        );
      }),
    );
  }

  // Use same api for Saga pattern
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body, getGrpcMetadata()).pipe(
      catchError((err) => {
        console.log('🚀 ~ AuthController ~ login ~ err:', err);
        throw new HttpException(
          err.details || err.message || 'Authentication failed',
          err.code === 5 ? 404 : (err.code === 16 ? 401 : 500),
        );
      }),
    );
  }

  @Post('register-saga')
  registerSaga(@Body() body: RegisterDto) {
    return this.registrationSagaService.executeRegistrationSaga(body);
  }
}
