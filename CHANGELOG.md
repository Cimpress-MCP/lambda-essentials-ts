# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [2.1.0] - 2021-03-11

### Changed

- ClientException propagates the original status code and details through multiple services. E.g. instead of `error.detials?.data.details?.userDefinedProp` use `error.details?.userDefinedProp`

## [2.0.0] - 2021-03-08

### Changed

- ClientException no longer wraps details in an `error` property. Instead of `error.details?.error.userDefinedProp` use `error.details?.userDefinedProp`

## [1.2.0] - 2021-02-16

### Updated

- [IMPORTANT!] HttpClient throws serialized Axios errors through ClientExceptions.
