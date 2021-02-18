import { ClientException } from '../../src';
import { SerializedError } from '../../src/util';

interface AxiosErrorTestData {
  originalStatusCode: number;
  exceptionStatusCode: number;
}

describe('ClientException', () => {
  describe('converts Axios errors', () => {
    const testServiceName = 'test-service-name';

    const createError = (status: number): SerializedError => ({
      status,
      statusText: 'Test',
      data: [],
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
    ];

    testData.map(({ exceptionStatusCode, originalStatusCode }) =>
      test(`from ${originalStatusCode} to ${exceptionStatusCode}`, () => {
        const axiosError = createError(originalStatusCode);
        const clientException = new ClientException(testServiceName, axiosError);

        expect(clientException.message).toEqual('Dependent service returned error');
        expect(clientException.originalStatusCode).toEqual(originalStatusCode);
        expect(clientException.statusCode).toEqual(exceptionStatusCode);
        expect(clientException.details).toEqual({
          serviceName: testServiceName,
          error: axiosError,
        });
      }),
    );
  });
});
