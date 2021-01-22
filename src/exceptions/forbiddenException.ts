import { Exception } from './exception';

export class ForbiddenException extends Exception {
  constructor(message: string, details?: unknown) {
    super(message, 403, details);
  }
}
