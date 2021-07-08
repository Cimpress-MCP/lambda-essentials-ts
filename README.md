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

### TokenProvider

It uses AWS KMS to decrypt the client secret and then calls the specified token endpoint the retrieve JWT.

```typescript
import axios from 'axios';
import { TokenProvider, TokenConfiguration } from 'lambda-essentials-ts';

const configuration: TokenConfiguration = {
  clientId: 'CLIENT_ID',
  encryptedClientSecret: 'BASE64_KMS_ENCRYPTED_CLIENT_SECRET',
  audience: 'https://example.com/',
  tokenEndpoint: 'https://example.com/oauth/token',
};

const kmsClient = new aws.KMS({ region: 'eu-west-1' });
const tokenProvider = new TokenProvider({
  httpClient: axios.create(),
  kmsClient: kmsClient,
  tokenConfiguration: configuration,
});

// recommended way to retrieve token (utilizes caching and takes care of token expiration)
let accessToken = await tokenProvider.getToken();

// or bypass caching and get new token
accessToken = await tokenProvider.getTokenWithoutCache();
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
