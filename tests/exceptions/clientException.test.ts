import { ClientException } from '../../src';
import { SerializedAxiosError } from '../../src/util';

interface AxiosErrorTestData {
  originalStatusCode: number;
  exceptionStatusCode: number;
}

describe('ClientException', () => {
  const testServiceName = 'test-service-name';

  describe('converts Axios errors', () => {
    const createError = (status: number): SerializedAxiosError => ({
      status,
      details: [],
    });

    const testData: AxiosErrorTestData[] = [
      {
        originalStatusCode: 400,
        exceptionStatusCode: 422,
      },
      {
        originalStatusCode: 401,
        exceptionStatusCode: 401,
      },
      {
        originalStatusCode: 403,
        exceptionStatusCode: 403,
      },
      {
        originalStatusCode: 404,
        exceptionStatusCode: 422,
      },
      {
        originalStatusCode: 422,
        exceptionStatusCode: 422,
      },
      {
        originalStatusCode: 429,
        exceptionStatusCode: 429,
      },
    ];

    testData.map(({ exceptionStatusCode, originalStatusCode }) =>
      test(`from ${originalStatusCode} to ${exceptionStatusCode}`, () => {
        const axiosError = createError(originalStatusCode);
        const clientException = new ClientException(testServiceName, axiosError.status, axiosError);

        expect(clientException.message).toEqual(
          `Dependent service "${testServiceName}" returned error: Unknown error`,
        );
        expect(clientException.originalStatusCode).toEqual(originalStatusCode);
        expect(clientException.statusCode).toEqual(exceptionStatusCode);
        expect(clientException.serviceName).toEqual(testServiceName);
        expect(clientException.details).toEqual(axiosError);
      }),
    );
  });

  describe('clientExceptionStatusCodeMapOverride', () => {
    test('overrides default client exception status code mapping with clientExceptionStatusCodeMapOverride', async () => {
      const expectedStatusCode = 503;
      const originalStatusCode = 403;
      const axiosError: SerializedAxiosError = {
        status: originalStatusCode,
        details: [],
        message: 'test-message',
      };
      const clientExceptionStatusCodeMapOverride = {
        403: 503,
      };

      const clientException = new ClientException(
        testServiceName,
        axiosError.status,
        axiosError,
        axiosError.message,
        clientExceptionStatusCodeMapOverride,
      );

      expect(clientException.message).toEqual(
        `Dependent service "${testServiceName}" returned error: test-message`,
      );
      expect(clientException.originalStatusCode).toEqual(originalStatusCode);
      expect(clientException.statusCode).toEqual(expectedStatusCode);
    });
  });
});
