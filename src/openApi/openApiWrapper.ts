import OpenApi from 'openapi-factory';
import jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import { ApiRequest } from './apiRequestModel';
import { ApiResponse } from './apiResponseModel';
import { Exception } from '../exceptions/exception';
import { serializeObject } from '../util';
import { orionCorrelationIdRoot } from '../shared';
import { OpenApiModel } from './openApiModel';

export default class OpenApiWrapper {
  private readonly notSet = 'not-set';

  private readonly cleared = 'cleared';

  private readonly canonicalIdKey = 'https://claims.cimpress.io/canonical_id';

  public api: OpenApiModel;

  private userToken: string = this.notSet;

  private userPrincipal: string = this.notSet;

  private requestId: string = this.notSet;

  private correlationId: string = this.notSet;

  constructor(requestLogger) {
    this.api = new OpenApi(
      {
        requestMiddleware: (request: ApiRequest): ApiRequest => {
          const correlationId = this.generateCorrelationId(request.headers);
          requestLogger.startInvocation(null, correlationId);

          // TODO: restrict the alternative way of resolving token and principal only for localhost
          this.userToken =
            request.requestContext.authorizer?.jwt ?? request.headers.Authorization?.split(' ')[1];
          this.userPrincipal =
            request.requestContext.authorizer?.canonicalId ??
            jwt.decode(this.userToken)?.[this.canonicalIdKey];
          this.requestId = request.requestContext.requestId;
          requestLogger.log({
            title: 'RequestLogger',
            level: 'INFO',
            body: request.body,
            headers: request.headers, // TODO: filter out unnecessary properties
            method: request.httpMethod,
            path: request.path,
            user: this.userPrincipal,
          });
          return request;
        },
        responseMiddleware: (request: ApiRequest, response: ApiResponse): ApiResponse => {
          requestLogger.log({
            title: 'ResponseLogger',
            level: 'INFO',
            statusCode: response.statusCode,
          });

          const { correlationId } = this;
          this.clearContext();

          return response.withCorrelationId(correlationId);
        },

        errorMiddleware: (request: ApiRequest, error: Exception | Error): ApiResponse => {
          const { correlationId } = this;
          this.clearContext();
          const serializedError = serializeObject(error);

          if (error instanceof Exception) {
            if (error.statusCode === 500) {
              requestLogger.log({ title: 'ErrorLogger', level: 'ERROR', ...serializedError });
            } else {
              requestLogger.log({ title: 'ErrorLogger', level: 'INFO', ...serializedError });
            }

            return new ApiResponse(error.statusCode, {
              title: error.message,
              details: error.details,
              errorId: requestLogger.invocationId,
            }).withCorrelationId(correlationId);
          }

          requestLogger.log({ title: 'ErrorLogger', level: 'CRITICAL', ...serializedError });

          return new ApiResponse(500, {
            title: 'Unexpected error',
            details: serializedError,
            errorId: requestLogger.invocationId,
          }).withCorrelationId(correlationId);
        },
      },
      () => {},
    );

    // This helps the destructuring of OpenApiWrapper's props to not lose context
    this.getUserToken = this.getUserToken.bind(this);
    this.getRequestId = this.getRequestId.bind(this);
    this.getUserPrincipal = this.getUserPrincipal.bind(this);
    this.getCorrelationId = this.getCorrelationId.bind(this);
  }

  public getUserToken() {
    return this.userToken;
  }

  public getRequestId() {
    return this.requestId;
  }

  public getUserPrincipal() {
    return this.userPrincipal;
  }

  public getCorrelationId() {
    return this.correlationId;
  }

  private clearContext() {
    this.userToken = this.cleared;
    this.requestId = this.cleared;
    this.userPrincipal = this.cleared;
    this.correlationId = this.cleared;
  }

  private generateCorrelationId(headers: Record<string, string>) {
    const existingCorrelationId = headers[orionCorrelationIdRoot];
    this.correlationId = existingCorrelationId ?? uuid.v4();
    return this.correlationId;
  }
}
