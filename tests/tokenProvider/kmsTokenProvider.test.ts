import { KMS } from 'aws-sdk';
import { KmsTokenConfiguration, KmsTokenProvider } from '../../src';
import { Auth0Secret } from '../../src/tokenProvider/tokenProvider';

describe('KMS Token Provider', () => {
  const tokenConfiguration: KmsTokenConfiguration = {
    clientId: 'test-client-id',
    encryptedClientSecret: 'base64-encrypted-test-secret',
    audience: 'https://example.com/',
    tokenEndpoint: 'https://example.com/oauth/token',
  };

  describe('getClientSecret', () => {
    test('throws when secret was not decrypted', async () => {
      const promisedDecryptedText = Promise.resolve({ data: { Plaintext: undefined } });
      const KMSMock = jest.fn().mockImplementation(
        (): Partial<KMS> => ({
          decrypt: jest.fn().mockReturnValue({ promise: () => promisedDecryptedText }),
        }),
      );

      const tokenProvider = new KmsTokenProvider({
        kmsClient: new KMSMock(),
        tokenConfiguration,
      });

      await expect(tokenProvider.getClientSecret()).rejects.toThrowError(
        'Request error: failed to decrypt secret using KMS',
      );
    });

    test('returns parsed secret', async () => {
      const expectedSecret: Auth0Secret = {
        Auth0ClientID: 'test-client-id',
        Auth0ClientSecret: 'test-secret',
      };
      const promisedDecryptedText = Promise.resolve({
        Plaintext: expectedSecret.Auth0ClientSecret,
      });
      const KMSMock = jest.fn().mockImplementation(
        (): Partial<KMS> => ({
          decrypt: jest.fn().mockReturnValue({ promise: () => promisedDecryptedText }),
        }),
      );

      const kms = new KMSMock();
      const tokenProvider = new KmsTokenProvider({
        kmsClient: kms,
        tokenConfiguration,
      });

      const actualSecret = await tokenProvider.getClientSecret();
      expect(actualSecret).toEqual(expectedSecret);
      expect(kms.decrypt).toHaveBeenCalledWith({
        CiphertextBlob: Buffer.from(tokenConfiguration.encryptedClientSecret, 'base64'),
      });
    });
  });
});
