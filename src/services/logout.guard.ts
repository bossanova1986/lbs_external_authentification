import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';

@Injectable()
export class LogoutGuard extends AuthGuard('saml') {
  getAuthenticateOptions(_context: ExecutionContext): IAuthModuleOptions {
    return {
      samlFallback: 'logout-request',
    };
  }
}
