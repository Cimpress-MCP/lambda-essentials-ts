export interface ApiRequest<T> {
  body?: T;
  path: string;
  httpMethod: string;
  requestContext: {
    authorizer?: {
      jwt: string;
      canonicalId: string;
      principalId: string;
    };
    requestId: string;
  };
  headers: Record<string, string>;
  pathParameters: Record<string, string>;
  queryStringParameters?: any;
}

export interface PostRequest<T> extends ApiRequest<T> {
  body: T;
}

export interface PutRequest<T> extends ApiRequest<T> {
  body: T;
}

export interface GetRequest<T> extends Omit<ApiRequest<T>, 'body'> {
  queryStringParameters: T;
}
