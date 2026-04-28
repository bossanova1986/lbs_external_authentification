import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SamlLoginGuard extends AuthGuard('saml') {
  constructor() {
    super();
  }

  getAuthenticateOptions(_context: ExecutionContext) {
    return {
      additionalParams: {},
    };
  }
}
