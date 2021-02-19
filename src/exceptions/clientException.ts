import { Exception } from './exception';

export class ClientException extends Exception {
  public readonly originalStatusCode?: number;

  private static readonly statusCodeMap: Record<number, number> = {
    400: 422,
    401: 401,
    403: 403,
    404: 422,
  };

  constructor(serviceName: string, originalStatusCode?: number, error?: any) {
    super(
      'Dependent service returned error',
      ClientException.convertStatusCode(originalStatusCode),
      {
        error,
        serviceName,
      },
    );
    this.originalStatusCode = originalStatusCode;
  }

  private static convertStatusCode(originalStatusCode?: number) {
    let statusCode = 503;

    if (originalStatusCode && this.statusCodeMap[originalStatusCode]) {
      statusCode = this.statusCodeMap[originalStatusCode];
    }

    return statusCode;
  }
}
