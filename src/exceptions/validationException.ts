import { Exception } from './exception';

export class ValidationException extends Exception {
  constructor(message: string, details: unknown) {
    super(message, 400, details);
  }
}
