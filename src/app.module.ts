import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { LogoutGuard } from './services/logout.guard';
import { SamlLoginGuard } from './services/saml-login.guard';
import { SamlStrategy } from './strategies/saml.strategy';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
    })
  ],
  controllers: [AuthController],
  providers: [LogoutGuard, SamlLoginGuard, SamlStrategy],
})
export class AppModule {}
