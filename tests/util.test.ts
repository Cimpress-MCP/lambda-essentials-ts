import { serializeObject } from '../src';

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

    test('serializes Axios Error object', () => {
      const object = {
        stringProp: 'string-prop-value',
        error: { isAxiosError: true, response: { data: { details: 'Error' } } },
        objectProp: {
          innerProp: 'inner-prop-value',
          innerObjectProp: {
            innerObjectPropKey: 'inner-object-prop-value',
          },
        },
      };
      const expected = { ...object, error: { details: 'Error' } };

      const serializedError = serializeObject(object);
      expect(serializedError).toEqual(expected);
    });
  });
});
