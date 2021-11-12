import { AxiosAdapter, AxiosPromise } from 'axios';

// adopted from https://github.com/RasCarlito/axios-cache-adapter/issues/231#issuecomment-880288436
export function createDebounceRequestAdapter(
  requestAdapter: AxiosAdapter,
  requestKeyProvider: (AxiosRequestConfig) => string,
): AxiosAdapter {
  const runningRequests: Record<string, AxiosPromise> = {};

  return (req) => {
    const cacheKey = requestKeyProvider(req);

    // Add the request to runningRequests. If it is already there, drop the duplicated request.
    if (!runningRequests[cacheKey]) {
      runningRequests[cacheKey] = requestAdapter(req);
    }

    // Return the response promise
    return runningRequests[cacheKey].finally(() => {
      // Finally, delete the request from the runningRequests whether there's error or not
      delete runningRequests[cacheKey];
    });
  };
}
