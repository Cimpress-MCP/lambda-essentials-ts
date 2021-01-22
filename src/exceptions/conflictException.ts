import { Exception } from './exception';

export class ConflictException extends Exception {
  constructor(conflictingKeys: string[], conflictingIds: string[], error?: unknown) {
    super('Conflict', 409, {
      error,
      conflictingKeys,
      conflictingIds,
    });
  }
}
