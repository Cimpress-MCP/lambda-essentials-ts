# lambda-essentials-ts

A selection of the finest modules supporting authorization, API routing, error handling, logging and sending HTTP requests.

## Using this library

Install the library.

```bash
yarn add lambda-essentials-ts
```

### Logger

Logger which takes care of truncating Bearer tokens, safe JSON stringification, and converts errors to json objects.

```typescript
import { Logger } from 'lambda-essentials-ts';

const defaultConfiguration = { logFunction: console.log, jsonSpace: 2 };
let logger = new Logger(defaultConfiguration);

logger.log({ title: 'Message title', level: 'WARN', error: 'Error' });
```

### OpenApi wrapper

A wrapper around [Open API factory](https://github.com/wparad/openapi-factory.js) with logging and error handling.

```typescript
import { OpenApiWrapper } from 'lambda-essentials-ts';

const { api, getUserPrincipal, getRequestId, getUserToken } = new OpenApiWrapper(requestLogger);

api.get('/livecheck', () => {
  statusCode: 200;
});
api.any('/{proxy+}', () => {
  statusCode: 404;
});

export const lambdaHandler = api.handler;
```

### HttpClient

```typescript
import { HttpClient, HttpLogType, Logger } from 'lambda-essentials-ts';

let logger = new Logger();
let httpClient = new HttpClient({
  logFunction: (msg) => logger.log(msg),
  logOptions: { enabledLogs: [HttpLogType.requests] },
  tokenResolver: () => Promise.resolve('exampleAccessToken'),
  enableRetry: true,
  retryOptions: {
    retry: 3,
    statusCodesToRetry: [
      [100, 199],
      [429, 429],
      [500, 599],
    ],
  },
  enableCache: true,
  cacheOptions: {
    maxAge: 5 * 60 * 1000,
    readOnError: true,
    exclude: {
      query: false, // also cache requests with query parameters
    },
  },
});

let headers = {};
let data = { exampleProperty: 'exampleValue' };

let getResponse = await httpClient.get('VALID_URL', { headers });
let postResponse = await httpClient.post('VALID_URL', data, { headers });
let putResponse = await httpClient.put('VALID_URL', data, { headers });
```

If you wish to override [the axios defaults](https://github.com/axios/axios#config-defaults) and/or add your [own interceptors](https://github.com/axios/axios#interceptors),
provide an [axios instance](https://github.com/axios/axios) in the configuration object.

```typescript
import axios from 'axios';
let axiosClient = axios.create({ timeout: 3000 });
new HttpClient({ client: axiosClient });
```

### SecretsManagerTokenProvider

It uses AWS Secrets Manager to retrieve the client ID and secret and then calls the specified token endpoint the retrieve JWT.

CloudFormation to create a secret. Also allow the lambda function to access the secret by attaching `AWSSecretsManagerGetSecretValuePolicy` IAM Policy.

```yaml
Auth0Secret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Description: 'Auth0 Client ID/Secret'
    GenerateSecretString:
      SecretStringTemplate: '{"Auth0ClientID": "client_id", "Auth0ClientSecret": "client_secret"}'
      GenerateStringKey: 'Auth0ClientSecret'
```

```typescript
import {
  SecretsManagerTokenProvider,
  SecretsManagerTokenConfiguration,
} from 'lambda-essentials-ts';

const configuration: SecretsManagerTokenConfiguration = {
  clientSecretId: 'arn:aws:secretsmanager:eu-west-1:<aws_account_id>:secret:<secret_id>',
  audience: 'https://example.com/',
  tokenEndpoint: 'https://example.com/oauth/token',
};

const secretsManagerClient = new aws.SecretsManager({ region: 'eu-west-1' });
const tokenProvider = new SecretsManagerTokenProvider({
  secretsManagerClient: secretsManagerClient,
  tokenConfiguration: configuration,
});

// recommended way to retrieve token (utilizes caching and takes care of token expiration)
const accessToken = await tokenProvider.getToken();

// or bypass caching and get a new fresh token
const freshAccessToken = await tokenProvider.getTokenWithoutCache();
```

### KmsTokenProvider

It uses AWS KMS to decrypt the client secret and then calls the specified token endpoint the retrieve JWT.

```typescript
import { KmsTokenProvider, KmsTokenConfiguration } from 'lambda-essentials-ts';

const configuration: KmsTokenConfiguration = {
  clientId: 'CLIENT_ID',
  encryptedClientSecret: 'BASE64_KMS_ENCRYPTED_CLIENT_SECRET',
  audience: 'https://example.com/',
  tokenEndpoint: 'https://example.com/oauth/token',
};

const kmsClient = new aws.KMS({ region: 'eu-west-1' });
const tokenProvider = new KmsTokenProvider({
  kmsClient: kmsClient,
  tokenConfiguration: configuration,
});

// recommended way to retrieve token (utilizes caching and takes care of token expiration)
const accessToken = await tokenProvider.getToken();

// or bypass caching and get a new fresh token
const freshAccessToken = await tokenProvider.getTokenWithoutCache();
```

### Exceptions

Custom error models.

```typescript
import { ClientException } from 'lambda-essentials-ts';

throw new ClientException('My Test Service');
```

## Contribution

We value your input as part of direct feedback to us, by filing issues, or by directly contributing improvements:

1. Fork this repository
1. Create a branch
1. Contribute
1. Pull request
