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

import { getDownloadURL } from '@firebase/storage';
import { useFirestoreDocumentData, useFirestoreQueryData } from '@react-query-firebase/firestore';
import { collection, doc, FieldPath, onSnapshot, orderBy, query, QueryConstraint, where } from 'firebase/firestore';
import { ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, UseQueryResult } from 'react-query';
import { collections, firestore, storage } from '../firebase';
import { useUser } from './useUser';

type FirestoreMessage = {
  prompt: string;
  response: string;
  status: {
    state: 'ERROR' | 'COMPLETED' | 'PROCESSING';
  };
};

export function useChat(): UseQueryResult<FirestoreMessage[]> {
  const user = useUser();

  const collection = collections.chat(user.data?.uid || 'test');

  const constraints: QueryConstraint[] = [];

  constraints.push(orderBy('createTime', 'asc'));

  return useFirestoreQueryData(
    ['chat', user.data?.uid],
    query(collection, ...constraints),
    {
      subscribe: true,
    },
    {
      enabled: !user.isLoading,
    },
  );
}
