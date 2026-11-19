import { ApiRequest } from '../../src/openApi/apiRequestModel';
import OpenApiWrapper from '../../src/openApi/openApiWrapper';

const mockAddCustomAttributes = jest.fn();

jest.mock('newrelic', () => ({ addCustomAttributes: mockAddCustomAttributes }), {
  virtual: true,
});

const LoggerMock = jest.fn();

describe('Open API Wrapper with New Relic tracking', () => {
  const correlationId = 'test-correlation-id';
  const principalId = 'tests-principal-id';
  const request: ApiRequest<any> = {
    headers: { 'orion-correlation-id-root': correlationId },
    httpMethod: 'GET',
    path: '/path',
    pathParameters: {},
    stageVariables: {},
    requestContext: {
      authorizer: { principalId, accessToken: 'test-access-token' },
      requestId: 'tests-request-id',
    },
    isBase64Encoded: false,
    route: '/path',
  };

  beforeEach(() => {
    LoggerMock.mockImplementation(() => ({
      log: jest.fn(),
      startInvocation: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('adds canonicalId and correlationId as custom attributes', async () => {
    const openApi = new OpenApiWrapper(new LoggerMock(), { enableNewRelicTracking: true });

    await openApi.api.requestMiddleware(request);

    expect(mockAddCustomAttributes).toHaveBeenCalledWith({
      canonicalId: principalId,
      correlationId,
    });
  });
});
