import { SecretsManagerTokenConfiguration, SecretsManagerTokenProvider } from '../../src';
import { Auth0Secret } from '../../src/tokenProvider/tokenProvider';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

describe('Secrets Manager Token Provider', () => {
  const tokenConfiguration: SecretsManagerTokenConfiguration = {
    clientSecretId: 'arn:aws:secretsmanager:eu-west-1:aws_account_id:secret:secret_id',
    audience: 'https://example.com/',
    tokenEndpoint: 'https://example.com/oauth/token',
  };

  describe('getClientSecret', () => {
    test('throws when secret was not retrieved', async () => {
      const promisedSecret = { SecretString: undefined };
      const SecretsManagerMock = jest.fn().mockImplementation(
        (): Partial<SecretsManagerClient> => ({
          send: jest.fn().mockResolvedValueOnce(promisedSecret),
        }),
      );

      const tokenProvider = new SecretsManagerTokenProvider({
        secretsManagerClient: new SecretsManagerMock(),
        tokenConfiguration,
      });

      await expect(tokenProvider.getClientSecret()).rejects.toThrowError(
        'Request error: failed to retrieve secret from Secrets Manager',
      );
    });

    test('returns parsed secret', async () => {
      const expectedSecret: Auth0Secret = {
        Auth0ClientID: 'test-client-id',
        Auth0ClientSecret: 'test-secret',
      };
      const promisedSecret = { SecretString: JSON.stringify(expectedSecret) };
      const SecretsManagerMock = jest.fn().mockImplementation(
        (): Partial<SecretsManagerClient> => ({
          send: jest.fn().mockResolvedValueOnce(promisedSecret),
        }),
      );

      const secretsManager = new SecretsManagerMock();
      const tokenProvider = new SecretsManagerTokenProvider({
        secretsManagerClient: secretsManager,
        tokenConfiguration,
      });

      const actualSecret = await tokenProvider.getClientSecret();
      expect(actualSecret).toEqual(expectedSecret);
      expect(secretsManager.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { SecretId: tokenConfiguration.clientSecretId },
        }),
      );
    });
  });
});
