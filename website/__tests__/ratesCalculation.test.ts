import { renderHook, act } from '@testing-library/react-hooks';
import { useRatesCalculation } from '../src/hooks/useRatesCalculation';
import { Shipment } from '../src/types';

jest.mock('react-query', () => ({
  useQuery: () => ({ isLoading: false, error: {}, data: [] }),
  useMutation: () => ({
    error: null,
    isLoading: false,
    isSuccess: true,
    mutate: () => {
      return { data: [{ foo: 'bar' }], isSuccess: true };
    },
    // mutate: () => shipEngine.getMockShippingRates(), // Needs to exist
  }),
}));

describe('subscription', () => {
  test('can subscribe as a user', async () => {
    const { result, waitFor } = renderHook(() => useRatesCalculation());

    console.log(result.current);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    act(() => {
      // Assume we expect this to pass
      result.current.mutate({
        rateOptions: {
          carrierIds: ['ups'] as string[],
          serviceCodes: [] as string[],
        },
        shipment: {
          carrierId: 'bar',
        } as Shipment,
      });
    });

    await waitFor(() => {
      // console.log('result >>>', result.current);
      return !!result.current.isSuccess;
    });
  });
});
