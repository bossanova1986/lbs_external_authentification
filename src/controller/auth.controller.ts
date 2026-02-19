import { Controller, Get, HttpCode, MethodNotAllowedException, Next, Post, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { NextFunction, Request } from 'express';
import { readFileSync } from 'fs'
import { ConfigService } from "@nestjs/config";
import { LogoutGuard } from "../services/logout.guard";
import * as passport from 'passport';
import { SamlLoginGuard } from "src/services/saml-login.guard";
import { SamlStrategy } from "src/strategies/saml.strategy";
import { AuthGuard } from "@nestjs/passport";
import { Response } from 'express';

@Controller("auth")
export class AuthController {

  constructor(private configService: ConfigService, private ssoStrategy: SamlStrategy) { }

  @Get("saml")
  saml(@Res() res) {
    res.set('Content-Type', 'text/xml');
    let a = this.ssoStrategy.generateServiceProviderMetadata(readFileSync(this.configService.get<string>('SSO_SP_CERT')).toString(), readFileSync(this.configService.get<string>('SSO_SP_CERT')).toString());
    res.send(a);
  }

  //@UseGuards(SamlLoginGuard)
  @Get("signon")
  signon(@Req() req: Request) {
    console.log(req.headers)
    console.log(req)
  }

  @UseGuards(LogoutGuard)
  @Get("logout")
  async logout() {
  }

  @UseGuards(AuthGuard('saml'))
  @HttpCode(200)
  @Post("signonCallback")
  async signonCallback(@Req() req: Request, @Res({ passthrough: true }) res:Response) {
    if (!req.user || !req.user['barcode']) throw new UnauthorizedException({
      code: 'not_found',
      error: "User does not exist"
    });
    res.json({
      patron: req.user['barcode']
    });
  }

  @UseGuards(AuthGuard('saml'))
  @Post("logoutCallback")
  async logoutCallback(@Res({ passthrough: true }) res) {
    console.log('LBS logout successful')
  }
}
