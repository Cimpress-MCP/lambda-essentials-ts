import { ApiRequest, GetRequest, PatchRequest, PostRequest, PutRequest } from './apiRequestModel';
import { ApiResponse } from './apiResponseModel';
import { Exception } from '../exceptions/exception';

export interface OpenApiModel {
  get: ApiControllerRoute<GetRequest>;
  post: ApiControllerRoute<PostRequest>;
  put: ApiControllerRoute<PutRequest>;
  patch: ApiControllerRoute<PatchRequest>;

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

export type ApiControllerRoute<T = ApiRequest> = (
  path: string,
  handler: (request: T) => Promise<ApiResponse>,
) => void;

export type RequestMiddleware = (request: ApiRequest) => ApiRequest;
export type ResponseMiddleware = (request: ApiRequest, response: ApiResponse) => ApiResponse;
export type ErrorMiddleware = (request: ApiRequest, error: Exception | Error) => ApiResponse;
