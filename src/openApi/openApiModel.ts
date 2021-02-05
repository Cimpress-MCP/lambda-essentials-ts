import { ApiRequest } from './apiRequestModel';
import { ApiResponse } from './apiResponseModel';
import { Exception } from '../exceptions/exception';

export interface OpenApiModel {
  get: ApiControllerRoute;
  post: ApiControllerRoute;
  put: ApiControllerRoute;
  patch: ApiControllerRoute;
  delete: ApiControllerRoute;
  head: ApiControllerRoute;
  options: ApiControllerRoute;
  any: ApiControllerRoute;

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

export type ApiControllerRoute = (
  path: string,
  handler: (request?: ApiRequest<any>) => ApiResponse,
) => void;

export type RequestMiddleware = (request: ApiRequest<any>) => ApiRequest<any>;
export type ResponseMiddleware = (request: ApiRequest<any>, response: ApiResponse) => ApiResponse;
export type ErrorMiddleware = (
  request: ApiRequest<unknown>,
  error: Exception | Error,
) => ApiResponse;
