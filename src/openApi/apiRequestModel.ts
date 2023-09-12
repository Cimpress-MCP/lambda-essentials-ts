export interface ApiRequest<Body = any, Query = any> {
  body?: Body;
  path: string;
  httpMethod: string;
  route: string;
  isBase64Encoded: Boolean;
  requestContext: {
    authorizer?: AuthorizerContext;
    requestId: string;
  };
  headers: Record<string, string>;
  pathParameters: Record<string, string>;
  stageVariables: Record<string, string>;
  queryStringParameters?: Query;
  multiValueQueryStringParameters?: any;
}

export interface AuthorizerContext {
  jwt?: string;
  accessToken?: string;
  canonicalId?: string;
  principalId?: string;
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

export interface DeleteRequest extends Omit<ApiRequest, 'body' | 'query'> {}
