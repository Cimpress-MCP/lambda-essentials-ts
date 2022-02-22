import { SecretsManager } from 'aws-sdk';
import TokenProvider, {
  Auth0Secret,
  TokenConfiguration,
  TokenProviderOptions,
} from './tokenProvider';

export default class SecretsManagerTokenProvider extends TokenProvider {
  private secretsManagerClient: SecretsManager;

  private secretsManagerConfiguration: SecretsManagerTokenConfiguration;

  constructor(options: SecretsManagerTokenProviderOptions) {
    if (!options.secretsManagerClient) {
      throw new Error('Configuration error: missing required property "secretsManagerClient"');
    }
    if (!options.tokenConfiguration?.clientSecretId) {
      throw new Error('Configuration error: missing required property "clientSecretId"');
    }

    super(options);
    this.secretsManagerClient = options.secretsManagerClient;
    this.secretsManagerConfiguration = options.tokenConfiguration;
  }

  protected async getClientSecret(): Promise<Auth0Secret | undefined> {
    const secret = await this.secretsManagerClient
      .getSecretValue({ SecretId: this.secretsManagerConfiguration.clientSecretId })
      .promise();

    return JSON.parse(secret.SecretString!) as Auth0Secret;
  }
}

export interface SecretsManagerTokenProviderOptions extends TokenProviderOptions {
  /**
   * AWS Secrets Manager Client
   */
  secretsManagerClient: SecretsManager;
  /**
   * Configuration needed for the token
   */
  tokenConfiguration: SecretsManagerTokenConfiguration;
}

export interface SecretsManagerTokenConfiguration extends TokenConfiguration {
  /**
   * The ID of a secret stored in AWS Secrets Manager.
   * The expected secret format is:
   * {
   *   Auth0ClientID: "string",
   *   Auth0ClientSecret: "string"
   * }
   */
  clientSecretId: string;
}
