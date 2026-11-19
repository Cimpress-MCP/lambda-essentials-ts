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
      map[key] = obj[key];
      return map;
    }, {});
  }

  return redact
    ? JSON.parse(redactSecret(JSON.stringify(modObj)))
    : JSON.parse(JSON.stringify(modObj));
}

export function serializeAxiosError(error: AxiosError<any>): SerializedAxiosError | undefined {
  if (!error.response) {
    return {
      status: 500,
      details: error,
    };
  }

  const { status, data } = error.response;
  return {
    status: data.originalStatusCode ?? status, // Propagate original status code of ClientException
    details: data.details && Object.keys(data.details).length > 0 ? data.details : data, // Prevent wrapping of Exception
    message: data.message,
  };
}

export interface SerializedAxiosError {
  status: number;
  details: any;
  message?: string;
}
