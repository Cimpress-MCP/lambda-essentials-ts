import TokenProvider, {
  Auth0Secret,
  TokenConfiguration,
  TokenProviderOptions,
} from './tokenProvider';
import { DecryptCommand, KMSClient } from '@aws-sdk/client-kms';

export default class KmsTokenProvider extends TokenProvider {
  private kmsClient: KMSClient;

  private kmsConfiguration: KmsTokenConfiguration;

  constructor(options: KmsTokenProviderOptions) {
    super(options);
    this.kmsClient = options.kmsClient;
    this.kmsConfiguration = options.tokenConfiguration;
  }

  public async getClientSecret(): Promise<Auth0Secret | undefined> {
    const data = await this.kmsClient.send(
      new DecryptCommand({
        CiphertextBlob: new Uint8Array(
          Buffer.from(this.kmsConfiguration.encryptedClientSecret, 'base64'),
        ),
      }),
    );
    const secret = data.Plaintext
      ? Buffer.from(data.Plaintext as Uint8Array).toString()
      : undefined;
    if (!secret) {
      throw new Error('Request error: failed to decrypt secret using KMS');
    }

    return { Auth0ClientSecret: secret, Auth0ClientID: this.kmsConfiguration.clientId };
  }
}

export interface KmsTokenProviderOptions extends TokenProviderOptions {
  /**
   * AWS KMS Client
   */
  kmsClient: KMSClient;
  /**
   * Configuration needed for the token
   */
  tokenConfiguration: KmsTokenConfiguration;
}

export interface KmsTokenConfiguration extends TokenConfiguration {
  /**
   * Username or ClientId
   */
  clientId: string;
  /**
   * KMS Encrypted client secret
   */
  encryptedClientSecret: string;
}
