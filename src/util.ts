import { AxiosError } from 'axios';

export function safeJsonParse(input: any, defaultValue: unknown): unknown {
  try {
    return JSON.parse(input);
  } catch (e) {
    return defaultValue;
  }
}

export function serializeObject(obj: unknown): object {
  if (obj && typeof obj === 'object') {
    return Object.getOwnPropertyNames(obj).reduce((map, key) => {
      // eslint-disable-next-line no-param-reassign
      map[key] = obj[key];
      return map;
    }, {});
  }

  return JSON.parse(JSON.stringify(obj));
}

export function serializeAxiosError(error: AxiosError): SerializedAxiosError | undefined {
  if (!error.response) {
    return undefined;
  }

  const { status, data } = error.response;
  return {
    status: data.originalStatusCode ?? status, // Propagate original status code of ClientException
    details: data.details ? data.details : data, // Prevent wrapping of Exception
  };
}

export interface SerializedAxiosError {
  status: number;
  details: any;
}
