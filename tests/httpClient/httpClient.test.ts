import axios, { AxiosRequestConfig } from 'axios';
import * as uuid from 'uuid';
import md5 from 'md5';
import { InternalException } from '../../src';
import HttpClient from '../../src/httpClient/httpClient';
import MockAdapter from 'axios-mock-adapter';

describe('HttpClient', () => {
  describe('createHeadersWithResolvedToken()', () => {
    const testToken = 'unit-test-token';
    const testCorrelationId = 'test-correlation-id';

    test('adds a token', async () => {
      const expectedHeaders = {
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
      const expectedHeaders = {};
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

  describe('whitelistedDomains', () => {
    const testToken = 'unit-test-token';

    const buildHttpClient = (whitelistedDomains?: string[]) => {
      const axiosInstance = axios.create();
      const mockAdapter = new MockAdapter(axiosInstance);
      const httpClient = new HttpClient({
        client: axiosInstance,
        logFunction: jest.fn(),
        tokenResolver: jest.fn().mockResolvedValue(testToken),
        whitelistedDomains,
      });
      return { httpClient, mockAdapter };
    };

    test('passes the token to any domain when whitelistedDomains is not provided', async () => {
      const { httpClient, mockAdapter } = buildHttpClient();
      mockAdapter.onGet('https://baddomain.com/resource').reply(200, {});
      mockAdapter.onGet('https://evildomain.com/resource').reply(200, {});

      await httpClient.get('https://baddomain.com/resource');
      await httpClient.get('https://evildomain.com/resource');

      expect(mockAdapter.history.get[0].headers?.Authorization).toEqual(`Bearer ${testToken}`);
      expect(mockAdapter.history.get[1].headers?.Authorization).toEqual(`Bearer ${testToken}`);
    });

    test('passes the token to each of the whitelisted domains', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io', 'test.com']);
      mockAdapter.onGet('https://somethig.something.valid.io/resource').reply(200, {});
      mockAdapter.onGet('http://whatever.test.com/resource').reply(200, {});

      await httpClient.get('https://somethig.something.valid.io/resource');
      await httpClient.get('http://whatever.test.com/resource');

      expect(mockAdapter.history.get[0].headers?.Authorization).toEqual(`Bearer ${testToken}`);
      expect(mockAdapter.history.get[1].headers?.Authorization).toEqual(`Bearer ${testToken}`);
    });

    test('does not pass the token to a domain that is not whitelisted', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io', 'test.com']);
      mockAdapter.onGet('https://baddomain.com/resource').reply(200, {});

      await httpClient.get('https://baddomain.com/resource');

      expect(mockAdapter.history.get[0].headers?.Authorization).toBeUndefined();
    });

    test('does not pass the token to a domain that merely contains the whitelisted domain as a substring', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io']);
      mockAdapter.onGet('https://somethingvalid.io/resource').reply(200, {});

      await httpClient.get('https://somethingvalid.io/resource');

      expect(mockAdapter.history.get[0].headers?.Authorization).toBeUndefined();
    });

    test('does not pass the token to a domain that merely contains the whitelisted domain as a parameter', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io']);
      mockAdapter.onGet('https://evil.io/params?somethig.valid.io').reply(200, {});
      mockAdapter.onGet('https://evil.io/params/somethig.valid.io').reply(200, {});
      mockAdapter.onGet('https://evil.io/params/whatever=somethig.valid.io').reply(200, {});

      await httpClient.get('https://evil.io/params?somethig.valid.io');
      await httpClient.get('https://evil.io/params/somethig.valid.io');
      await httpClient.get('https://evil.io/params/whatever=somethig.valid.io');

      expect(mockAdapter.history.get[0].headers?.Authorization).toBeUndefined();
      expect(mockAdapter.history.get[1].headers?.Authorization).toBeUndefined();
      expect(mockAdapter.history.get[2].headers?.Authorization).toBeUndefined();
    });

    test('passes the token to a subdomain of a whitelisted domain', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['permited.io']);
      mockAdapter.onGet('https://valid.permited.io/resource').reply(200, {});

      await httpClient.get('https://valid.permited.io/resource');

      expect(mockAdapter.history.get[0].headers?.Authorization).toEqual(`Bearer ${testToken}`);
    });

    test('does not pass the token when trying to smuggle the whitelisted domain via the url path', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io']);
      mockAdapter.onGet('https://baddomain.com/valid.io').reply(200, {});

      await httpClient.get('https://baddomain.com/valid.io');

      expect(mockAdapter.history.get[0].headers?.Authorization).toBeUndefined();
    });

    test('should pass the token when different casing', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io']);
      mockAdapter.onGet('https://Valid.Io/resource').reply(200, {});

      await httpClient.get('https://Valid.Io/resource');

      expect(mockAdapter.history.get[0].headers?.Authorization).toEqual(`Bearer ${testToken}`);
    });
  });

  describe('generateCacheKey()', () => {
    it('key contains URL', () => {
      const request: AxiosRequestConfig = {
        url: 'testUrl',
      };
      const result = HttpClient.generateCacheKey(request);
      expect(result).toEqual('shared/testUrl');
    });

    it('key contains base URL', () => {
      const request: AxiosRequestConfig = {
        baseURL: 'base/',
        url: 'testUrl',
      };
      const result = HttpClient.generateCacheKey(request);
      expect(result).toEqual('shared/base/testUrl');
    });

    it('key contains query parameters', () => {
      const request: AxiosRequestConfig = {
        params: { key1: 'val1', key2: 'val2' },
        url: 'testUrl',
      };
      const result = HttpClient.generateCacheKey(request);
      expect(result).toEqual('shared/testUrl{"key1":"val1","key2":"val2"}');
    });

    it('key contains md5 of request body', () => {
      const request: AxiosRequestConfig = {
        data: { key1: 'val1', key2: 'val2' },
        url: 'testUrl',
      };
      const result = HttpClient.generateCacheKey(request);
      expect(result).toEqual(`shared/testUrl${md5(request.data)}`);
    });

    it('key is prefixed with JWT canonical_id', () => {
      const request: AxiosRequestConfig = {
        headers: {
          Authorization:
            'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MzY3MzM0MDMsImV4cCI6MTY2ODI2OTQwMywiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoidGVzdEB1c2VyLmNvbSIsImh0dHBzOi8vY2xhaW1zLmNpbXByZXNzLmlvL2Nhbm9uaWNhbF9pZCI6InRlc3RAdXNlci5jb20ifQ.gArhFpdphmxnQEyMNSSFfWbY3CU6IngxGhheXLNgc8w',
        },
        url: 'testUrl',
      };
      const result = HttpClient.generateCacheKey(request);
      expect(result).toEqual('test@user.com/testUrl');
    });

    it('key is prefixed with UUID when JWT is not valid', () => {
      const request: AxiosRequestConfig = {
        headers: {
          Authorization: 'Bearer invalid-jwt-token',
        },
        url: 'testUrl',
      };
      const result = HttpClient.generateCacheKey(request);
      expect(uuid.validate(result.split('/')[0])).toBeTruthy();
      expect(result.split('/')[1]).toEqual('testUrl');
    });
  });

  describe('HttpClient caching', () => {
    it('should serve subsequent requests from cache when requests are made in quick succession', async () => {
      const axiosInstance = axios.create();

      const mockAdapter = new MockAdapter(axiosInstance);
      const mockResponse = 'test-response';

      mockAdapter.onGet('https://api.example.com/data').reply(200, mockResponse);

      const httpClient = new HttpClient({
        client: axiosInstance,
        enableCache: true,
        logFunction: jest.fn(),
      });

      const url = 'https://api.example.com/data';

      const [response1, response2, response3] = await Promise.all([
        httpClient.get(url),
        httpClient.get(url),
        httpClient.get(url),
      ]);

      expect(mockAdapter.history.get.length).toBe(1);

      expect(response1.data).toEqual(mockResponse);
      expect(response2.data).toEqual(mockResponse);
      expect(response3.data).toEqual(mockResponse);
    });
  });
});
