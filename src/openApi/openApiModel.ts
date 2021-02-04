import { ApiRequest } from './apiRequestModel';
import { ApiResponse } from './apiResponseModel';

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
}

export type ApiControllerRoute = (
  path: string,
  handler: (request?: ApiRequest<any>) => ApiResponse,
) => void;
