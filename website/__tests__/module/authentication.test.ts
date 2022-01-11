import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'demo-testing-app',
});

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const auth = admin.auth();
const db = admin.firestore();

describe('authentication', () => {
  test('will redirect to the order page on successful payment', async () => {
    const email = `${(Math.random() + 1).toString(36).substring(7)}@google.com`;
    const createdUser = await auth.createUser({ email });

    const customerCollection = db.collection('customers');
    const customerDoc = customerCollection.doc(createdUser.uid);

    return new Promise((resolve) => {
      const unsubscribe = customerDoc.onSnapshot((snapshot) => {
        const document = snapshot.data();

        if (document?.stripeId) {
          expect(document.email).toBe(email);
          expect(document.stripeId).toBe(`stripe_exampleStripeId`);
          expect(document.stripeLink).toBe(`https://dashboard.stripe.com/test/customer_testId}`);

          unsubscribe();
          resolve(null);
        }
      });
    });
  });
});
