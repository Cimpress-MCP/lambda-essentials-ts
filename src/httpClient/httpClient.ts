import * as uuid from 'uuid';
import { URL } from 'url';
import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { IAxiosCacheAdapterOptions, setupCache } from 'axios-cache-adapter';
import * as rax from 'retry-axios';
import { RetryConfig } from 'retry-axios';
import md5 from 'md5';
import { safeJwtCanonicalIdParse, safeJsonParse, serializeAxiosError } from '../util';
import { InternalException } from '../exceptions/internalException';
import { ClientException } from '../exceptions/clientException';
import { orionCorrelationIdRoot } from '../shared';
import { createDebounceRequestAdapter } from './deduplicateRequestAdapter';

const invalidToken: string = 'Invalid token';

/**
 * Allows to specify which http data should be logged.
 */
export enum HttpLogType {
  requests = 'requests',
  responses = 'responses',
}

export default class HttpClient {
  private readonly logFunction: (...msg: any) => void;

  private readonly logOptions: HttpLogOptions;

  private readonly tokenResolverFunction?: () => Promise<string>;

  private readonly correlationIdResolverFunction?: () => string;

  private readonly client: AxiosInstance;

  private readonly enableRetry: boolean;

  private readonly enableCache: boolean;

  private readonly timeout?: number;

  private readonly clientExceptionStatusCodeMapOverride?: Record<number, number>;

  /**
   * Create a new Instance of the HttpClient
   */
  // eslint-disable-next-line complexity
  constructor(options?: HttpClientOptions) {
    // eslint-disable-next-line no-console
    this.logFunction = options?.logFunction ?? console.log;
    this.logOptions = options?.logOptions ?? { enabledLogs: [HttpLogType.requests] };
    this.tokenResolverFunction = options?.tokenResolver;
    this.correlationIdResolverFunction = options?.correlationIdResolver;
    this.enableCache = options?.enableCache ?? false;
    this.enableRetry = options?.enableRetry ?? false;
    this.timeout = options?.timeout;
    this.clientExceptionStatusCodeMapOverride = options?.clientExceptionStatusCodeMapOverride;
    this.client =
      options?.client ??
      axios.create({
        adapter: (() => {
          let adapters = axios.defaults.adapter as AxiosAdapter;
          if (this.enableCache) {
            const cache = setupCache({
              maxAge: 5 * 60 * 1000, // all items are cached for 5 minutes
              readHeaders: false, // ignore cache control headers in favor of the static 5 minutes
              readOnError: true,
              exclude: {
                query: false, // also cache requests with query parameters
              },
              ...options?.cacheOptions, // allow to overwrite the defaults except of cache-key
              key: (req) => HttpClient.generateCacheKey(req),
            });

            // debounce concurrent calls with the same cacheKey so that only one HTTP request is made
            adapters = createDebounceRequestAdapter(cache.adapter, HttpClient.generateCacheKey);
          }
          return adapters;
        })(),
      });

    if (this.enableRetry) {
      this.client.defaults.raxConfig = {
        ...options?.retryOptions,
        instance: this.client, // always attach retry-axios to the private axios client
        httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT', 'POST'], // extending the defaults to retry POST calls
        onRetryAttempt: (err) => {
          this.logFunction({
            title: 'HTTP Response Error Retry',
            level: 'INFO',
            retryAttempt: err.config?.raxConfig?.currentRetryAttempt,
            ...HttpClient.extractRequestLogData(err.config),
            error: serializeAxiosError(err),
          });
        },
      };
      // attach retry-axios
      rax.attach(this.client);
    }

    if (this.timeout) {
      this.client.defaults.timeout = this.timeout;
    }

    this.client.interceptors.request.use(
      (config) => {
        if (
          this.logOptions.enabledLogs.includes(HttpLogType.requests) &&
          (this.logOptions.enabledLogForClients === undefined ||
            this.logOptions.enabledLogForClients.includes(this.client.defaults.baseURL ?? ''))
        ) {
          this.logFunction({
            title: 'HTTP Request',
            level: 'INFO',
            ...HttpClient.extractRequestLogData(config),
          });
        }

        if (!config.url) {
          throw new InternalException('HttpClient Error: "url" must be defined');
        }
        return config;
      },
      (error: AxiosError) => {
        const serializedAxiosError = serializeAxiosError(error);
        this.logFunction({
          title: 'HTTP Request Error',
          level: 'WARN',
          ...HttpClient.extractRequestLogData(error.config),
          error: serializedAxiosError,
        });

        const hostname = error.config?.url
          ? new URL(error.config.url, error.config.baseURL).hostname
          : 'N/A';
        throw new ClientException(
          hostname,
          serializedAxiosError?.status,
          serializedAxiosError?.details,
          this.clientExceptionStatusCodeMapOverride,
        );
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        if (
          this.logOptions.enabledLogs.includes(HttpLogType.responses) &&
          (this.logOptions.enabledLogForClients === undefined ||
            this.logOptions.enabledLogForClients.includes(this.client.defaults.baseURL ?? ''))
        ) {
          this.logFunction({
            title: 'HTTP Response',
            level: 'INFO',
            ...HttpClient.extractRequestLogData(response.config),
            response: response.data,
          });
        }

        return response;
      },
      (error: AxiosError | ClientException) => {
        // when retries are configured, this middleware gets triggered for each retry
        // it changes the error object to ClientException and therefore the transformation can be run only once
        if (error instanceof ClientException) {
          throw error;
        }

        const serializedAxiosError = serializeAxiosError(error);
        if (error.message === invalidToken) {
          this.logFunction({
            title: 'HTTP call skipped due to a token error',
            level: 'INFO',
            ...HttpClient.extractRequestLogData(error.config),
            error: serializedAxiosError,
          });
        } else {
          this.logFunction({
            title: 'HTTP Response Error',
            level: 'INFO',
            ...HttpClient.extractRequestLogData(error.config),
            error: serializedAxiosError,
          });
        }

        const hostname = error.config?.url
          ? new URL(error.config.url, error.config.baseURL).hostname
          : 'N/A';
        throw new ClientException(
          hostname,
          serializedAxiosError?.status,
          serializedAxiosError?.details,
          this.clientExceptionStatusCodeMapOverride,
        );
      },
    );
  }

  private static extractRequestLogData(requestConfig?: AxiosRequestConfig): object {
    if (!requestConfig) {
      return {};
    }

    return {
      method: requestConfig.method,
      url: requestConfig.url,
      query: requestConfig.params,
      request: safeJsonParse(requestConfig.data, requestConfig.data),
      correlationId: requestConfig.headers?.[orionCorrelationIdRoot],
    };
  }

  // implemented based on https://github.com/RasCarlito/axios-cache-adapter/blob/master/src/cache.js#L77
  public static generateCacheKey(req: AxiosRequestConfig): string {
    const prefix: string = req.headers?.Authorization
      ? safeJwtCanonicalIdParse(req.headers.Authorization.replace('Bearer ', '')) ?? uuid.v4()
      : 'shared';
    const url = `${req.baseURL ? req.baseURL : ''}${req.url}`;
    const query = req.params ? JSON.stringify(req.params) : ''; // possible improvement: optimize cache-hit ratio by sorting the query params
    const key = `${prefix}/${url}${query}`;
    return `${key}${req.data ? md5(req.data) : ''}`;
  }

  /**
   * Resolves the token with the token provider and adds it to the headers
   */
  async createHeadersWithResolvedToken(
    headers: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    const newHeaders: Record<string, string> = {};
    if (this.correlationIdResolverFunction) {
      newHeaders[orionCorrelationIdRoot] = this.correlationIdResolverFunction();
    }

    if (this.tokenResolverFunction) {
      if (headers.Authorization) {
        throw new InternalException(
          'Authorization header already specified, please create a new HttpClient with a different (or without a) tokenResolver',
        );
      } else {
        const token = await this.tokenResolverFunction();
        newHeaders.Authorization = `Bearer ${token}`;
      }
    }

    return {
      ...headers,
      ...newHeaders,
    };
  }

  /**
   * Get from the given url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async get<T = any>(
    url: string,
    config: AxiosRequestConfig = { responseType: 'json' },
  ): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, {
      responseType: 'json',
      ...config,
      headers: await this.createHeadersWithResolvedToken(config.headers),
    });
  }

  /**
   * Post data to the given url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async post<T = any>(
    url: string,
    data: any,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    const headers = await this.createHeadersWithResolvedToken(config.headers);
    return this.client.post<T>(url, data, { ...config, headers });
  }

  /**
   * Put data to the given url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async put<T = any>(
    url: string,
    data: any,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    const headers = await this.createHeadersWithResolvedToken(config.headers);
    return this.client.put<T>(url, data, { ...config, headers });
  }

  /**
   * Patch data on the given url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async patch<T = any>(
    url: string,
    data: any,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    const headers = await this.createHeadersWithResolvedToken(config.headers);
    return this.client.patch<T>(url, data, { ...config, headers });
  }

  /**
   * Delete the resource on the given url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async delete<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    const headers = await this.createHeadersWithResolvedToken(config.headers);
    return this.client.delete<T>(url, { ...config, headers });
  }

  /**
   * Makes a head call to the provided url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async head<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    const headers = await this.createHeadersWithResolvedToken(config.headers);
    return this.client.head<T>(url, { ...config, headers });
  }

  /**
   * Makes an options call to the provided url. Bearer token is automatically injected if tokenResolverFunction was provided to the constructor.
   */
  async options<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    const headers = await this.createHeadersWithResolvedToken(config.headers);
    return this.client.options<T>(url, { ...config, headers });
  }
}

export interface HttpClientOptions {
  /**
   * An Axios Instance (disables caching and retrying)
   */
  client?: AxiosInstance;
  /**
   * A function that returns a bearer token
   */
  tokenResolver?: () => Promise<string>;
  /**
   * Logger function
   */
  logFunction?: (...msg) => void;
  /**
   * Logger options
   */
  logOptions?: HttpLogOptions;
  /**
   * A function that returns a correlation ID
   */
  correlationIdResolver?: () => string;
  /**
   * enable caching (false by default)
   */
  enableCache?: boolean;
  /**
   * Cache options
   * @link https://github.com/RasCarlito/axios-cache-adapter/blob/master/axios-cache-adapter.d.ts#L26
   */
  cacheOptions?: IAxiosCacheAdapterOptions;
  /**
   * Enable automatic retries
   */
  enableRetry?: boolean;
  /**
   * Retry options
   * @link https://github.com/JustinBeckwith/retry-axios/blob/v2.6.0/src/index.ts#L11
   */
  retryOptions?: RetryConfig;
  /**
   * Number of milliseconds before the request times out. Default or `0` is no time out.
   * @link https://github.com/axios/axios/blob/main/README.md#request-config
   */
  timeout?: number;
  /**
   * Override the default mapping of status code when wrapping error responses returned by dependencies into ClientException.
   * This is useful, when dependent services return incorrect status codes than then drive incorrect behavior upstream (e.g. 403 instead of 503)
   */
  clientExceptionStatusCodeMapOverride?: Record<number, number>;
}

/**
 * Log options object.
 */
export interface HttpLogOptions {
  enabledLogs: HttpLogType[];
  enabledLogForClients?: string[];
}
