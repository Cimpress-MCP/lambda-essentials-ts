import { orionCorrelationIdRoot } from '../shared';
import { AxiosHeaderValue } from 'axios';

export class ApiResponse<T = any> {
  public readonly body?: T;

  public readonly statusCode: number;

  public readonly headers: { [key: string]: AxiosHeaderValue };

  constructor(statusCode: number, body?: T, headers?: Record<string, string>) {
    this.body = body;
    this.statusCode = statusCode;
    this.headers = {
      'Access-Control-Expose-Headers':
        'Location, Access-Control-Allow-Origin, orion-correlation-id-root',
      'Content-Type': 'application/hal+json',
      ...headers,
    };
  }

  public withCorrelationId(correlationId: string) {
    this.headers[orionCorrelationIdRoot] = correlationId;
    return this;
  }
}
