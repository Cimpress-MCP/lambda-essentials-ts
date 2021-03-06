# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

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
