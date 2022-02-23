import TokenProvider, {
  Auth0Secret,
  TokenConfiguration,
  TokenProviderHttpClient,
  TokenProviderOptions,
} from '../../src/tokenProvider/tokenProvider';

class TestTokenProvider extends TokenProvider {
  private readonly getClientSecretResponse?: Auth0Secret;

  constructor(options: TokenProviderOptions, getClientSecretResponse?: Auth0Secret) {
    super(options);
    this.getClientSecretResponse = getClientSecretResponse;
  }

  public async getClientSecret(): Promise<Auth0Secret | undefined> {
    return Promise.resolve(this.getClientSecretResponse);
  }
}

describe('Token Provider', () => {
  const tokenConfiguration: TokenConfiguration = {
    audience: 'https://example.com/',
    tokenEndpoint: 'https://example.com/oauth/token',
  };

  describe('getTokenWithoutCache', () => {
    test('throws when secret was not retrieved with all required properties', async () => {
      const tokenProvider = new TestTokenProvider(
        { tokenConfiguration },
        {
          Auth0ClientID: 'test-client-id',
          Auth0ClientSecret: '',
        },
      );
      await expect(tokenProvider.getTokenWithoutCache()).rejects.toThrowError(
        'Request error: failed to retrieve Auth0 Client ID/Secret',
      );
    });

    test('returns access token retrieved from tokenEndpoint', async () => {
      const auth0Secret: Auth0Secret = {
        Auth0ClientID: 'test-client-id',
        Auth0ClientSecret: 'test-client-secret',
      };
      const tokenResponse = {
        access_token: 'test-access-token',
      };
      const HttpClientMock = jest.fn().mockImplementation(
        (): TokenProviderHttpClient => ({
          post: jest.fn().mockResolvedValue({ data: tokenResponse }),
        }),
      );
      const httpClient = new HttpClientMock();

      const tokenProvider = new TestTokenProvider({ tokenConfiguration, httpClient }, auth0Secret);
      const actualToken = await tokenProvider.getTokenWithoutCache();
      expect(actualToken).toEqual(tokenResponse.access_token);
      expect(httpClient.post).toHaveBeenCalledWith(
        tokenConfiguration.tokenEndpoint,
        {
          client_id: auth0Secret.Auth0ClientID,
          client_secret: auth0Secret.Auth0ClientSecret,
          audience: tokenConfiguration.audience,
          grant_type: 'client_credentials',
        },
        { headers: { 'Content-Type': 'application/json' } },
      );
    });
  });
});
