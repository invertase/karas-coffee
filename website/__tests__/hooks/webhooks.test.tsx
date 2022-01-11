import admin from 'firebase-admin';
import axios from 'axios';
import * as React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useCheckout } from '../../src/hooks/useCheckout';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { testUser, stripePayment } from '../mocks';

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
let stripeId: string | null;

jest.mock('../../src/hooks/useUser', () => {
  return {
    useUser: jest.fn(() => ({ ...testUser(docId) })),
  };
});

describe('webHooks', () => {
  beforeEach(() => {
    docId = (Math.random() + 1).toString(36).substring(7);
    stripeId = `stripe_${(Math.random() + 1).toString(36).substring(7)}`;
  });
  test('will confirm a successful payment', async () => {
    const customerCollection = db.collection('customers');
    const customerDoc = customerCollection.doc(docId || '');
    await customerDoc.set({ stripeId });

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

    const paymentCollection = customerDoc.collection('payments');

    return new Promise(async (resolve) => {
      const unsubscribe = paymentCollection.onSnapshot((snapshot) => {
        const document = snapshot.docs[0] ? snapshot.docs[0]?.data() : null;

        if (document?.id) {
          expect(document.id).toBe('pi_1JKS5I2x6R10KRrhk9GzY4BM');
          expect(document.amount).toBe(1000);
          unsubscribe();
          resolve(null);
        }
      });

      await axios.post('http://localhost:5001/demo-testing-app/us-central1/handleWebhookEvents', {
        type: 'checkout.session.async_payment_succeeded',
        payment: stripePayment(stripeId),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});
