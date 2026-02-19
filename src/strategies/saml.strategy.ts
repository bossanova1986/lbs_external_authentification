import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { Profile, Strategy, VerifyWithoutRequest, VerifyWithRequest } from '@node-saml/passport-saml/lib';
import { Request } from 'express';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy) {
    
    constructor(private configService: ConfigService) {
        const signonVerify:VerifyWithRequest = (_req, profile: Profile, done: (err: any, user?: any) => void) => {
            console.log("done");
            return done(null, profile);
        };
        super({
            issuer: configService.get('SSO_SP_DESCRIPTION'), // issuer string to supply to identity provider
            callbackUrl: configService.get('SSO_SP_CALLBACK_SIGNON'), // since the relative path for the callback is not sufficient information to generate a complete metadata document
            logoutCallbackUrl: configService.get('SSO_SP_CALLBACK_LOGOUT'),
            entryPoint: configService.get('SSO_IDP_SIGNON'),
            logoutUrl: configService.get('SSO_IDP_LOGOUT'),
            privateKey: readFileSync(configService.get('SSO_SP_PRIVATEKEY'), "utf-8"),
            decryptionPvk: readFileSync(configService.get('SSO_SP_PRIVATEKEY'), "utf-8"), // private key that will be used to attempt to decrypt any encrypted assertions that are received
            signatureAlgorithm: configService.get('SSO_SP_ALGORITHM'),
            digestAlgorithm: configService.get('SSO_SP_ALGORITHM'),
            identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
            authnContext: ["urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"],
            wantAssertionsSigned: true,
            passReqToCallback: true,
            idpCert: readFileSync(configService.get('SSO_IDP_PUBLICKEY'), "utf-8"), // the IDP's public signing certificate used to validate the signatures of the incoming SAML Responses,
        }, signonVerify );
    }

    async validate(req: Request, profile: Profile): Promise<any> {
        console.log("validate")
        let name = profile['urn:oid:0.9.2342.19200300.100.1.1'] as string;
        console.log(name)
        return {
            name,
            barcode: '31001048660'
        }
    }
}
