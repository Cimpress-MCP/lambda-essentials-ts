import { AxiosError } from 'axios';
import { serializeAxiosError, serializeObject } from '../src';

describe('Util', () => {
  const message = 'tests-error-message';
  const error = new Error(message);

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
  });
});
