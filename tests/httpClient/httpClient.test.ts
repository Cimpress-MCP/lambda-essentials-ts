import axios, { AxiosHeaders, AxiosRequestConfig } from 'axios';
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

    test("doesn't add auth header if the tokenResolver is not present", async () => {
      const expectedHeaders = {};
      const httpClient = new HttpClient();
      const headers = {};

      const generatedHeader = await httpClient.createHeadersWithResolvedToken(headers);

      expect(generatedHeader).toEqual(expectedHeaders);
    });

    test.each(['Authorization', 'authorization', 'AUTHORIZATION', 'aUtHoRiZaTiOn'])(
      'rejects an existing %s header when resolving a token',
      async (header) => {
        const tokenResolver = jest.fn().mockResolvedValue(testToken);
        const httpClient = new HttpClient({ tokenResolver });

        await expect(
          httpClient.createHeadersWithResolvedToken({ [header]: 'Bearer existing-token' }),
        ).rejects.toBeInstanceOf(InternalException);
        expect(tokenResolver).not.toHaveBeenCalled();
      },
    );

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
      return { httpClient, mockAdapter, axiosInstance };
    };

    test.each<[string, string[] | undefined, string, boolean]>([
      ['omitted whitelist', undefined, 'https://evil.com', true],
      ['empty whitelist', [], 'https://valid.io', false],
      ['empty entry', [''], 'https://valid.io', false],
      ['exact match', ['valid.io', 'test.com'], 'https://valid.io', true],
      ['second whitelist entry', ['valid.io', 'test.com'], 'https://test.com', true],
      ['subdomain', ['valid.io'], 'https://a.valid.io', true],
      ['nested subdomain', ['valid.io'], 'https://a.b.valid.io', true],
      ['HTTP URL', ['valid.io'], 'http://valid.io', true],
      ['explicit port', ['valid.io'], 'https://valid.io:8080/resource', true],
      ['unlisted domain', ['valid.io', 'test.com'], 'https://evil.com', false],
      ['missing dot boundary', ['valid.io'], 'https://evilvalid.io', false],
      ['domain suffix spoof', ['valid.io'], 'https://valid.io.evil.com', false],
      ['path spoof', ['valid.io'], 'https://evil.com/valid.io', false],
      ['query spoof', ['valid.io'], 'https://evil.com/?domain=valid.io', false],
      ['empty entry cannot allow other domains', ['', 'valid.io'], 'https://evil.com.', false],
      ['empty entry does not prevent valid matches', ['', 'valid.io'], 'https://valid.io', true],
      ['mixed-case entry', ['VaLiD.Io'], 'https://valid.io', true],
      ['mixed-case hostname', ['valid.io'], 'https://VaLiD.Io', true],
      ['userinfo spoof', ['valid.io'], 'https://valid.io@evil.com', false],
      ['fragment spoof', ['valid.io'], 'https://evil.com/#valid.io', false],
      ['trailing dot', ['valid.io'], 'https://valid.io.', false],
      ['encoded hostname', ['valid.io'], 'https://%76alid.io', true],
      ['Unicode dot', ['valid.io'], 'https://sub。valid.io', true],
      ['Unicode lookalike', ['valid.io'], 'https://vаlid.io', false],
      ['punycode entry', ['xn--bcher-kva.example'], 'https://bücher.example', true],
      ['raw Unicode entry', ['bücher.example'], 'https://bücher.example', false],
      ['literal wildcard', ['*.io'], 'https://valid.io', false],
      ['IPv4 normalization', ['127.0.0.1'], 'http://127.1', true],
      ['IPv6', ['[::1]'], 'http://[::1]', true],
      ['malformed URL', ['valid.io'], 'https://[', false],
      ['relative URL without a base', ['valid.io'], '/resource', false],
    ])('%s', async (_name, whitelistedDomains, url, shouldPassToken) => {
      const { httpClient, mockAdapter } = buildHttpClient(whitelistedDomains);
      mockAdapter.onAny().reply(200, {});

      await httpClient.get(url);

      expect(mockAdapter.history.get[0].headers?.Authorization).toEqual(
        shouldPassToken ? `Bearer ${testToken}` : undefined,
      );
    });

    test.each<[string, string, AxiosRequestConfig, string, boolean]>([
      ['instance base URL', 'https://valid.io/api', {}, '/resource', true],
      [
        'request base URL override',
        'https://evil.com',
        { baseURL: 'https://valid.io' },
        '/resource',
        true,
      ],
      [
        'untrusted base URL override',
        'https://valid.io',
        { baseURL: 'https://evil.com' },
        '/resource',
        false,
      ],
      ['absolute URL override', 'https://evil.com', {}, 'https://valid.io/resource', true],
      ['untrusted absolute URL', 'https://valid.io', {}, 'https://evil.com/resource', false],
      ['protocol-relative URL', 'https://valid.io', {}, '//evil.com/resource', false],
      [
        'forced untrusted base URL',
        'https://evil.com',
        { allowAbsoluteUrls: false },
        'https://valid.io/resource',
        false,
      ],
      [
        'forced trusted base URL',
        'https://valid.io',
        { allowAbsoluteUrls: false },
        'https://evil.com/resource',
        true,
      ],
    ])('%s', async (_name, baseURL, config, url, shouldPassToken) => {
      const { httpClient, mockAdapter, axiosInstance } = buildHttpClient(['valid.io']);
      axiosInstance.defaults.baseURL = baseURL;
      mockAdapter.onAny().reply(200, {});

      await httpClient.get(url, config);

      expect(mockAdapter.history.get[0].headers?.Authorization).toEqual(
        shouldPassToken ? `Bearer ${testToken}` : undefined,
      );
    });

    test('honors allowAbsoluteUrls from instance defaults', async () => {
      const { httpClient, mockAdapter, axiosInstance } = buildHttpClient(['valid.io']);
      axiosInstance.defaults.baseURL = 'https://evil.com';
      axiosInstance.defaults.allowAbsoluteUrls = false;
      mockAdapter.onAny().reply(200, {});

      await httpClient.get('https://valid.io/resource');
      await httpClient.get('https://valid.io/resource', { allowAbsoluteUrls: true });

      expect(axiosInstance.getUri(mockAdapter.history.get[0])).toEqual(
        'https://evil.com/https://valid.io/resource',
      );
      expect(mockAdapter.history.get[0].headers?.Authorization).toBeUndefined();
      expect(mockAdapter.history.get[1].headers?.Authorization).toEqual(`Bearer ${testToken}`);
    });

    test.each(['Authorization', 'authorization', 'AUTHORIZATION'])(
      'strips a supplied %s header only for untrusted destinations',
      async (header) => {
        const axiosInstance = axios.create();
        const mockAdapter = new MockAdapter(axiosInstance);
        mockAdapter.onAny().reply(200, {});
        const httpClient = new HttpClient({
          client: axiosInstance,
          whitelistedDomains: ['valid.io'],
          logFunction: jest.fn(),
        });
        const headers = { [header]: `Bearer ${testToken}`, 'X-Custom': 'preserved' };

        await httpClient.get('https://evil.com', { headers });
        await httpClient.get('https://valid.io', { headers });

        expect(
          (mockAdapter.history.get[0].headers as AxiosHeaders).get('Authorization'),
        ).toBeUndefined();
        expect(mockAdapter.history.get[0].headers?.['X-Custom']).toEqual('preserved');
        expect((mockAdapter.history.get[1].headers as AxiosHeaders).get('Authorization')).toEqual(
          `Bearer ${testToken}`,
        );
        expect(headers[header]).toEqual(`Bearer ${testToken}`);
      },
    );

    test.each(['common', 'get'] as const)(
      'strips authorization inherited from %s defaults without mutating them',
      async (scope) => {
        const axiosInstance = axios.create();
        axiosInstance.defaults.headers[scope].authorization = `Bearer ${testToken}`;
        const mockAdapter = new MockAdapter(axiosInstance);
        mockAdapter.onAny().reply(200, {});
        const httpClient = new HttpClient({
          client: axiosInstance,
          whitelistedDomains: ['valid.io'],
          logFunction: jest.fn(),
        });

        await httpClient.get('https://evil.com');
        await httpClient.get('https://valid.io');

        expect(
          (mockAdapter.history.get[0].headers as AxiosHeaders).get('Authorization'),
        ).toBeUndefined();
        expect((mockAdapter.history.get[1].headers as AxiosHeaders).get('Authorization')).toEqual(
          `Bearer ${testToken}`,
        );
        expect(axiosInstance.defaults.headers[scope].authorization).toEqual(`Bearer ${testToken}`);
      },
    );

    test.each(['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const)(
      'enforces the whitelist for %s requests',
      async (method) => {
        const { httpClient, mockAdapter } = buildHttpClient(['valid.io']);
        mockAdapter.onAny().reply(200, {});

        await httpClient[method]('https://evil.com', {});
        await httpClient[method]('https://valid.io', {});

        expect(mockAdapter.history[method][0].headers?.Authorization).toBeUndefined();
        expect(mockAdapter.history[method][1].headers?.Authorization).toEqual(
          `Bearer ${testToken}`,
        );
      },
    );

    test.each<[string, string[] | undefined, string, boolean]>([
      ['trusted destination', ['valid.io'], 'https://valid.io/redirected', true],
      ['untrusted destination', ['valid.io'], 'https://evil.com/redirected', false],
      ['empty whitelist', [], 'https://valid.io/redirected', false],
      ['omitted whitelist', undefined, 'https://evil.com/redirected', true],
      ['malformed destination', ['valid.io'], 'https://[', false],
    ])('checks redirects with %s', async (_name, whitelistedDomains, href, shouldPassToken) => {
      const { httpClient, mockAdapter } = buildHttpClient(whitelistedDomains);
      mockAdapter.onAny().reply(200, {});
      const beforeRedirect = jest.fn((options) => {
        options.headers.Authorization = 'Bearer hook-token';
        options.headers.authorization = 'Bearer hook-token';
        options.headers.AUTHORIZATION = 'Bearer hook-token';
      });

      await httpClient.get('https://valid.io/resource', { beforeRedirect });

      const options = { href, headers: { 'X-Custom': 'preserved' } };
      const responseDetails = { headers: { location: href }, statusCode: 302 };
      const requestDetails = {
        headers: { Authorization: `Bearer ${testToken}` },
        url: 'https://valid.io/resource',
        method: 'GET',
      };
      mockAdapter.history.get[0].beforeRedirect?.(options, responseDetails, requestDetails);

      expect(beforeRedirect).toHaveBeenCalledTimes(1);
      expect(beforeRedirect).toHaveBeenCalledWith(options, responseDetails, requestDetails);
      expect(options.headers).toEqual(
        shouldPassToken
          ? {
              'X-Custom': 'preserved',
              Authorization: 'Bearer hook-token',
              authorization: 'Bearer hook-token',
              AUTHORIZATION: 'Bearer hook-token',
            }
          : { 'X-Custom': 'preserved' },
      );
    });

    test('retains the token on a trusted redirect', async () => {
      const { httpClient, mockAdapter } = buildHttpClient(['valid.io']);
      mockAdapter.onAny().reply(200, {});

      await httpClient.get('https://valid.io/resource');

      const config = mockAdapter.history.get[0];
      const options = {
        href: 'https://valid.io/redirected',
        headers: { Authorization: config.headers?.Authorization },
      };
      expect(config.beforeRedirect).toEqual(expect.any(Function));
      config.beforeRedirect?.(
        options,
        { headers: { location: options.href }, statusCode: 302 },
        { headers: {}, url: 'https://valid.io/resource', method: 'GET' },
      );

      expect(options.headers.Authorization).toEqual(`Bearer ${testToken}`);
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
