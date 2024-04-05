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

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import 'tailwindcss/tailwind.css';

import { App } from './App';
import { loadBundle } from 'firebase/firestore';
import { firestore } from './firebase';
import { CookiePolicy } from './components/CookiePolicy';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
const client = new QueryClient();
import './styles/bouncing.css';
async function bootstrap(): Promise<void> {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      await signInAnonymously(auth);
    }
  });

  // Define any bundles to pre-load.
  const bundles = await Promise.all([fetch('/bundles/shop')]);
  // Load the bundles into Firestore.
  const bodies = bundles.map((bundle) => bundle.body!)

  await Promise.all(bodies.map((body) => loadBundle(firestore, body)));
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}


bootstrap().then(() => {
  ReactDOM.render(
    <React.StrictMode>
      <BrowserRouter>
      <ScrollToTop />

        <QueryClientProvider client={client}>
          <>
            <App />
            {/* <CookiePolicy /> */}
            <ReactQueryDevtools initialIsOpen={false} />
          </>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>,
    document.getElementById('root'),
  );
});
