import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { ValidateInResponseTo } from '@node-saml/node-saml';
import {
  Profile,
  Strategy,
  VerifyWithRequest,
} from '@node-saml/passport-saml/lib';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const signonVerify: VerifyWithRequest = async (
      _req,
      profile: Profile,
      done: (err: any, user?: any) => void,
    ) => {
      try {
        const user = this.validate(_req, profile);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    };
    super(
      {
        issuer: configService.get('SSO_SP_DESCRIPTION'), // issuer string to supply to identity provider
        callbackUrl: configService.get('SSO_SP_CALLBACK_SIGNON'), // since the relative path for the callback is not sufficient information to generate a complete metadata document
        logoutCallbackUrl: configService.get('SSO_SP_CALLBACK_LOGOUT'),
        entryPoint: configService.get('SSO_IDP_SIGNON'),
        logoutUrl: configService.get('SSO_IDP_LOGOUT'),
        privateKey: readFileSync(
          configService.get('SSO_SP_PRIVATEKEY'),
          'utf-8',
        ),
        decryptionPvk: readFileSync(
          configService.get('SSO_SP_PRIVATEKEY'),
          'utf-8',
        ), // private key that will be used to attempt to decrypt any encrypted assertions that are received
        signatureAlgorithm: configService.get('SSO_SP_ALGORITHM'),
        digestAlgorithm: configService.get('SSO_SP_ALGORITHM'),
        identifierFormat: configService.get('SSO_IDP_ID_FORMAT'), // the format of the NameID that the IdP will include in the SAML Response. This is used by the IdP to determine which attribute to use as NameID in the SAML Response. The default is "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified", which means that the IdP can choose any attribute to use as NameID.
        authnContext: [configService.get('SSO_IDP_AUTHN_CONTEXT')],
        wantAssertionsSigned: ['true', '1', 'yes'].includes(
          configService
            .get<string>('SSO_IDP_WANT_ASSERTIONS_SIGNED')
            ?.toLowerCase(),
        ), // whether the IdP will sign the SAML Response. This is used by the IdP to determine whether to sign the SAML Response. The default is false.
        passReqToCallback: true,
        idpCert: readFileSync(configService.get('SSO_IDP_PUBLICKEY'), 'utf-8'), // the IDP's public signing certificate used to validate the signatures of the incoming SAML Responses,
        validateInResponseTo: ValidateInResponseTo.always, // whether to validate the InResponseTo field of the SAML Response. This is used to prevent replay attacks. The default is false.
        requestIdExpirationPeriodMs: Number(
          configService.get<string>('SSO_REQUEST_ID_EXPIRATION_MS') ?? 300000,
        ),
      },
      signonVerify,
    );
  }

  validate(_req: any, profile: Profile): any {
    //console.log(profile);
    const name = this.getStringAttribute(
      profile,
      this.configService.get<string>('SSO_IDP_UID_FIELD'),
    );
    const barcode = this.getStringAttribute(
      profile,
      this.configService.get<string>('SSO_IDP_BARCODE_FIELD'),
    );
    return {
      name,
      barcode,
    };
  }

  private getStringAttribute(profile: Profile, attributeName: string): string {
    const value = profile[attributeName];
    const normalizedValue = Array.isArray(value) ? value[0] : value;

    if (typeof normalizedValue !== 'string' || normalizedValue.length === 0) {
      throw new Error(`Missing required SAML attribute: ${attributeName}`);
    }

    return normalizedValue;
  }
}
