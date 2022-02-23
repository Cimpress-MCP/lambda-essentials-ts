import { KMS } from 'aws-sdk';
import TokenProvider, {
  Auth0Secret,
  TokenConfiguration,
  TokenProviderOptions,
} from './tokenProvider';

export default class KmsTokenProvider extends TokenProvider {
  private kmsClient: KMS;

  private kmsConfiguration: KmsTokenConfiguration;

  constructor(options: KmsTokenProviderOptions) {
    super(options);
    this.kmsClient = options.kmsClient;
    this.kmsConfiguration = options.tokenConfiguration;
  }

  public async getClientSecret(): Promise<Auth0Secret | undefined> {
    const secret = await this.kmsClient
      .decrypt({
        CiphertextBlob: Buffer.from(this.kmsConfiguration.encryptedClientSecret, 'base64'),
      })
      .promise()
      .then((data) => data.Plaintext?.toString());

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
  kmsClient: KMS;
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
