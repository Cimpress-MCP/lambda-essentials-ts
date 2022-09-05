import jwtManager from 'jsonwebtoken';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export default abstract class TokenProvider {
  private httpClient: TokenProviderHttpClient;

  private configuration: TokenConfiguration;

  private currentTokenPromise?: Promise<string>;

  /**
   * Create a new Instance of the TokenProvider
   */
  protected constructor(options: TokenProviderOptions) {
    this.httpClient = options.httpClient ?? axios.create();
    this.configuration = options.tokenConfiguration;
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
      if (!jwtToken || jwtManager.decode(jwtToken)?.exp < Date.now() / 1000 - 10) {
        this.currentTokenPromise = this.getTokenWithoutCache();
      }
      return await this.currentTokenPromise;
    } catch (error) {
      this.currentTokenPromise = this.getTokenWithoutCache();
      return this.currentTokenPromise;
    }
  }

  /**
   * Get access token.
   */
  async getTokenWithoutCache(): Promise<string> {
    const secret = await this.getClientSecret();
    if (!secret?.Auth0ClientID || !secret.Auth0ClientSecret) {
      throw new Error('Request error: failed to retrieve Auth0 Client ID/Secret');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const body = {
      client_id: secret.Auth0ClientID,
      client_secret: secret.Auth0ClientSecret,
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

  public abstract getClientSecret(): Promise<Auth0Secret | undefined>;
}

export interface Auth0Secret {
  Auth0ClientID: string;
  Auth0ClientSecret: string;
}

export interface TokenProviderOptions {
  /**
   * Either an Axios instance or an @atsquad/httpclient instance, by default it creates an axios instance
   */
  httpClient?: TokenProviderHttpClient;
  /**
   * Configuration needed for the token
   */
  tokenConfiguration: TokenConfiguration;
}

export interface TokenConfiguration {
  audience: string;
  tokenEndpoint: string;
}

export interface TokenProviderHttpClient {
  post<T = any>(url: string, data: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

interface TokenEndpointResponse {
  access_token: string;
}
