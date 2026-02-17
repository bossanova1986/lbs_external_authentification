import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { LogoutGuard } from './services/logout.guard';
import { SamlLoginGuard } from './services/saml-login.guard';
import { SamlStrategy } from './strategies/saml.strategy';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [LogoutGuard, SamlLoginGuard, SamlStrategy],
})
export class AppModule {}
