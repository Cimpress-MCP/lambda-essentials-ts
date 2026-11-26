declare module 'openapi-factory' {
  const OpenApi: new (
    options: import('./openApiModel').OpenApiOptions,
    overrideLogger?: () => void,
  ) => import('./openApiModel').OpenApiModel;

  export default OpenApi;
}
