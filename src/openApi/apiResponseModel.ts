export class ApiResponse<T = any> {
  public readonly body?: T;

  public readonly statusCode: number;

  public readonly headers?: Record<string, string>;

  constructor(statusCode: number, body: T, headers?: Record<string, string>) {
    this.body = body;
    this.statusCode = statusCode;
    this.headers = headers;
  }
}
