/*
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { v4 as uuid } from 'uuid';
import { useMutation, UseMutationResult, useQueryClient } from 'react-query';
import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  QuerySnapshot,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

import { collections, firestore, functions, storage } from '../firebase';
import { useUser } from './useUser';
import { Product, Purchase } from '../types';
import { httpsCallable } from 'firebase/functions';
import { usePurchaseHistory } from './usePurchaseHistory';

export function useChatMutation(): UseMutationResult<any, Error, any> {
  const client = useQueryClient();
  const user = useUser();

  const uid = user.data?.uid;
  const purchaseHistoryResult = usePurchaseHistory(['purchaseHistory', uid], uid!);

  return useMutation(
    async ({ prompt, searchQuery, reset }: { prompt?: string; searchQuery?: string; reset?: boolean }) => {

      

      // Soft validation - the Firestore security rules ensure they are
      // authenticated.
      if (!user.data) {
        return;
      }
      
      const isAnon = user.data.isAnonymous;
      const uid = user.data.uid;
      const documentRef = doc(firestore, 'customers', uid);

      if (reset) {
        // clear chat collection
        const chatCollection = await getDocs(collections.chat(uid));

        chatCollection.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });

        await addDoc(collections.chat(uid), {
          prompt: 'Hi!',
        });
        client.invalidateQueries(['chat', user.data?.uid]);
        return documentRef.id;
      }


      let purchaseHistory: Purchase[] = [];

      if (!isAnon && purchaseHistoryResult.data) {
        purchaseHistory = purchaseHistoryResult.data;
      }

      let context: string = await getContext({ purchaseHistory });

      if (searchQuery) {
        const vectorSearchProducts = await performVectorSearch(searchQuery, 6);

        context = await getContext({
          vectorSearchResults: vectorSearchProducts.docs.map((doc) => doc.data()),
          purchaseHistory: purchaseHistory,
        });
      }
      // update context before proceeding
      await setDoc(
        doc(firestore, 'customers', uid),
        {
          context,
        },
        { merge: true },
      );

      if (prompt) {
        await addDoc(collections.chat(uid), {
          prompt,
        });
      }

      return documentRef.id;
    },
    {
      onSuccess(_reviewId) {
        client.invalidateQueries(['chat', user.data?.uid]);
      },
    },
  );
}

async function getContext({
  vectorSearchResults,
  purchaseHistory,
}: {
  vectorSearchResults?: Product[];
  purchaseHistory?: Purchase[];
}) {
  const currentRoute = window.location.pathname;

  let context = `You are an AI customer assistant for a business called Kara's Coffee. \\n
  Your name is Karabot. \\n
  You will be helpful and friendly to customers. \\n
  Your job is to help customers find the best products to suit their needs and answer any questions they have about our products accurately. \\n
  Always ensure the information you provide is accurate and refrain from guessing. \\n
  The customer is currently viewing the ${currentRoute} page. \\n
  `;

  if (vectorSearchResults && vectorSearchResults.length > 0) {
    const formattedVectorSearchResults = formatProducts(vectorSearchResults);

    context += `
    Here are the products that match the customer's search: \\n
    ${formattedVectorSearchResults}\\n
    `;
  }

  if (purchaseHistory && purchaseHistory.length > 0) {
    const formattedPurchaseHistory = formatPurchases(purchaseHistory.slice(0, 4));

    context += `
    \\n
    These are the customers previous purchases: \\n
    ${formattedPurchaseHistory} \\n
    `;
  }

  if ((!vectorSearchResults || vectorSearchResults.length == 0) && (!purchaseHistory || purchaseHistory.length == 0)) {
    context += `
    Currently, we have no specific information about the customer's preferences. Ask the customer to tell you more about the types of coffee or products they are interested in.
    `;
  }

  context += `
  If a customer asks about details not mentioned here, such as color, kindly respond with, "I'm sorry, I don't have that information. Can I assist you with other details like the coffee's origin or strength?" Offer alternative help or suggest related products. \\n

  If the product is a subscription, remember that the listed price is per month. \\n

  
  Always ensure the information you provide is accurate and refrain from guessing. Do not mention any products that are not listed in this message.\\n
  
  The categories of products we sell are coffee beans, coffee machines, and coffee subscriptions. We do not sell grinders. If we sell an item, it will be listed in this conversation already.\\n
  
  When you reply, reply **ONLY** in plain text please. Do not use markdown or CSV in your messages to the customer. \\n
  Keep your replies concise and to the point. \\n

  Conversation:
  `;

  return context;
}

const formatProducts = (products: Product[]) =>
  products
    .map(({ name, metadata, description }) => {
      const coffeeDetails =
        metadata.type === 'coffee'
          ? `, Origin: ${metadata.origin}, Strength: ${metadata.strength}, Variety: ${metadata.variety}`
          : '';
      return `Product: ${name}, Type: ${metadata.type}, Description: ${description}, Price: $${metadata.price_usd}${coffeeDetails}.`;
    })
    .join('\n\n');

const formatPurchases = (purchases: Purchase[]) =>
  purchases
    .map(({ product, quantity }) => {
      const { name, metadata, description } = product;
      const coffeeDetails =
        metadata.type === 'coffee'
          ? `, Origin: ${metadata.origin}, Strength: ${metadata.strength}, Variety: ${metadata.variety}`
          : '';
      return `Purchase: ${name}, Quantity: ${quantity}, Type: ${metadata.type}, Description: ${description}, Price: $${metadata.price_usd}${coffeeDetails}.`;
    })
    .join('\n\n');

const performVectorSearch = async (searchQuery: string, limit: number): Promise<QuerySnapshot<Product>> => {
  const vectorSearch = httpsCallable<{ query: string; limit: number }, string[]>(
    functions,
    'ext-firestore-vector-search-queryCallable',
  );

  const { data } = await vectorSearch({
    query: searchQuery,
    limit: 6,
  });
  const q =
    data && data.length > 0 ? query(collections.products, where('id', 'in', data)) : query(collections.products);

  const vectorSearchProducts = await getDocs(q);
  return vectorSearchProducts;
};
