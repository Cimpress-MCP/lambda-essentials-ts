import { ApiRequest, GetRequest, PatchRequest, PostRequest, PutRequest } from './apiRequestModel';
import { ApiResponse } from './apiResponseModel';
import { Exception } from '../exceptions/exception';

export interface OpenApiModel {
  get<T>(path: string, handler: (request: GetRequest<T>) => ApiResponse): void;
  post<T>(path: string, handler: (request: PostRequest<T>) => ApiResponse): void;
  put<T>(path: string, handler: (request: PutRequest<T>) => ApiResponse): void;
  patch<T>(path: string, handler: (request: PatchRequest<T>) => ApiResponse): void;
  delete<T>(path: string, handler: (request: ApiRequest<T>) => ApiResponse): void;

  head<T>(path: string, handler: (request: ApiRequest<T>) => ApiResponse): void;
  options<T>(path: string, handler: (request: ApiRequest<T>) => ApiResponse): void;
  any<T>(path: string, handler: (request: ApiRequest<T>) => ApiResponse): void;

  setAuthorizer(authorizerFunc: (req?: any) => Promise<any>): void;
  onEvent(onEventFunc: (req?: any) => Promise<any>): void;
  onSchedule(onScheduleFunc: (req?: any) => Promise<any>): void;
  handler(event: object, context: object): Promise<any>;

  requestMiddleware: RequestMiddleware;
  responseMiddleware: ResponseMiddleware;
  errorMiddleware: ErrorMiddleware;

  constructor(
    options: {
      requestMiddleware: RequestMiddleware;
      responseMiddleware: ResponseMiddleware;
      errorMiddleware: ErrorMiddleware;
    },
    overrideLogger?: () => void,
  );
}

export type RequestMiddleware = (request: ApiRequest<any>) => ApiRequest<any>;
export type ResponseMiddleware = (request: ApiRequest<any>, response: ApiResponse) => ApiResponse;
export type ErrorMiddleware = (
  request: ApiRequest<unknown>,
  error: Exception | Error,
) => ApiResponse;
