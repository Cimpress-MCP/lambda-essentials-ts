export interface ApiRequest<Body = void, Query = void> {
  body?: Body;
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
  queryStringParameters?: Query;
}

export interface PostRequest<Body = void, Query = void> extends ApiRequest<Body, Query> {
  body: Body;
}

export interface PutRequest<Body = void, Query = void> extends ApiRequest<Body, Query> {
  body: Body;
}

export interface PatchRequest<Body = void, Query = void> extends ApiRequest<Body, Query> {
  body: Body;
}

export interface GetRequest<Query = void> extends Omit<ApiRequest<void, Query>, 'body'> {
  queryStringParameters: Query;
}
