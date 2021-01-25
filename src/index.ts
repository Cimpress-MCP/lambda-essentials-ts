import HttpClient, { HttpClientOptions } from './httpClient/httpClient';
import Logger, { LoggerConfiguration, SuggestedLogObject } from './logger/logger';
import OpenApiWrapper from './openApi/openApiWrapper';
import { ApiResponse } from './openApi/apiResponseModel';
import { ApiRequest, GetRequest, PostRequest, PutRequest } from './openApi/apiRequestModel';
import TokenProvider, {
  TokenConfiguration,
  TokenProviderOptions,
  TokenProviderHttpClient,
} from './tokenProvider/tokenProvider';
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
  TokenProvider,
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
  ApiRequest,
  GetRequest,
  PostRequest,
  PutRequest,
  TokenConfiguration,
  TokenProviderOptions,
  TokenProviderHttpClient,
};
