export interface ApiRequest<Body = any, Query = any> {
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

export interface PostRequest<Body = any, Query = any> extends ApiRequest<Body, Query> {
  body: Body;
}

export interface PutRequest<Body = any, Query = any> extends ApiRequest<Body, Query> {
  body: Body;
}

export interface PatchRequest<Body = any, Query = any> extends ApiRequest<Body, Query> {
  body: Body;
}

export interface GetRequest<Query = any> extends Omit<ApiRequest<any, Query>, 'body'> {
  queryStringParameters: Query;
}
