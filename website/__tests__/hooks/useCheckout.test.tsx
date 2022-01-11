import { renderHook, act } from '@testing-library/react-hooks';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { useCheckout } from '../../src/hooks/useCheckout';
import { testUser } from '../mocks';

import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'demo-testing-app',
});

const queryClient = new QueryClient();

// eslint-disable-next-line @typescript-eslint/ban-types
const wrapper: React.FC<{}> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <Router>{children}</Router>
  </QueryClientProvider>
);

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const db = admin.firestore();
let docId: string | null;

jest.mock('../../src/hooks/useUser', () => {
  return {
    useUser: jest.fn(() => ({ ...testUser(docId) })),
  };
});

describe('useCheckout with authenitcation', () => {
  beforeEach(() => {
    docId = (Math.random() + 1).toString(36).substring(7);
  });

  test('will redirect to the order page on successful payment', async () => {
    const customerCollection = db.collection('customers');
    const customerDoc = customerCollection.doc(docId || '');
    await customerDoc.set({ stripeId: 'stripeId_Example' });

    const { result, waitForNextUpdate } = renderHook(() => useCheckout(), { wrapper });

    act(() => {
      result.current.trigger({
        mode: 'payment',
        success_url: `${window.location.origin}/account/orders?completed=true`,
        cancel_url: window.location.href,
        line_items: [],
        collect_shipping_address: true,
      });
    });

    await waitForNextUpdate();

    expect(result.current.triggerUrl).toBe(`${window.location.origin}/account/orders?completed=true`);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});

describe('useCheckout without authenitcation', () => {
  beforeEach(() => {
    docId = null;
  });
  test('will redirect to sign-in page with no authentication', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });

    act(() => {
      result.current.trigger({
        mode: 'payment',
        success_url: `${window.location.origin}/account/orders?completed=true`,
        cancel_url: window.location.href,
        line_items: [],
        collect_shipping_address: true,
      });
    });

    expect(result.current.triggerUrl).toBe('/signin?redirect=/');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});
