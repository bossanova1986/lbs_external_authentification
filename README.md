# LBS External Authentication Service

This project is a **NestJS-based SAML bridge** between an Identity Provider (IdP) and an LBS system using the External Authentication option introduced by LOAN4.
The LBS configuration and the message model can be assessed via the [VZG confluence](https://info.gbv.de/pages/viewpage.action?pageId=928153711&spaceKey=ProjLBS&title=Externe%2BAuthentifizierung). 

It allows patrons to authenticate through SAML SSO and then consequently signs them into LBS by using a generated JWT. It also supports the provided fall-back option using LBS credentials.

It is developed by Sascha Bosse, University Library Magdeburg. Credit goes to the library of the HSU Hamburg and especially Mr. Ulrich Hahn for the underlying idea to use separate endpoints and a hidden form POST for SSO and LBS authentication. The workflow and code examples will be also given in the [VZG confluence](https://info.gbv.de/pages/viewpage.action?pageId=928153711&spaceKey=ProjLBS&title=Externe%2BAuthentifizierung).

## Project Scope

The service is responsible for:

- Exposing SAML endpoints for metadata, sign-on and logout.
- Validating SAML assertions from the configured IdP.
- Extracting user identity attributes (UID and barcode) from the SAML profile.
- Generating a short-lived JWT containing the identity attributes.
- Returning/submitting an HTML form to LBS with:
  - `username = <SSO_PREFIX><barcode>`
  - `password = <encoded JWT token>`
- Supporting an the specified external auth endpoint for LBS configuration (`/auth/lbs_login`) that validates:
  - LBS client secret (`client-authorization` header)
  - Basic auth format
  - JWT validity and barcode match
- if the received username does not start with the configured SSO prefix, a 401 user not found is emitted, so that the fallback option of the LBS can take over (if configured) 

## Required actions
- deploy the application using Node.JS or via Docker
- introduce a SSO login link or button in the LOAN4 interface, e.g. by using the `opac_description_logon_text_lower` fields in LBS-SMM pointing to the `/auth/signon` endpoint
- configure the external authentication via YAML or `lbs_properties` file

## Authentication Workflow

### 1) SAML sign-on starts

Client is redirected from LOAN4 to `GET /auth/signon`, which triggers SAML authentication through Passport SAML.

### 2) IdP authenticates user

The IdP returns the SAML response to `POST /auth/signonCallback`.

### 3) User data is mapped

The SAML strategy maps configured SAML attributes into:

- `name` (from `SSO_IDP_UID_FIELD`)
- `barcode` (from `SSO_IDP_BARCODE_FIELD`)

### 4) JWT is generated

The service signs a JWT containing user data (`id`, `barcode`) using configured RSA keys and algorithm.

### 5) Auto-submit to LBS

The callback returns an HTML page with an auto-submitted form POST to `LBS_LOGIN_URL` carrying:

- `username`: prefixed barcode
- `password`: signed JWT

### 6) LBS validates via `/auth/lbs_login`

When LBS calls the validation endpoint using Basic auth, the service verifies:

- expected `client-authorization` header value
- username starts with `SSO_PREFIX`
- JWT signature and expiration
- barcode in JWT matches barcode in username

On success, the endpoint responds with a 200 response containing the patron barcode. After that, the user is authenticated.

### 7) LBS Fallback

If the external authentication endpoint receives usernames without the `SSO_PREFIX`, it returns a 401 response with code `not_found`. If the fallback is activated in LBS configuration, this response starts the traditional authentication attempt using the LBS credentials. 

## Runtime Endpoints

- `GET /auth/saml` - service provider metadata
- `GET /auth/signon` - initiate SAML login
- `POST /auth/signonCallback` - SAML assertion consumer
- `GET /auth/logout` - initiate SAML logout
- `POST /auth/logoutCallback` - logout callback
- `GET /auth/lbs_login` - LBS credential validation

> If `BASE_PATH` is set, it is prepended as a global prefix to all routes.

## Required Configuration

Environment values are loaded from `env.<NODE_ENV>` when `NODE_ENV` is set; otherwise from `env.template`.

### Service Provider (SP) / SAML settings for providing meta data to the IdP

- `SSO_SP_CERT` - SP certificate path
- `SSO_SP_PRIVATEKEY` - SP private key path
- `SSO_SP_PUBLICKEY` - SP public key path
- `SSO_SP_ALGORITHM` - XML signature/digest algorithm (for example `sha256`)
- `SSO_SP_DESCRIPTION` - SP issuer/entity ID
- `SSO_SP_CALLBACK_SIGNON` - sign-on callback URL
- `SSO_SP_CALLBACK_LOGOUT` - logout callback URL

### Identity Provider (IdP) settings

- `SSO_IDP_PUBLICKEY` - IdP certificate/public key path
- `SSO_IDP_SIGNON` - IdP SSO endpoint
- `SSO_IDP_LOGOUT` - IdP SLO endpoint
- `SSO_IDP_ID_FORMAT` - NameID format
- `SSO_IDP_AUTHN_CONTEXT` - authn context class reference
- `SSO_IDP_WANT_ASSERTIONS_SIGNED` - whether signed assertions are required (`true/1/yes`)
- `SSO_IDP_UID_FIELD` - SAML attribute used as user identifier
- `SSO_IDP_BARCODE_FIELD` - SAML attribute used as barcode

### LBS integration settings

- `LBS_LOGIN_URL` - LBS login endpoint that receives form POST
- `LBS_CLIENT_AUTH` - expected shared secret in `client-authorization`, configured by LBS
- `LBS_BARCODE_REGEX` - optional validation regex for SAML barcode
- `SSO_PREFIX` - required username prefix used toward LBS

### JWT settings

- `JWT_TOKEN_PUBLICKEY` - JWT public key path
- `JWT_TOKEN_PRIVATEKEY` - JWT private key path
- `JWT_TOKEN_EXPIRATION` - token lifetime (example: `60s`)
- `JWT_TOKEN_ALGORITHM` - JWT algorithm (example: `RS256`)

### Optional/global settings

- `BASE_PATH` - optional route prefix
- `PORT` - HTTP port (default: `3000`)
- `NODE_ENV` - selects env file (`env.<NODE_ENV>`)

## Local Development

```bash
npm install
npm run start:dev
```

## Build and Test

```bash
npm run build
npm run test
npm run test:e2e
```

## Docker

Currently, the image has to be constructed after cloning this repository:

```bash
docker build -f docker_assignment/Dockerfile -t lbs_ext_auth .
```

After that, provide the neccessary key and cert files as well as environment to start the container, e.g.:

```bash
docker run \
	--detach \
	--name lbs_ext_auth \
	-e NODE_ENV=prod \
	-e BASE_PATH=lbs_ext_auth \
	-v "/docker/appdata/lbs_ext_auth/env.prod:/usr/src/app/env.prod:ro" \
	-v "/docker/appdata/lbs_ext_auth/key/lbs_ext_auth2026.key:/key/lbs_ext_auth2026.key:ro" \
	-v "/docker/appdata/lbs_ext_auth/key/lbs_ext_auth2026.pub:/key/lbs_ext_auth2026.pub:ro" \
	-v "/docker/appdata/lbs_ext_auth/key/jwt2026.key:/key/jwt2026.key:ro" \
	-v "/docker/appdata/lbs_ext_auth/key/jwt2026.pub:/key/jwt2026.pub:ro" \
	-v "/docker/appdata/lbs_ext_auth/cert/lbs_ext_auth2026.arm:/cert/lbs_ext_auth2026.arm:ro" \
	-v "/docker/appdata/lbs_ext_auth/cert/urz_pub.pem:/cert/urz_pub.pem:ro" \
	lbs_ext_auth
```