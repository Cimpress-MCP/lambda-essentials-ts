import { URL } from 'url';
import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import cacheAdapterEnhancer, {
  Options as CacheOptions,
} from 'axios-extensions/lib/cacheAdapterEnhancer';
import retryAdapterEnhancer, {
  Options as RetryOptions,
} from 'axios-extensions/lib/retryAdapterEnhancer';
import { serializeAxiosError } from '../util';
import { InternalException } from '../exceptions/internalException';
import { ClientException } from '../exceptions/clientException';
import { orionCorrelationIdRoot } from '../shared';

const invalidToken: string = 'Invalid token';

/**
 * Allows to specify which http data should be logged.
 */
export enum LogData {
  requests = 'requests',
  responses = 'responses',
}

export default class HttpClient {
  private readonly logFunction: (...msg: any) => void;

  private readonly logOptions: LogOptions;

  private readonly tokenResolverFunction?: () => Promise<string>;

  private readonly correlationIdResolverFunction?: () => string;

  private readonly client: AxiosInstance;

  private readonly enableRetry: boolean;

  private readonly enableCache: boolean;

  /**
   * Create a new Instance of the HttpClient
   */
  constructor(options?: HttpClientOptions) {
    // eslint-disable-next-line no-console
    this.logFunction = options?.logFunction ?? console.log;
    this.logOptions = options?.logOptions ?? { logData: [] };
    this.tokenResolverFunction = options?.tokenResolver;
    this.correlationIdResolverFunction = options?.correlationIdResolver;
    this.enableCache = options?.enableCache ?? false;
    this.enableRetry = options?.enableRetry ?? false;
    this.client =
      options?.client ??
      axios.create({
        adapter: (() => {
          let adapters = axios.defaults.adapter as AxiosAdapter;
          if (this.enableCache) {
            adapters = cacheAdapterEnhancer(adapters, options?.cacheOptions);
          }
          if (this.enableRetry) {
            adapters = retryAdapterEnhancer(adapters, options?.retryOptions);
          }
          return adapters;
        })(),
      });

    this.client.interceptors.request.use(
      (config) => {
        if (this.logOptions.logData.includes(LogData.requests)) {
          this.logFunction({
            title: 'HTTP Request',
            level: 'INFO',
            method: config.method,
            url: config.url,
            query: config.params,
            body: config.data,
            correlationId: config.headers[orionCorrelationIdRoot],
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
          error: serializedAxiosError,
          correlationId: error.request.headers[orionCorrelationIdRoot],
        });

        const hostname = error.config?.url ? new URL(error.config.url).hostname : 'N/A';
        throw new ClientException(
          hostname,
          serializedAxiosError?.status,
          serializedAxiosError?.details,
        );
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        if (this.logOptions.logData.includes(LogData.responses)) {
          let parsedRequestBody;
          if (response.config.data) {
            try {
              parsedRequestBody = JSON.parse(response.config.data);
            } catch (e) {
              parsedRequestBody = response.config.data;
            }
          }

          this.logFunction({
            title: 'HTTP Response',
            level: 'INFO',
            method: response.config.method,
            url: response.config.url,
            query: response.config.params,
            request: parsedRequestBody,
            response: response.data,
            correlationId: response.config.headers[orionCorrelationIdRoot],
          });
        }

        return response;
      },
      (error: AxiosError) => {
        const serializedAxiosError = serializeAxiosError(error);
        if (error.message === invalidToken) {
          this.logFunction({
            title: 'HTTP call skipped due to a token error',
            level: 'INFO',
            error: serializedAxiosError,
            correlationId: error.request.headers[orionCorrelationIdRoot],
          });
        } else {
          this.logFunction({
            title: 'HTTP Response Error',
            level: 'INFO',
            error: serializedAxiosError,
            correlationId: error.request.headers[orionCorrelationIdRoot],
          });
        }

        const hostname = error.config?.url ? new URL(error.config.url).hostname : 'N/A';
        throw new ClientException(
          hostname,
          serializedAxiosError?.status,
          serializedAxiosError?.details,
        );
      },
    );
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
  logOptions?: LogOptions;
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
   * @link https://github.com/kuitos/axios-extensions#cacheadapterenhancer
   */
  cacheOptions?: CacheOptions;
  /**
   * Enable automatic retries
   */
  enableRetry?: boolean;
  /**
   * Retry options
   * @link https://github.com/kuitos/axios-extensions#cacheadapterenhancer
   */
  retryOptions?: RetryOptions;
}

/**
 * Log options object.
 */
export interface LogOptions {
  logData: LogData[];
}
