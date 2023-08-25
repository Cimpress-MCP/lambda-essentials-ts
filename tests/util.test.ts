import { AxiosError } from 'axios';
import { serializeAxiosError, serializeObject } from '../src';
import { safeJsonParse, safeJwtCanonicalIdParse, redactSecret } from '../src/util';

describe('Util', () => {
  const message = 'tests-error-message';
  const error = new Error(message);

  describe('safeJwtCanonicalIdParse', () => {
    test('returns undefined when the JWT is undefined', () => {
      const expected = undefined;
      const parsedJson = safeJwtCanonicalIdParse(undefined!);
      expect(parsedJson).toEqual(expected);
    });

    test('returns undefined when the JWT is invalid', () => {
      const expected = undefined;
      const parsedJson = safeJwtCanonicalIdParse('invalid-jwt-token');
      expect(parsedJson).toEqual(expected);
    });

    test('returns canonical_id when the JWT is valid and contains the claim', () => {
      const expected = 'test@user.com';
      const parsedJson = safeJwtCanonicalIdParse(
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MzY3MzM0MDMsImV4cCI6MTY2ODI2OTQwMywiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoidGVzdEB1c2VyLmNvbSIsImh0dHBzOi8vY2xhaW1zLmNpbXByZXNzLmlvL2Nhbm9uaWNhbF9pZCI6InRlc3RAdXNlci5jb20ifQ.gArhFpdphmxnQEyMNSSFfWbY3CU6IngxGhheXLNgc8w',
      );
      expect(parsedJson).toEqual(expected);
    });
  });

  describe('safeJsonParse', () => {
    test('returns null when input string is null', () => {
      const expected = null;
      const parsedJson = safeJsonParse(null, 'default-value');
      expect(parsedJson).toEqual(expected);
    });

    test('returns object when input string is valid JSON', () => {
      const expected = { valid: 'json' };
      const parsedJson = safeJsonParse(JSON.stringify(expected), undefined);
      expect(parsedJson).toEqual(expected);
    });

    test('returns default value when input string is invalid JSON', () => {
      const expected = 'default-value';
      const parsedJson = safeJsonParse('not-a-json', expected);
      expect(parsedJson).toEqual(expected);
    });
  });

  describe('serialize', () => {
    test('serializes Error objects', () => {
      const expected = {
        message,
        stack: expect.any(String),
      };
      const serializedError = serializeObject(error);
      expect(serializedError).toEqual(expected);
    });

    test('serializes Error string', () => {
      const expected = 'test-error-string';
      const serializedError = serializeObject(expected);
      expect(serializedError).toEqual(expected);
    });

    test('serializes Error object', () => {
      const expected = {
        stringProp: 'string-prop-value',
        objectProp: {
          innerProp: 'inner-prop-value',
          innerObjectProp: {
            innerObjectPropKey: 'inner-object-prop-value',
          },
        },
      };

      const serializedError = serializeObject(expected);
      expect(serializedError).toEqual(expected);
    });
  });

  describe('serializeAxiosError', () => {
    const axiosError: AxiosError = {
      isAxiosError: true,
      message: 'test-message',
      response: {
        data: {
          details: 'test-details',
        },
        status: 409,
        config: {},
        headers: null,
        statusText: 'test-status-text',
      },
      config: {},
      name: 'test-name',
      toJSON: () => ({}),
    };

    test('serializes AxiosError objects', () => {
      const expected = {
        details: 'test-details',
        status: 409,
      };
      const serializedError = serializeAxiosError(axiosError);
      expect(serializedError).toEqual(expected);
    });

    test('serializes any objects', () => {
      const expected = {
        details: error,
        status: 500,
      };
      const serializedError = serializeAxiosError(error as any);
      expect(serializedError).toEqual(expected);
    });
  });

  describe('redactSecret', () => {
    test('secret without quotes', () => {
      const testString =
        'client_secret: ".ByCBCWBrfDZBYBdCnI5DDkC4BEDpDGB1YBNCsDeBNCyDypLBCBbBhDWBcDTCcDU"';
      const expected = 'client_secret: "<REDACTED>"';
      expect(redactSecret(testString)).toEqual(expected);
    });

    test('secret with quotes', () => {
      const testString =
        '"client_secret": ".ByCBCWBrfDZBYBdCnI5DDkC4BEDpDGB1YBNCsDeBNCyDypLBCBbBhDWBcDTCcDU"';
      const expected = '"client_secret": "<REDACTED>"';
      expect(redactSecret(testString)).toEqual(expected);
    });

    test('secret without space after colon', () => {
      const testString =
        '"client_secret":".ByCBCWBrfDZBYBdCnI5DDkC4BEDpDGB1YBNCsDeBNCyDypLBCBbBhDWBcDTCcDU"';
      const expected = '"client_secret":"<REDACTED>"';
      expect(redactSecret(testString)).toEqual(expected);
    });
  });
});
