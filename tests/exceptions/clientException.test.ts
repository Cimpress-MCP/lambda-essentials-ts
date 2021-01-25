import { AxiosError } from 'axios';
import { ClientException } from '../../src';

interface AxiosErrorTestData {
  originalStatusCode: number;
  exceptionStatusCode: number;
}

describe('ClientException', () => {
  describe('converts Axios errors', () => {
    const testServiceName = 'test-service-name';

    const createAxiosError = (status: number): AxiosError => ({
      isAxiosError: true,
      config: {},
      toJSON: () => ({}),
      name: 'test axios error name',
      message: 'test axios error message',
      response: {
        config: {},
        headers: {},
        request: {},
        data: {},
        statusText: 'test axios error status text',
        status,
      },
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
        const axiosError = createAxiosError(originalStatusCode);
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
