import { AxiosError } from 'axios';
import jwt from 'jsonwebtoken';

export function safeJwtCanonicalIdParse(jwtToken: string): string | undefined {
  try {
    return jwt.decode(jwtToken)?.['https://claims.cimpress.io/canonical_id'];
  } catch {
    return undefined;
  }
}

export function safeJsonParse(input: any, defaultValue: unknown): unknown {
  try {
    return JSON.parse(input);
  } catch (e) {
    return defaultValue;
  }
}

export const redactSecret = (data: string): string => {
  return data.replace(
    /(\\*"*'*client_secret\\*"*'*:\s*\\*"*'*)([^"'\\]+)(\\*"*'*)/gi,
    (m, p1, p2, p3) => `${p1}<REDACTED>${p3}`,
  );
};

export function serializeObject(obj: unknown, redact?: boolean): object {
  let modObj = obj;
  if (obj && typeof obj === 'object') {
    modObj = Object.getOwnPropertyNames(obj).reduce((map, key) => {
      // eslint-disable-next-line no-param-reassign
      map[key] = obj[key];
      return map;
    }, {});
  }

  return redact
    ? JSON.parse(redactSecret(JSON.stringify(modObj)))
    : JSON.parse(JSON.stringify(modObj));
}

// eslint-disable-next-line complexity
export function serializeAxiosError(error: AxiosError): SerializedAxiosError | undefined {
  if (!error.response) {
    return {
      status: 500,
      details: error,
    };
  }

  const { status } = error.response;
  const data: unknown = error.response.data as unknown;
  const originalStatusCode =
    data && typeof data === 'object' && 'originalStatusCode' in data
      ? (data as any).originalStatusCode
      : undefined;
  const details =
    data &&
    typeof data === 'object' &&
    'details' in data &&
    (data as any).details &&
    Object.keys((data as any).details).length > 0
      ? (data as any).details
      : data;
  const message =
    data && typeof data === 'object' && 'message' in data ? (data as any).message : undefined;

  return {
    status: originalStatusCode ?? status, // Propagate original status code of ClientException
    details, // Prevent wrapping of Exception
    message,
  };
}

export interface SerializedAxiosError {
  status: number;
  details: any;
  message?: string;
}
