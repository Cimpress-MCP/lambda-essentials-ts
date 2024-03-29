import { ClientException } from '../../src';
import { SerializedAxiosError } from '../../src/util';

interface AxiosErrorTestData {
  originalStatusCode: number;
  exceptionStatusCode: number;
}

describe('ClientException', () => {
  describe('converts Axios errors', () => {
    const testServiceName = 'test-service-name';

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
    ];

    testData.map(({ exceptionStatusCode, originalStatusCode }) =>
      test(`from ${originalStatusCode} to ${exceptionStatusCode}`, () => {
        const axiosError = createError(originalStatusCode);
        const clientException = new ClientException(testServiceName, axiosError.status, axiosError);

        expect(clientException.message).toEqual(
          `Dependent service "${testServiceName}" returned error`,
        );
        expect(clientException.originalStatusCode).toEqual(originalStatusCode);
        expect(clientException.statusCode).toEqual(exceptionStatusCode);
        expect(clientException.serviceName).toEqual(testServiceName);
        expect(clientException.details).toEqual(axiosError);
      }),
    );
  });
});
