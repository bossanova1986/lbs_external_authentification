/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sign } from 'jsonwebtoken';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let jwtSecret: string;
  
  beforeAll(() => {
    const tempDir = mkdtempSync(join(tmpdir(), 'saml-test-'));
    const writeTemp = (name: string, content: string): string => {
      const file = join(tempDir, name);
      writeFileSync(file, content);
      return file;
    };

    jwtSecret = 'test-jwt-secret';

    const privateKey = writeTemp('private.pem', jwtSecret);
    const publicKey = writeTemp('public.pem', jwtSecret);
    const cert = writeTemp('cert.pem', 'test-cert');

    process.env.SSO_SP_CERT = cert;
    process.env.SSO_SP_PRIVATEKEY = privateKey;
    process.env.SSO_SP_PUBLICKEY = publicKey;
    process.env.SSO_SP_ALGORITHM = 'sha256';
    process.env.SSO_SP_DESCRIPTION = 'https://sp.example/auth/saml';
    process.env.SSO_SP_CALLBACK_SIGNON =
      'https://sp.example/auth/signonCallback';
    process.env.SSO_SP_CALLBACK_LOGOUT =
      'https://sp.example/auth/logoutCallback';
    process.env.SSO_IDP_PUBLICKEY = cert;
    process.env.SSO_IDP_SIGNON = 'https://idp.example/signon';
    process.env.SSO_IDP_LOGOUT = 'https://idp.example/logout';
    process.env.SSO_IDP_ID_FORMAT =
      'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';
    process.env.SSO_IDP_AUTHN_CONTEXT =
      'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport';
    process.env.SSO_IDP_WANT_ASSERTIONS_SIGNED = 'true';
    process.env.SSO_IDP_UID_FIELD = 'uid';
    process.env.SSO_IDP_BARCODE_FIELD = 'barcode';
    process.env.SSO_PREFIX = 'saml_';

    process.env.LBS_LOGIN_URL = 'https://lbs.example/login';
    process.env.LBS_CLIENT_AUTH = 'test-client-secret';
    process.env.JWT_TOKEN_PUBLICKEY = publicKey;
    process.env.JWT_TOKEN_PRIVATEKEY = privateKey;
    process.env.JWT_TOKEN_EXPIRATION = '60s';
    process.env.JWT_TOKEN_ALGORITHM = 'HS256';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/lbs_login (GET) rejects request without auth headers', () => {
    return request(app.getHttpServer())
      .get('/auth/lbs_login')
      .expect(401)
      .expect(({ body }) => {
        expect(body.error).toBe('Client secret is not correct.');
        expect(body.code).toBe('invalid_client');
      });
  });

  it('/auth/lbs_login (GET) rejects users without SSO prefix', () => {
    const credentials = Buffer.from('plain-user:any-password').toString(
      'base64',
    );

    return request(app.getHttpServer())
      .get('/auth/lbs_login')
      .set('Authorization', `Basic ${credentials}`)
      .set('client-authorization', 'test-client-secret')
      .expect(401)
      .expect(({ body }) => {
        expect(body.error).toBe('User does not exist');
        expect(body.code).toBe('not_found');
      });
  });

  it('/auth/lbs_login (GET) rejects prefixed users with invalid JWT password', () => {
    const credentials = Buffer.from('saml_123456:not-a-jwt').toString('base64');

    return request(app.getHttpServer())
      .get('/auth/lbs_login')
      .set('Authorization', `Basic ${credentials}`)
      .set('client-authorization', 'test-client-secret')
      .expect(401)
      .expect(({ body }) => {
        expect(body.error).toBe('Password incorrect');
        expect(body.code).toBe('invalid_credentials');
      });
  });

  it('/auth/lbs_login (GET) accepts prefixed users with matching barcode in JWT password', () => {
    const token = sign(
      { id: 'test-user', barcode: '123456' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '60s' },
    );
    const credentials = Buffer.from(`saml_123456:${token}`).toString('base64');

    return request(app.getHttpServer())
      .get('/auth/lbs_login')
      .set('Authorization', `Basic ${credentials}`)
      .set('client-authorization', 'test-client-secret')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ patron: '123456' });
      });
  });
});
