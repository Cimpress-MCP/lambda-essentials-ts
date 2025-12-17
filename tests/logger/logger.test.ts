import Logger, { SuggestedLogObject } from '../../src/logger/logger';

describe('log message', () => {
  const logFunction = jest.fn();
  const testLogger = new Logger({ logFunction });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('test redacting secret', () => {
    const logObjectWithSecret: SuggestedLogObject = {
      title: 'One secret',
      level: 'DEBUG',
      data: '{"client_id":"baconClientId","client_secret":".5BuCZ8AuBpnDfB25dhgftyuvBcBwDiBBCC5DjBGBeBfjD5BeBqhBFBQDGDp_gSw_","audience":"https://api.banana.io/","grant_type":"client_credentials"}',
    };
    testLogger.log(logObjectWithSecret);
    const receivedObject: SuggestedLogObject = {
      invocationId: 'none',
      title: 'One secret',
      level: 'DEBUG',
      data: '{"client_id":"baconClientId","client_secret":"<REDACTED>","audience":"https://api.banana.io/","grant_type":"client_credentials"}',
    };
    expect(logFunction).toHaveBeenCalledWith(JSON.stringify(receivedObject, null, 2));
  });

  test('test redacting secret from our http client', () => {
    const logObjectWithSecret: SuggestedLogObject = {
      title: 'One secret',
      level: 'DEBUG',
      bacon: {
        request: {
          client_id: 'baconClientId',
          client_secret: 'E5BuCZ8AuBpnDfB25dhgftyuvBcBwDiBBCC5DjBGBeBfjD5BeBqhBFBQDGDp_gSw_',
          audience: 'https://api.banana.io/',
          grant_type: 'client_credentials',
        },
      },
    };
    testLogger.log(logObjectWithSecret);
    const receivedObject: SuggestedLogObject = {
      invocationId: 'none',
      title: 'One secret',
      level: 'DEBUG',
      request: {
        client_id: 'baconClientId',
        client_secret: '<REDACTED>',
        audience: 'https://api.banana.io/',
        grant_type: 'client_credentials',
      },
    };
    expect(logFunction).toHaveBeenCalledWith(JSON.stringify(receivedObject, null, 2));
  });

  test('test truncating TOKEN', () => {
    const logObjectWithToken: SuggestedLogObject = {
      title: 'One TOKEN',
      level: 'DEBUG',
      data: '{"client_id":"baconClientId","TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c","audience":"https://api.banana.io/","grant_type":"client_credentials"}',
    };
    testLogger.log(logObjectWithToken);
    const receivedObject: SuggestedLogObject = {
      invocationId: 'none',
      title: 'One TOKEN',
      level: 'DEBUG',
      data: '{"client_id":"baconClientId","TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.<sig>","audience":"https://api.banana.io/","grant_type":"client_credentials"}',
    };
    expect(logFunction).toHaveBeenCalledWith(JSON.stringify(receivedObject, null, 2));
  });

  test('test truncating TOKEN and secret', () => {
    const logObjectWithToken: SuggestedLogObject = {
      title: 'One TOKEN',
      level: 'DEBUG',
      data: '{"client_id":"baconClientId","client_secret":".5BuCZ8AuBpnDfB25dhgftyuvBcBwDiBBCC5DjBGBeBfjD5BeBqhBFBQDGDp_gSw_","TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c","audience":"https://api.banana.io/","grant_type":"client_credentials"}',
    };
    testLogger.log(logObjectWithToken);
    const receivedObject: SuggestedLogObject = {
      invocationId: 'none',
      title: 'One TOKEN',
      level: 'DEBUG',
      data: '{"client_id":"baconClientId","client_secret":"<REDACTED>","TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.<sig>","audience":"https://api.banana.io/","grant_type":"client_credentials"}',
    };
    expect(logFunction).toHaveBeenCalledWith(JSON.stringify(receivedObject, null, 2));
  });
});
