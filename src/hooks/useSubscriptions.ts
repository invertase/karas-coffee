import { useFirestoreQueryData } from '@react-query-firebase/firestore';
import { orderBy, query, QueryConstraint, where } from 'firebase/firestore';
import { collections } from '../firebase';
import { useUser } from './useUser';

export function useSubscriptions() {
  const user = useUser();

  if (!user.data) {
    throw new Error('Subscriptions can only be fetched for authenticated users.');
  }

  const collection = collections.subscriptions(user.data.uid);
  const constraints: QueryConstraint[] = [];

  constraints.push(where('metadata.mode', '==', 'subscription'));
  constraints.push(orderBy('created'));

  return useFirestoreQueryData('orders', query(collection, ...constraints));
}