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

import React, { useState } from 'react';
import { format } from 'date-fns';

import { Accordion, AccordionItem } from '../../components/Accordion';
import { useOrders } from '../../hooks/useOrders';
import { emptyArray } from '../../utils';
import { Skeleton } from '../../components/Skeleton';
import { DocumentData } from 'firebase/firestore';
import { Product } from '../../types';

type OpenMap = { [key: string]: boolean };

export function Orders() {
  const orders = useOrders();

  const [open, setOpen] = useState<OpenMap>({});

  function toggleOrder(orderId: string) {
    setOpen((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  return (
    <section>
      <h1 className="font-bold text-2xl mb-6">Your Orders</h1>
      <Accordion>
        {orders.isLoading &&
          emptyArray(5).map((_, i) => (
            <div key={i} className="p-6 flex items-center">
              <Skeleton className="w-10 h-10 rounded-full mr-2" />
              <div className="flex-grow">
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-64 h-3 mt-2" />
              </div>
              <div>
                <Skeleton className="w-16 h-10" />
              </div>
            </div>
          ))}
        {orders.isSuccess &&
          orders.data.map((item: Product) => (
            <AccordionItem
              key={item.id}
              isOpen={open[item.id]}
              onToggle={() => toggleOrder(item.id)}
              collapsible={
                <div className="divide-y">
                  <div className="flex items-center">
                    <div className="flex-grow">
                      <h3 className="font-bold text-lg">Details</h3>
                      <div className="text-sm text-gray-600">Type: {item.metadata.type}</div>
                      <div className="text-sm text-gray-600">Price (USD): {item.metadata.price_usd}</div>
                      <div className="text-sm text-gray-600">Weight: {item.metadata.weight}</div>
                    </div>
                  </div>
                </div>
              }
            >
              <div className="flex items-center justify-between gap-x-4">
                <div className="flex-grow">
                  <div className="text-lg font-bold">{item.name}</div>
                  <div className="text-sm text-gray-600 overflow-auto break-words">{item.description}</div>
                </div>
                <div className="flex-grow flex justify-end">
                  {!!item.images.length && (
                    <div className="flex">
                      <img
                        src={item.images[0]}
                        alt={`Image of ${item.name}`}
                        className="w-20 h-14 mr-2 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </AccordionItem>
          ))}
      </Accordion>
    </section>
  );
}
