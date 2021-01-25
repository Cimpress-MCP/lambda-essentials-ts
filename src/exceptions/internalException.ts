import { Exception } from './exception';

export class InternalException extends Exception {
  constructor(error?: unknown) {
    super('Internal Server Error', 500, error);
  }
}
