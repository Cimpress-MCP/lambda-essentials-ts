import { ApiRequest } from '../../src/openApi/apiRequestModel';
import OpenApiWrapper from '../../src/openApi/openApiWrapper';
import { ForbiddenException, InternalException } from '../../src';
import { ApiResponse } from '../../src/openApi/apiResponseModel';

describe('Open API Wrapper', () => {
  const LoggerMock = jest.fn();

  const headers = {};
  const httpMethod = 'GET';
  const path = '/path';
  const principalId = 'tests-principal-id';
  const canonicalId = 'tests-canonical-id';
  const request: ApiRequest<any> = {
    headers,
    httpMethod,
    path,
    pathParameters: { param: 'param' },
    requestContext: {
      authorizer: {
        canonicalId,
        jwt: 'tests-jwt',
        principalId,
      },
      requestId: 'tests-request-id',
    },
  };

  beforeEach(() => {
    LoggerMock.mockImplementation(() => ({
      log: jest.fn(),
      startInvocation: jest.fn(),
    }));
  });

  describe('requestMiddleware', () => {
    test('returns request and logs request details', async () => {
      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const response = openApi.api.requestMiddleware(request);

      expect(response).toEqual(request);
      expect(logger.log).toBeCalledWith({
        level: 'INFO',
        title: 'RequestLogger',
        method: httpMethod,
        user: canonicalId,
        path,
        headers,
      });
    });
  });

  describe('responseMiddleware', () => {
    test('returns response and logs INFO', async () => {
      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const statusCode = 200;
      const response: Partial<ApiResponse> = {
        statusCode,
      };

      const actual = openApi.api.responseMiddleware(request, response);

      expect(actual).toEqual(response);
      expect(logger.log).toBeCalledWith({
        level: 'INFO',
        title: 'ResponseLogger',
        statusCode,
      });
    });
  });

  describe('errorMiddleware', () => {
    const message = 'tests-error-message';
    const error = new Error(message);

    test('returns 500 and logs CRITICAL when unexpected error is caught', async () => {
      const expected: Partial<ApiResponse> = {
        body: {
          details: {
            message,
            stack: expect.any(String),
          },
          title: 'Unexpected error',
        },
        statusCode: 500,
        headers: {
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const response = openApi.api.errorMiddleware(request, error);

      expect(response).toEqual(expected);
      expect(logger.log).toBeCalledWith({
        level: 'CRITICAL',
        title: 'ErrorLogger',
        message,
        stack: expect.any(String),
      });
    });

    test('returns 500 and logs ERROR when internal exception is caught', async () => {
      const exception = new InternalException(error);
      const expected: Partial<ApiResponse> = {
        body: {
          details: exception.details,
          title: 'Internal Server Error',
        },
        statusCode: 500,
        headers: {
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const actual = openApi.api.errorMiddleware(request, exception);

      expect(actual).toEqual(expected);
      expect(logger.log).toBeCalledWith({
        level: 'ERROR',
        title: 'ErrorLogger',
        details: exception.details,
        statusCode: 500,
      });
    });

    test('returns correct status code and logs INFO when other than internal exception is caught', async () => {
      const exception = new ForbiddenException(message);
      const expected: Partial<ApiResponse> = {
        body: {
          details: exception.details,
          title: 'tests-error-message',
        },
        statusCode: 403,
        headers: {
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const response = openApi.api.errorMiddleware(request, exception);

      expect(response).toEqual(expected);
      expect(logger.log).toBeCalledWith({
        level: 'INFO',
        title: 'ErrorLogger',
        details: exception.details,
        statusCode: 403,
      });
    });

    test('returns correlation ID from request headers in resposne headers', async () => {
      // TBD
    });
  });
});
