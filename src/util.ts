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
  const modObj = redact ? JSON.parse(redactSecret(JSON.stringify(obj))) : obj;
  if (modObj && typeof modObj === 'object') {
    return Object.getOwnPropertyNames(modObj).reduce((map, key) => {
      // eslint-disable-next-line no-param-reassign
      map[key] = modObj[key];
      return map;
    }, {});
  }

  return redact ? modObj : JSON.parse(JSON.stringify(modObj));
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
