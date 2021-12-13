import * as admin from 'firebase-admin';

import { renderHook, act } from '@testing-library/react-hooks';
import { useProducts } from '../src/hooks/useProducts';
import { limit, where } from '@firebase/firestore';

// TODO: Find a way to import live data into firestor emulator

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'extensions-testing',
});

//Setup collections
const reviews = 'reviews';
const reviewCollection = admin.firestore().collection(reviews);

describe('test useProducts hook', () => {
  test('test if useProducts return products data', async () => {
    const doc = await reviewCollection.add({
      created_at: 'December 13, 2021 at 1:16:23 PM UTC',
      message: 'This is good coffeeeee',
      product_id: 'chipinga',
      rating: 5,
    });
    // const { result, waitFor } = renderHook(() =>
    //   useProducts(['homepage', 'coffee'], [limit(4), where('metadata.type', '==', 'coffee')]),
    // );
  });
});
