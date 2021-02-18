import { AxiosError } from 'axios';

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

export function serializeAxiosError(error: AxiosError): SerializedError | undefined {
  if (!error.response) {
    return undefined;
  }

  const { status, statusText, data } = error.response;
  return {
    status,
    statusText,
    data,
  };
}

export interface SerializedError {
  status: number;
  statusText: string;
  data: any;
}
