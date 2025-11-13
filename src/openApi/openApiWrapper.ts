import OpenApi from 'openapi-factory';
import * as uuid from 'uuid';
import { ApiRequest, AuthorizerContext } from './apiRequestModel';
import { ApiResponse } from './apiResponseModel';
import { Exception } from '../exceptions/exception';
import { safeJwtCanonicalIdParse, serializeObject } from '../util';
import { orionCorrelationIdRoot } from '../shared';

export interface OpenApiWrapperConfig {
  enableNewRelicTracking: boolean;
}

export default class OpenApiWrapper {
  private readonly notSet = 'not-set';

  private readonly cleared = 'cleared';

  public api: OpenApi;

  private userToken: string = this.notSet;

  private userPrincipal: string = this.notSet;

  private requestId: string = this.notSet;

  private correlationId: string = this.notSet;

  private newrelic;

  constructor(requestLogger, config?: OpenApiWrapperConfig) {
    if (config?.enableNewRelicTracking) {
      // eslint-disable-next-line global-require
      this.newrelic = require('newrelic');
    }

    this.api = new OpenApi(
      {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        requestMiddleware: async (event: object, _context: object): Promise<unknown> => {
          const request = event as ApiRequest;
          const correlationId = this.generateCorrelationId(request.headers);
          requestLogger.startInvocation(null, correlationId);

          const userData = this.determineUserData(
            request.headers,
            request.requestContext.authorizer,
          );
          this.userToken = userData.userToken ?? this.notSet;
          this.userPrincipal = userData.userPrincipal ?? this.notSet;

          this.requestId = request.requestContext.requestId;
          requestLogger.log({
            title: 'RequestLogger',
            level: 'INFO',
            body: request.body,
            headers: {
              Host: request.headers.Host,
              'User-Agent': request.headers['User-Agent'],
              'orion-correlation-id-parent': request.headers['orion-correlation-id-parent'],
              'orion-correlation-id-root': request.headers['orion-correlation-id-root'],
            },
            method: request.httpMethod,
            path: request.path,
            user: this.userPrincipal,
            query: request.multiValueQueryStringParameters,
          });

          if (config?.enableNewRelicTracking) {
            this.newrelic.addCustomAttributes({
              canonicalId: this.userPrincipal,
              correlationId,
            });
          }

          return request;
        },
        responseMiddleware: async (_request: object, responseObj: object): Promise<unknown> => {
          const response = responseObj as ApiResponse;
          requestLogger.log({
            title: 'ResponseLogger',
            level: 'INFO',
            statusCode: response.statusCode,
          });

          const { correlationId } = this;
          this.clearContext();

          return response.withCorrelationId(correlationId);
        },

        errorMiddleware: async (_event: object, errorObj: object): Promise<unknown> => {
          const error = errorObj as Exception | Error;
          const { correlationId } = this;
          this.clearContext();
          const serializedError = serializeObject(error, true);

          if (error instanceof Exception) {
            if (error.statusCode === 500) {
              requestLogger.log({ title: 'ErrorLogger', level: 'ERROR', ...serializedError });
            } else if (error.statusCode >= 400 && error.statusCode < 500) {
              requestLogger.log({ title: 'ErrorLogger', level: 'WARN', ...serializedError });
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

  private determineUserData(
    headers: Record<string, string>,
    authorizerContext?: AuthorizerContext,
  ): {
    userToken?: string;
    userPrincipal?: string;
  } {
    if (authorizerContext) {
      return {
        userPrincipal: authorizerContext.canonicalId ?? authorizerContext.principalId,
        userToken: authorizerContext.jwt ?? authorizerContext.accessToken,
      };
    }

    if (headers.Authorization) {
      const userToken = headers.Authorization.split(' ')?.[1];
      const userPrincipal = safeJwtCanonicalIdParse(userToken);

      return { userToken, userPrincipal };
    }

    return { userToken: undefined, userPrincipal: undefined };
  }
}
