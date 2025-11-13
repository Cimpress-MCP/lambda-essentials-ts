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
