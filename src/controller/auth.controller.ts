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
import * as sanitizeHtml from 'sanitize-html';

@Controller("auth")
export class AuthController {

  constructor(private configService: ConfigService, private ssoStrategy: SamlStrategy) { }

  @Get("saml")
  saml(@Res() res) {
    res.set('Content-Type', 'text/xml');
    let a = this.ssoStrategy.generateServiceProviderMetadata(readFileSync(this.configService.get<string>('SSO_SP_CERT')).toString(), readFileSync(this.configService.get<string>('SSO_SP_CERT')).toString());
    res.send(a);
  }

  @UseGuards(SamlLoginGuard)
  @Get("signon")
  signon() {
  }

  @Get("lbs_login")
  @HttpCode(200)
  lbs_login(@Req() req: Request) {
    //LBS sends request with Basic auth and Base64 encoded username:password in Authorization header, e.g. "Authorization: Basic dGVzdC11c2VyOnRlc3QtcGFzcw=="
    //as well as client secret, e.g. 'client-authorization': '9x831i0as9ghy1'
    if (!req.headers.authorization || !req.headers['client-authorization'] || req.headers['client-authorization'] !== this.configService.get<string>('LBS_CLIENT_AUTH')) {
      console.log('Invalid client secret or missing authorization header');
      throw new UnauthorizedException({
        code: "invalid_client",
        error: "Client secret is not correct."
      });
    } 
    throw new UnauthorizedException({
        code: "not_found",
        error: "User does not exist"
    })



     /* console.log('LBS login successful');
      return {
        'patron' : '31001048660',
      }*/
    
  }

  @UseGuards(LogoutGuard)
  @Get("logout")
  async logout() {
  }

  @UseGuards(AuthGuard('saml'))
  @Post("signonCallback")
  async signonCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    //user object of request is enriched with token via saml auth guard
    //send a POST request to LBS server with token as form data
    const lbsLoginUrl = process.env.LBS_LOGIN_URL!; // z.B. https://lbs.example.de/LBS_WEB/login

    res
      .status(200)
      .setHeader('Cache-Control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(`<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <form id="lbs" action="${sanitizeHtml(lbsLoginUrl)}" method="post">
      <input type="hidden" name="username" value="${sanitizeHtml(String(req.user['barcode']))}">
      <input type="hidden" name="password" value="${sanitizeHtml(String('The Token'))}">
    </form>
    <script>document.getElementById('lbs').submit();</script>
  </body>
</html>`);
  }

  @UseGuards(AuthGuard('saml'))
  @Post("logoutCallback")
  async logoutCallback(@Res({ passthrough: true }) res) {
    console.log('LBS logout successful')
  }
}
