import { AxiosRequestConfig } from 'axios';
import { createDebounceRequestAdapter } from '../../src/httpClient/deduplicateRequestAdapter';

describe('debounceRequestAdapter()', () => {
  const simulateDelay = (delay: number) => setTimeout(() => Promise.resolve(), delay);

  it('debounces calls to the passed adapter', async () => {
    const mockAdapter = jest.fn().mockResolvedValue(() => simulateDelay(10));
    const mockRequestKeyProvider = jest.fn().mockReturnValue('testRequestId');

    const debounceAdapter = createDebounceRequestAdapter(mockAdapter, mockRequestKeyProvider);
    const request: AxiosRequestConfig = {
      url: 'testUrl',
    };

    // fire two requests in parallel, only 1 should be made to the underlying adapter
    await Promise.all([debounceAdapter(request), debounceAdapter(request)]);
    expect(mockAdapter).toHaveBeenCalledWith(request);
    expect(mockAdapter).toBeCalledTimes(1);

    // try one request later, this should be passed as new request since it was not running in parallel
    await simulateDelay(100);
    await debounceAdapter(request);
    expect(mockAdapter).toHaveBeenCalledWith(request);
    expect(mockAdapter).toBeCalledTimes(2);
  });
});
