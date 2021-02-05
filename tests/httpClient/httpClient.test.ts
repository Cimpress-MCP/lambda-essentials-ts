import { InternalException } from '../../src';
import HttpClient from '../../src/httpClient/httpClient';

describe('createHeadersWithResolvedToken()', () => {
  const testToken = 'unit-test-token';
  const testCorrelationId = 'test-correlation-id';

  test('adds a token and correlation ID', async () => {
    const expectedHeaders = {
      'orion-correlation-id-root': expect.any(String),
      Authorization: `Bearer ${testToken}`,
    };
    const tokenResolverFunctionMock = jest.fn().mockResolvedValue(testToken);

    const httpClient = new HttpClient({
      logFunction: () => {},
      tokenResolver: tokenResolverFunctionMock,
    });
    const generatedHeader = await httpClient.createHeadersWithResolvedToken({});

    expect(generatedHeader).toEqual(expectedHeaders);
  });

  test('errors when there is an auth header set', async () => {
    const tokenResolverFunctionMock = jest.fn().mockResolvedValue(testToken);

    const httpClient = new HttpClient({
      logFunction: () => {},
      tokenResolver: tokenResolverFunctionMock,
    });

    const headers = {
      Authorization: 'Bearer abc',
    };
    await expect(httpClient.createHeadersWithResolvedToken(headers)).rejects.toBeInstanceOf(
      InternalException,
    );
  });

  test("doesn't add auth header if the tokenResolver is not present", async () => {
    const expectedHeaders = {
      'orion-correlation-id-root': expect.any(String),
    };
    const httpClient = new HttpClient();
    const headers = {};

    const generatedHeader = await httpClient.createHeadersWithResolvedToken(headers);

    expect(generatedHeader).toEqual(expectedHeaders);
  });

  test('preserves correlation ID passed in constructor', async () => {
    const expectedHeaders = {
      'orion-correlation-id-root': testCorrelationId,
    };
    const httpClient = new HttpClient({ correlationIdResolver: () => testCorrelationId });
    const headers = {};

    const generatedHeader = await httpClient.createHeadersWithResolvedToken(headers);

    expect(generatedHeader).toEqual(expectedHeaders);
  });
});
