import { ApiRequest } from '../../src/openApi/apiRequestModel';
import OpenApiWrapper from '../../src/openApi/openApiWrapper';

jest.mock(
  'newrelic',
  () => {
    throw new Error("Cannot find module 'newrelic'");
  },
  { virtual: true },
);

const LoggerMock = jest.fn();

describe('Open API Wrapper when New Relic cannot be loaded', () => {
  const request: ApiRequest<any> = {
    headers: {},
    httpMethod: 'GET',
    path: '/path',
    pathParameters: {},
    stageVariables: {},
    requestContext: {
      authorizer: { principalId: 'tests-principal-id', accessToken: 'test-access-token' },
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

  test('logs a warning and continues without tracking', async () => {
    const logger = new LoggerMock();
    const openApi = new OpenApiWrapper(logger, { enableNewRelicTracking: true });

    const response = await openApi.api.requestMiddleware(request);

    expect(response).toEqual(request);
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'NewRelicTracking',
        level: 'WARN',
        message: 'New Relic could not be loaded, continuing without New Relic tracking',
      }),
    );
  });
});
