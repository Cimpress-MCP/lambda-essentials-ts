import HttpClient, {
  HttpClientOptions,
  HttpLogOptions,
  HttpLogType,
} from './httpClient/httpClient';
import Logger, { LoggerConfiguration, SuggestedLogObject } from './logger/logger';
import OpenApiWrapper from './openApi/openApiWrapper';
import { ApiResponse } from './openApi/apiResponseModel';
import { ApiRequest, GetRequest, PostRequest, PutRequest } from './openApi/apiRequestModel';
import TokenProvider, {
  TokenConfiguration,
  TokenProviderOptions,
  TokenProviderHttpClient,
} from './tokenProvider/tokenProvider';
import KmsTokenProvider, {
  KmsTokenProviderOptions,
  KmsTokenConfiguration,
} from './tokenProvider/kmsTokenProvider';
import SecretsManagerTokenProvider, {
  SecretsManagerTokenProviderOptions,
  SecretsManagerTokenConfiguration,
} from './tokenProvider/secretsManagerTokenProvider';
import { ClientException } from './exceptions/clientException';
import { ConflictException } from './exceptions/conflictException';
import { Exception } from './exceptions/exception';
import { ForbiddenException } from './exceptions/forbiddenException';
import { InternalException } from './exceptions/internalException';
import { InvalidDataException } from './exceptions/invalidDataException';
import { NotFoundException } from './exceptions/notFoundException';
import { ValidationException } from './exceptions/validationException';
import { serializeObject, serializeAxiosError } from './util';

export {
  Logger,
  OpenApiWrapper,
  ApiResponse,
  HttpClient,
  HttpLogType,
  TokenProvider,
  KmsTokenProvider,
  SecretsManagerTokenProvider,
  ValidationException,
  NotFoundException,
  InvalidDataException,
  InternalException,
  ForbiddenException,
  Exception,
  ConflictException,
  ClientException,
  serializeObject,
  serializeAxiosError,
};

export type {
  LoggerConfiguration,
  SuggestedLogObject,
  HttpClientOptions,
  HttpLogOptions,
  ApiRequest,
  GetRequest,
  PostRequest,
  PutRequest,
  TokenConfiguration,
  TokenProviderOptions,
  TokenProviderHttpClient,
  KmsTokenProviderOptions,
  KmsTokenConfiguration,
  SecretsManagerTokenProviderOptions,
  SecretsManagerTokenConfiguration,
};
