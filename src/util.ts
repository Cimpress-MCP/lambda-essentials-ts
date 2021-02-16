import axios, { AxiosError } from 'axios';

export function serializeObject(obj: unknown): object {
  if (obj && typeof obj === 'object') {
    return Object.getOwnPropertyNames(obj).reduce((map, key) => {
      const propertyValue = obj[key];
      // eslint-disable-next-line no-param-reassign
      map[key] = axios.isAxiosError(propertyValue) ? propertyValue?.response?.data : propertyValue;
      return map;
    }, {});
  }
  return JSON.parse(JSON.stringify(obj));
}

export function serializeAxiosError(
  error: AxiosError,
): { status: number; statusText: string; data: any } | undefined {
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
