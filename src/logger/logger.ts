/* eslint-disable no-console */

import * as uuid from 'uuid';
import stringify from 'fast-safe-stringify';
import isError from 'is-error';
import { redactSecret } from '../util';

export interface ILogger {
  log: (message: string | SuggestedLogObject) => void;

  startInvocation: (staticData?: any, invocationId?: string) => void;
}

export default class Logger implements ILogger {
  public invocationId: string;

  private readonly logFunction: (...data: any[]) => void;

  private readonly jsonSpace: number;

  private staticData: any;

  constructor(configuration?: LoggerConfiguration) {
    this.logFunction = configuration?.logFunction ?? console.log;
    this.jsonSpace = configuration?.jsonSpace ?? 2;

    this.invocationId = 'none';
  }

  /**
   * Create a new invocation which will end up setting the additional invocation metadata for the request, which will be used when logging.
   * @param staticData Any static data that are assigned to every log message. Typical might be an environment parameter or version number.
   */
  startInvocation(staticData?: any, invocationId?: string): void {
    this.staticData = staticData;
    this.invocationId = invocationId ?? uuid.v4();
  }

  // eslint-disable-next-line complexity
  log(message: string | SuggestedLogObject): void {
    const type = typeof message;
    if (type === 'undefined' || (type === 'string' && message === '')) {
      console.error('Empty message string.');
      return;
    }
    let messageAsObject: object = {};
    if (type === 'string') {
      messageAsObject = {
        title: message,
      };
    } else if (type === 'object') {
      if (Object.keys(message).length === 0) {
        console.error('Empty message object.');
        return;
      }
      messageAsObject = message as object;
    }

    if (this.staticData && typeof this.staticData === 'object') {
      messageAsObject = { ...this.staticData, ...messageAsObject };
    }

    const payload = {
      invocationId: this.invocationId,
      message: messageAsObject,
    };

    const truncateToken = (innerPayload: string): string => {
      return innerPayload.replace(
        /(eyJ[a-zA-Z0-9_-]{5,}\.eyJ[a-zA-Z0-9_-]{5,})\.[a-zA-Z0-9_-]*/gi,
        (m, p1) => `${p1}.<sig>`,
      );
    };

    const replacer = (key, value) => (isError(value) ? Logger.errorToObject(value) : value);
    let stringifiedPayload = truncateToken(stringify(payload, replacer, this.jsonSpace));
    stringifiedPayload = redactSecret(stringifiedPayload);
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html 256KB => 32768 characters
    if (stringifiedPayload.length >= 32768) {
      const replacementPayload = {
        invocationId: this.invocationId,
        message: {
          title: 'Payload too large',
          fields: Object.keys(payload),
          truncatedPayload: stringifiedPayload.substring(0, 10000),
        },
      };
      stringifiedPayload = stringify(replacementPayload, replacer, this.jsonSpace);
    }
    this.logFunction(stringifiedPayload);
  }

  private static errorToObject(error: Error): Record<string, string> {
    const obj: Record<string, string> = {};
    obj.name = error.name;
    Object.getOwnPropertyNames(error).forEach((res) => {
      obj[res] = error[res];
    });
    return obj;
  }
}

export interface LoggerConfiguration {
  /**
   * optional log function, uses console.log by default
   */
  logFunction?: (...data: any[]) => void;

  /**
   * the number of spaces that are used then stringifying the message.
   */
  jsonSpace?: number;
}

export interface SuggestedLogObject {
  /**
   * The message
   */
  title?: string;

  /**
   * Log Level
   */
  level?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'FATAL';

  /**
   * Any additional data
   */
  data?: any;

  [key: string]: any;
}
