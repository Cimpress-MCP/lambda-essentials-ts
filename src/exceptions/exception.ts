import { serializeObject } from '../util';

export abstract class Exception extends Error {
  readonly statusCode: number;

  readonly details?: any;

  protected constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details ? serializeObject(details) : details;
  }
}
