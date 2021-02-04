export class ApiResponse<T = any> {
  private static orionCorrelationIdRoot = 'orion-correlation-id-root';

  public readonly body?: T;

  public readonly statusCode: number;

  public headers: Record<string, string>;

  constructor(statusCode: number, body: T, headers?: Record<string, string>) {
    this.body = body;
    this.statusCode = statusCode;
    this.headers = headers ?? {};
  }

  public withCorrelationId(correlationId: string) {
    this.headers[ApiResponse.orionCorrelationIdRoot] = correlationId;
    return this;
  }
}
