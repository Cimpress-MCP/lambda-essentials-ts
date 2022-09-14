# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

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
