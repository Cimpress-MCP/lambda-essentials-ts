# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [8.0.0-beta] - 2026-11-19

### Changed

- **BREAKING:** Minimum supported Node.js version is now 22. The library is tested on Node.js 22, 24 and 26.
- **BREAKING:** Upgrade `retry-axios` to 4. `retryOptions` is typed by the new `RetryConfig`, so `onRetryAttempt` must return a Promise and the `instance` option no longer exists.
- Upgrade `@aws-sdk/client-kms`, `@aws-sdk/client-secrets-manager`, `axios`, `axios-cache-interceptor`, `openapi-factory`, and the dev dependencies `@types/node` (26), `jest` (30), `@types/jest`, `ts-jest`, `lint-staged`, `eslint` (10), `prettier` (3) and `typescript` (6).
- Move `@types/node` to the dev dependencies, so consumers keep their own `@types/node` version.
- Replace the `uuid` dependency with Node's built-in `crypto.randomUUID()`.
- Compile with `nodenext` module resolution and an ES2023 target without DOM types. The package is still published as CommonJS.
- Replace the `@ts-ignore` around `openapi-factory` with typed middleware options. The `OpenApiModel` middlewares now return Promises.
- When `enableNewRelicTracking` is set but `newrelic` cannot be loaded, `OpenApiWrapper` logs a warning and continues without New Relic tracking.
- `createRedisStorage` now accepts any client matching the exported `RedisCacheClient` interface instead of importing types from `redis`, so consumers without `redis` installed no longer fail type-checking.
- Allow `redis` 6 as a peer dependency (`^5.10.0 || ^6.0.0`) and mark it optional, since it is only needed when using `RedisStorage`.
- Allow `newrelic` 13 and 14 as a peer dependency (`^12.0.0 || ^13.0.0 || ^14.0.0`) and mark it optional, since it is only loaded when `enableNewRelicTracking` is set.
- Run the CI build on Node.js 22, 24 and 26, and install Yarn explicitly because Node.js 25+ no longer ships Corepack.
- Publish prereleases such as `8.0.0-beta` under their own npm dist-tag (`beta`) instead of `latest`.

### Migrating from 7.x

- Use Node.js 22 or newer.
- If your service passes its own `SecretsManagerClient` or `KMSClient` to the library, upgrade your `@aws-sdk/client-secrets-manager` / `@aws-sdk/client-kms` to `^3.1172.0` or newer. Otherwise two copies of the SDK are installed and TypeScript reports the clients as incompatible.
- Use TypeScript 4.9 or newer. The published type definitions were tested on 4.9, 5.0, 5.5 and 5.9.
- If you pass `retryOptions`, update them for `retry-axios` 4: `onRetryAttempt` must return a Promise and the `instance` option no longer exists.
- If you use `createRedisStorage`, any client with `isReady`, `connect`, `get`, `set` and `del` is accepted; a `redis` 5 or 6 client works as before.
- `uuid` is no longer a dependency of this package. If your service imports `uuid` itself, keep it in your own `package.json`.

## [7.1.1] - 2026-11-19

### Changed

- Upgrade axios to 1.21.1 and axios-cache-interceptor to 1.13.0 (fixes axios and follow-redirects advisories).
- Refresh AWS SDK clients and uuid to drop vulnerable transitive dependencies (fast-xml-parser, uuid).
- Refresh transitive dev dependencies to fix Snyk findings.

## [7.1.0] - 2026-10-07

### Changed

- Add an option to provide whitelisted domains in httpClient. Auth Bearer token won't be forwarded if the urls don't belong to the whitelisted domains.

## [7.0.6] - 2026-01-19

### Changed

- Switch back to redis, fix concurrent redis connection issues

## [7.0.5] - 2026-01-14

### Changed

- Switch from redis to ioredis

## [7.0.0-beta] - 2025-11-14

### Changed

- Add 429 status code mapping
- Changed logging format. Removed the inner `message` object.
- Update packages
- Use axios-cache-interceptor instead of axios-cache-adapter

## [6.1.1] - 2025-10-27

### Changed

- TokenProviderHttpClient now uses the http client with retries as default.

## [6.1.0] - 2024-09-30

### Changed

- Preserve the original message in ClientException

## [6.0.0] - 2024-02-22

### Changed

- **[Breaking change]** Upgraded aws-sdk to v3 which has `SecretsManager` and `KMS` replaced by `SecretsManagerClient` and `KMSClient` class.
  The functionality and interface remains the same, the imports need to be changed.

## [5.4.0] - 2024-02-08

### Added

HttpClient options now accept `clientExceptionStatusCodeMapOverride` which can be used to override the default HTTP error status code mapping. This is useful e.g. when a dependent service is not following REST-ful best practices and e.g. returns a 403 when there's an intermittent network error communicating with the authorization service

## [5.3.2] - 2024-02-08

### Fixed

Error details of external HTTP error responses are propagated correctly

## [5.3.1] - 2023-10-25

### Fixed

The `getUserToken()` and `getUserPrincipal()` order was wrongly set in version `5.3.0`. The new fixed
priority order:

`getUserToken()`

1. `request.authorizerContext.jwt`
2. `request.authorizerContext.accessToken` (new)
3. `request.headers.Authorization`

`getUserPrincipal()`

1. `authorizerContext.canonicalId` (**prefer canonicalId**)
2. `authorizerContext.principalId` (new)
3. `request.headers.Authorization`

## [5.3.0] - 2023-09-07

### Changed

The `getUserToken()` and `getUserPrincipal()` methods now support multiple sources of for their values

`getUserToken()` in priority order:

1. `request.authorizerContext.accessToken` (new)
2. `request.authorizerContext.jwt`
3. `request.headers.Authorization`

`getUserPrincipal()` in priority order:

1. `authorizerContext.principalId` (new)
2. `authorizerContext.canonicalId`
3. `request.headers.Authorization`

## [5.2.2] - 2023-08-25

### Added

HttpClient now also logs unexpected (e.g. network) errors that are not coming from Axios

## [5.2.0] - 2023-06-08

### Added

Tracking of `canonicalId` and `correlationId` in New Relic.

!IMPORTANT! You must exclude the `newrelic` module from `webpack.config.ts` like so:

```
externals: ['newrelic']
```

### Added

The `DeleteRequest` model.

## [5.1.10] - 2023-01-13

### Changed

The error middleware logs `4xx` errors with log level `WARN` (previously `INFO`).

## [5.1.9] - 2023-01-04

### Changed

Upgraded jsonwebtoken version to 9.0.0 and aws-sdk to version 2.1287.0

## [5.1.8] - 2022-12-15

### Changed

Removed client_secret from API response

## [5.1.7] - 2022-12-13

### Changed

Add timeout option in HttpClient. If no value is provided the default is no timeout.

## [5.1.6] - 2022-11-30

### Changed

Removed logging of client_secret

## [5.1.5] - 2022-11-15

### Changed

The fix described in 5.1.4 missed one instance where the bug can occur. This change covers all known instances.

## [5.1.4] - 2022-11-08

### Changed

Using `baseURL` in the axios config without specifying the full URL resulted in an error in the exception handling. So the `AxiosError` was thrown instead of a customer `ClientException`.

## [5.1.3] - 2022-10-03

### Changed

RequestLogger now logs only `Host`, 'User-Agent`, `orion-correlation-id-parent`, `orion-correlation-id-root` headers.

## [5.1.2] - 2022-09-14

### Changed

Properties `stageVariables`, `isBase64Encoded` and `route` from openapi-factory are available in the Typescript definitions.

## [5.1.1] - 2022-09-05

### Changed

HttpApi payload version 2.0 events supported for openApiWrapper.

## [5.1.0] - 2022-09-05

### Changed

Dependencies aren't pinned to a fixed version to allow users of the library to independently upgrade minor (devDependencies) and patch (dependencies) versions. This will simplify fixing security alerts faster than in this library, for example by applying `npm audit fix`.

## [5.0.0] - 2022-02-22

### Changed

- **[Breaking change]** `TokenProvider` was replaced by more specific `KmsTokenProvider` class.
  The functionality and interface remains the same, the imports need to be changed.

### Added

- New `SecretsManagerTokenProvider` that relies on AWS Secrets Manager to retrieve client ID and client secret.
  The advantage of using AWS Secrets Manager is that it can be supplied with a secret rotation function.

## [4.1.5] - 2022-02-10

### Changed

`ClientException` now maps `HTTP 422` client responses to `HTTP 422` server responses (was `HTTP 503` before).

## [4.1.2] - 2021-12-02

### Changed

Expose the `Location`, `Access-Control-Allow-Origin` and `orion-correlation-id-root` headers

## [4.1.1] - 2021-11-22

### Fixed

- `ApiResponse` default content-type header was renamed to `Content-Type` to overwrite the default header
  of [openapi-factory.js](https://github.com/Rhosys/openapi-factory.js/blob/release/5.2/src/response.js#L15)
- Also upgraded `openapi-factory.js` to get support of over-writing response headers

## [4.1.0] - 2021-11-22

### Changed

- `ApiResponse` default content-type header was changed from `application/links+json` to `application/hal+json`

## [4.0.0] - 2021-11-12

### Changed

- `HttpClient` the [retryAdapterEnhancer axios adapter](https://github.com/kuitos/axios-extensions#cacheadapterenhancer)
  was replaced by the more flexible [axios-cache-adapter](https://github.com/RasCarlito/axios-cache-adapter).
- **[Breaking change]** `HttpClientOptions.cacheOptions` now accepts [extensive cache configuration](https://github.com/RasCarlito/axios-cache-adapter/blob/master/axios-cache-adapter.d.ts#L26).
- The cache is now partitioned by `canonical_id` JWT claim.

## [3.0.1] - 2021-09-13

### Fixed

- Downgraded Axios to 0.21.1 due to response interceptors not being applied correctly in 0.21.2. [There has been a fix to
  axios but a version with the fix is not available yet.](https://github.com/axios/axios/commit/83ae3830e4070adbcdcdcdd6e8afbac568afd708)

## [3.0.0] - 2021-09-10

### Changed

- `HttpClient` the [retryAdapterEnhancer axios adapter](https://github.com/kuitos/axios-extensions#retryadapterenhancer)
  was replaced by the more flexible [retry-axios interceptor](https://github.com/JustinBeckwith/retry-axios).
- **[Breaking change]** `HttpClientOptions.retryOptions` now accepts [extensive retry configuration](https://github.com/JustinBeckwith/retry-axios/blob/v2.6.0/src/index.ts#L11)
  such as specifying HTTP status codes that should be retried.
- **[Breaking change]** All HTTP status codes are no longer retried by default. The new default are these ranges:
  - [100, 199] Informational, request still processing
  - [429, 429] Too Many Requests
  - [500, 599] Server errors

## [2.2.2] - 2021-07-08

### Fixed bugs

- Some HTTP error log statements were throwing exceptions. This was due to accessing `error.request.headers[orionCorrelationIdRoot]`
  from Axios error object, where the `headers` object was `undefined`. The correct field was `error.config.headers`.

## [2.2.1] - 2021-07-08

### Changed

- `HttpClient` logs additional request data (query parameters, body).

### Added

- `HttpClientOptions` now accepts `logOptions` object that allows enabling informational request and **response (new)** logs.

```js
{
  logOptions: {
    enabledLogs: [HttpLogType.requests, HttpLogType.responses];
  }
}
```

## [2.1.0] - 2021-03-11

### Changed

- ClientException propagates the original status code and details through multiple services. E.g. instead of `error.detials?.data.details?.userDefinedProp` use `error.details?.userDefinedProp`

## [2.0.0] - 2021-03-08

### Changed

- ClientException no longer wraps details in an `error` property. Instead of `error.details?.error.userDefinedProp` use `error.details?.userDefinedProp`

## [1.2.0] - 2021-02-16

### Updated

- [IMPORTANT!] HttpClient throws serialized Axios errors through ClientExceptions.
