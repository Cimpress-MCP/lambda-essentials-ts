import { Exception } from './exception';

export class ClientException extends Exception {
  public readonly serviceName: string;

  public readonly originalStatusCode?: number;

  private static readonly statusCodeMap: Record<number, number> = {
    400: 422,
    401: 401,
    403: 403,
    404: 422,
    422: 422,
  };

  constructor(
    serviceName: string,
    originalStatusCode?: number,
    details?: any,
    statusCodeMapOverride?: Record<number, number>,
  ) {
    super(
      `Dependent service "${serviceName}" returned error`,
      ClientException.convertStatusCode(originalStatusCode, statusCodeMapOverride),
      details,
    );
    this.serviceName = serviceName;
    this.originalStatusCode = originalStatusCode;
  }

  private static convertStatusCode(
    originalStatusCode?: number,
    statusCodeMapOverride?: Record<number, number>,
  ) {
    let statusCode = 503;
    const statusCodeMap = {
      ...ClientException.statusCodeMap,
      ...(statusCodeMapOverride || {}),
    };

    if (originalStatusCode && statusCodeMap[originalStatusCode]) {
      statusCode = statusCodeMap[originalStatusCode];
    }

    return statusCode;
  }
}
