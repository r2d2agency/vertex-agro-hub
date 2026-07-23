import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtAccessTtl, jwtSecret } from './auth.config';
import { JwtStrategy } from './strategies/jwt.strategy';

// Google OAuth desativado por enquanto — reative importando GoogleStrategy
// e adicionando de volta em providers quando as credenciais estiverem prontas.

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: jwtAccessTtl() },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
