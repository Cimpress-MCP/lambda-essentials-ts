import TokenProvider, {
  Auth0Secret,
  TokenConfiguration,
  TokenProviderOptions,
} from './tokenProvider';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export default class SecretsManagerTokenProvider extends TokenProvider {
  private secretsManagerClient: SecretsManagerClient;

  private secretsManagerConfiguration: SecretsManagerTokenConfiguration;

  constructor(options: SecretsManagerTokenProviderOptions) {
    super(options);
    this.secretsManagerClient = options.secretsManagerClient;
    this.secretsManagerConfiguration = options.tokenConfiguration;
  }

  public async getClientSecret(): Promise<Auth0Secret | undefined> {
    const secret = await this.secretsManagerClient.send(
      new GetSecretValueCommand({
        SecretId: this.secretsManagerConfiguration.clientSecretId,
      }),
    );

    if (!secret?.SecretString) {
      throw new Error('Request error: failed to retrieve secret from Secrets Manager');
    }

    return JSON.parse(secret.SecretString) as Auth0Secret;
  }
}

export interface SecretsManagerTokenProviderOptions extends TokenProviderOptions {
  /**
   * AWS Secrets Manager Client
   */
  secretsManagerClient: SecretsManagerClient;
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
