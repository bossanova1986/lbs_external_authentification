import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';

@Injectable()
export class LogoutGuard extends AuthGuard('saml') {

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    return {
      samlFallback: "logout-request"
    };
  }
}
