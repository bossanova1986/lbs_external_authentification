import { Controller, Get, HttpCode, InternalServerErrorException, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import * as sanitizeHtml from 'sanitize-html';
import { SamlLoginGuard } from "src/services/saml-login.guard";
import { SamlStrategy } from "src/strategies/saml.strategy";
import { LogoutGuard } from "../services/logout.guard";

@Controller("auth")
export class AuthController {

  regex: RegExp;
  constructor(private configService: ConfigService, private ssoStrategy: SamlStrategy, private jwtService: JwtService) {
    if (this.configService.get<string>('LBS_BARCODE_REGEX')) this.regex = new RegExp(this.configService.get<string>('LBS_BARCODE_REGEX'), 'g');
  }

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
    const authHeader = req.headers.authorization;
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, token] = credentials.split(':');

    if (username.startsWith(this.configService.get<string>('SSO_PREFIX'))) {
      try {
        const payload = this.jwtService.verify(token);
        if (payload.barcode === username.replace(this.configService.get<string>('SSO_PREFIX'), '')) {
          console.log('SAML login successful for patron with barcode: ' + payload.barcode);
          return {
            'patron': payload.barcode,
          }
        } else {
          console.log('Token is valid but barcode does not match username for user ' + username);
          throw new UnauthorizedException({
            code: "invalid_credentials",
            error: "Password incorrect"
          })
        }
      } catch (error) {
        console.log('password is not a valid JWT for user ' + username);
        throw new UnauthorizedException({
          code: "invalid_credentials",
          error: "Password incorrect"
        })
      }
    } else {
      console.log('Username does not start with SSO prefix: ' + username);
      throw new UnauthorizedException({
        code: "not_found",
        error: "User does not exist"
      })
    }
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
    const lbsLoginUrl = process.env.LBS_LOGIN_URL!;

    const payload = {
      id: req.user['name'],
      barcode: req.user['barcode']
    }

    if (this.regex && !this.regex.test(payload.barcode)) {
      throw new InternalServerErrorException('Invalid barcode format from SAML response: ' + payload.barcode);
    }

    const token = this.jwtService.sign(payload);

    res
      .status(200)
      .setHeader('Cache-Control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(`<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <form id="lbs" action="${sanitizeHtml(lbsLoginUrl)}" method="post">
      <input type="hidden" name="username" value="${sanitizeHtml(this.configService.get<string>('SSO_PREFIX') + String(req.user['barcode']))}">
      <input type="hidden" name="password" value="${sanitizeHtml(String(token))}">
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
