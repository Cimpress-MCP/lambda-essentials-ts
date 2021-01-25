import jwtManager from 'jsonwebtoken';
import { KMS } from 'aws-sdk';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export default class TokenProvider {
  private httpClient: TokenProviderHttpClient;

  private kmsClient: KMS;

  private configuration: TokenConfiguration;

  private currentTokenPromise?: Promise<string>;

  /**
   * Create a new Instance of the TokenProvider
   */
  constructor(options: TokenProviderOptions) {
    this.httpClient = options.httpClient ?? axios.create();

    if (!options.kmsClient) {
      throw new Error('KMS Client is missing');
    }
    this.kmsClient = options.kmsClient;

    const configuration = options.tokenConfiguration;
    if (!configuration?.clientId) {
      throw new Error('Configuration error: missing required property "clientId"');
    }
    if (!configuration?.encryptedClientSecret) {
      throw new Error('Configuration error: missing required property "encryptedClientSecret"');
    }
    if (!configuration?.audience) {
      throw new Error('Configuration error: missing required property "audience"');
    }
    if (!configuration?.tokenEndpoint) {
      throw new Error('Configuration error: missing required property "tokenEndpoint"');
    }
    this.configuration = configuration;
  }

  /**
   * Get access token. Subsequent calls are cached and the token is renewed only if it is expired.
   */
  async getToken(): Promise<string> {
    if (!this.currentTokenPromise) {
      this.currentTokenPromise = this.getTokenWithoutCache();
      return this.currentTokenPromise;
    }

    try {
      const jwtToken = await this.currentTokenPromise;
      // lower the token expiry time by 10s so that the returned token will be not immediately expired
      if (!jwtToken || jwtManager.decode(jwtToken)?.['exp'] < Date.now() / 1000 - 10) {
        this.currentTokenPromise = this.getTokenWithoutCache();
      }
      return this.currentTokenPromise;
    } catch (error) {
      this.currentTokenPromise = this.getTokenWithoutCache();
      return this.currentTokenPromise;
    }
  }

  /**
   * Get access token.
   */
  async getTokenWithoutCache(): Promise<string> {
    const secret = await this.kmsClient
      .decrypt({ CiphertextBlob: Buffer.from(this.configuration.encryptedClientSecret, 'base64') })
      .promise()
      .then((data) => data.Plaintext?.toString());
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const body = {
      client_id: this.configuration.clientId,
      client_secret: secret,
      audience: this.configuration.audience,
      grant_type: 'client_credentials',
    };
    const response = await this.httpClient.post<TokenEndpointResponse>(
      this.configuration.tokenEndpoint,
      body,
      { headers },
    );
    return response.data.access_token;
  }
}

export interface TokenProviderOptions {
  /**
   * Either an Axios instance or an @atsquad/httpclient instance, by default it creates an axios instance
   */
  httpClient?: TokenProviderHttpClient;
  /**
   * AWS KMS Client
   */
  kmsClient: KMS;
  /**
   * Configuration needed for the token
   */
  tokenConfiguration: TokenConfiguration;
}

export interface TokenConfiguration {
  /**
   * Username or ClientId
   */
  clientId: string;
  /**
   * KMS Encrypted client secret
   */
  encryptedClientSecret: string;
  audience: string;
  tokenEndpoint: string;
}

export interface TokenProviderHttpClient {
  post<T = any>(url: string, data: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

interface TokenEndpointResponse {
  access_token: string;
}
