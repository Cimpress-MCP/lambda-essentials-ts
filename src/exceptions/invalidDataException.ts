import { Exception } from './exception';

export class InvalidDataException extends Exception {
  constructor(message: string, details?: unknown) {
    super(message, 422, details);
  }
}
