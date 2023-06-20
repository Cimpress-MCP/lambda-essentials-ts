import { ApiRequest } from '../../src/openApi/apiRequestModel';
import OpenApiWrapper from '../../src/openApi/openApiWrapper';
import { ClientException, ForbiddenException, InternalException } from '../../src';
import { ApiResponse } from '../../src/openApi/apiResponseModel';

describe('Open API Wrapper', () => {
  const LoggerMock = jest.fn();
  const headers = {
    Host: 'test-host',
    'User-Agent': 'test-Agent',
    'orion-correlation-id-parent': 'test-parent',
  };
  const httpMethod = 'GET';
  const path = '/path';
  const principalId = 'tests-principal-id';
  const canonicalId = 'tests-canonical-id';
  const correlationId = 'test-correlation-id';
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
    stageVariables: {
      unit: 'test',
    },
    isBase64Encoded: false,
    route: path,
  };
  const requestWithCorrelationHeader: ApiRequest<any> = {
    ...request,
    headers: {
      ...request.headers,
      'orion-correlation-id-root': correlationId,
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
      const response = await openApi.api.requestMiddleware(request);

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
      const response = new ApiResponse(statusCode, null);

      const actual = await openApi.api.responseMiddleware(request, response);

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
          'Access-Control-Expose-Headers':
            'Location, Access-Control-Allow-Origin, orion-correlation-id-root',
          'Content-Type': 'application/hal+json',
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const response = await openApi.api.errorMiddleware(request, error);

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
          'Access-Control-Expose-Headers':
            'Location, Access-Control-Allow-Origin, orion-correlation-id-root',
          'Content-Type': 'application/hal+json',
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const actual = await openApi.api.errorMiddleware(request, exception);

      expect(actual).toEqual(expected);
      expect(logger.log).toBeCalledWith({
        level: 'ERROR',
        title: 'ErrorLogger',
        details: exception.details,
        statusCode: 500,
        message: 'Internal Server Error',
        stack: expect.any(String),
      });
    });

    test('returns 500 and logs INFO with details when ClientException exception is caught', async () => {
      const testServiceName = 'test-service-name';
      const exception = new ClientException(testServiceName, 409, { more: 'details' });
      const expected: Partial<ApiResponse> = {
        body: {
          details: exception.details,
          title: `Dependent service "${testServiceName}" returned error`,
        },
        statusCode: 503,
        headers: {
          'Access-Control-Expose-Headers':
            'Location, Access-Control-Allow-Origin, orion-correlation-id-root',
          'Content-Type': 'application/hal+json',
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const actual = await openApi.api.errorMiddleware(request, exception);

      expect(actual).toEqual(expected);
      expect(logger.log).toBeCalledWith({
        level: 'INFO',
        title: 'ErrorLogger',
        details: exception.details,
        statusCode: 503,
        message: `Dependent service "${testServiceName}" returned error`,
        originalStatusCode: 409,
        serviceName: testServiceName,
        stack: expect.any(String),
      });
    });

    test('returns correct status code and logs WARN when other than internal exception is caught', async () => {
      const exception = new ForbiddenException(message);
      const expected: Partial<ApiResponse> = {
        body: {
          details: exception.details,
          title: 'tests-error-message',
        },
        statusCode: 403,
        headers: {
          'Access-Control-Expose-Headers':
            'Location, Access-Control-Allow-Origin, orion-correlation-id-root',
          'Content-Type': 'application/hal+json',
          'orion-correlation-id-root': 'not-set',
        },
      };

      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const response = await openApi.api.errorMiddleware(request, exception);

      expect(response).toEqual(expected);
      expect(logger.log).toBeCalledWith({
        level: 'WARN',
        title: 'ErrorLogger',
        details: exception.details,
        statusCode: 403,
        message: 'tests-error-message',
        stack: expect.any(String),
      });
    });

    test('returns correlation ID from request headers in successful response headers', async () => {
      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const statusCode = 200;
      const response: ApiResponse = new ApiResponse(statusCode, null);

      const { api } = openApi;
      api.requestMiddleware(requestWithCorrelationHeader);
      const actual = await api.responseMiddleware(requestWithCorrelationHeader, response);

      expect(actual).toEqual(response.withCorrelationId(correlationId));
      expect(logger.log).toBeCalledWith({
        level: 'INFO',
        title: 'ResponseLogger',
        statusCode,
      });
    });

    test('returns correlation ID from request headers in error response headers', async () => {
      const statusCode = 500;
      const expectedResponse: ApiResponse = new ApiResponse(statusCode, {
        title: 'Internal Server Error',
      });
      const internalException = new InternalException();
      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);

      const { api } = openApi;
      api.requestMiddleware(requestWithCorrelationHeader);
      const actual = await api.errorMiddleware(requestWithCorrelationHeader, internalException);

      expect(actual).toEqual(expectedResponse.withCorrelationId(correlationId));
      expect(logger.log).toBeCalledWith({
        level: 'ERROR',
        title: 'ErrorLogger',
        statusCode,
        message: 'Internal Server Error',
        stack: expect.any(String),
      });
    });

    test('returns application/hal+json response type in successful response headers', async () => {
      const logger = new LoggerMock();
      const openApi = new OpenApiWrapper(logger);
      const statusCode = 200;
      const response: ApiResponse = new ApiResponse(statusCode, null);

      const { api } = openApi;
      const actual = await api.responseMiddleware(request, response);

      expect(actual.headers['Content-Type']).toEqual('application/hal+json');
    });
  });
});
