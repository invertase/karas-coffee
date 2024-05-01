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

import React from 'react';
import { Alert } from './Alert';

export function Footer() {
  return (
    <footer className="py-16 mt-16 border-t">
      <div className="grid-cols-4 gap-24 px-6 mx-auto text-center max-w-7xl lg:text-left lg:grid">
        <div className="col-start-1 col-end-3">
          <p className="text-gray-500">
            Kara&apos;s Coffee is an demo E-Commerce and Stripe application, showcasing various Firebase Extensions,
            integrations with Firebase services and more. Learn more by visiting the GitHub repository.
          </p>
          <div className="mt-8">
            <Alert type="warning">The data for this application is reset every 24 hours!</Alert>
          </div>
        </div>
        <div className="flex flex-col mt-16 space-y-2 lg:mt-0">
          <Heading>Extensions</Heading>
          <ul role="list" className="mt-4 space-y-4">
            <li>
              <Link to="https://extensions.dev/extensions/googlecloud/firestore-genai-chatbot">
                Build Chatbot with the Gemini API
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/googlecloud/firestore-genai-chatbot">
                Vector Search with Firestore
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/firestore-backup-restore">
                Backup and Restore Firestore
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/delete-user-data">Delete User Data</Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/firestore-bundle-builder">
                Firestore Bundle Builder
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/algolia/firestore-algolia-search">
                Search Firestore with Algolia
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/firestore-send-email">
                Trigger Email from Firestore
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/invertase/firestore-stripe-payments">
                Run Payments with Stripe
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/jigsaw/firestore-perspective-toxicity">
                Analyze Comment Toxicity with Perspective API
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/firestore-bigquery-export">
                Stream Firestore to BigQuery
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/mailchimp/mailchimp-firebase-sync">
                Manage Marketing with Mailchimp
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/googlemapsplatform/firestore-validate-address">
                Validate Address in Firestore
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/storage-resize-images">Resize Images</Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/firebase/firestore-shorten-urls-bitly">
                Shorten URLs with Bitly
              </Link>
            </li>
            <li>
              <Link to="https://extensions.dev/extensions/twilio/send-message">Send Messages with Twilio</Link>
            </li>
          </ul>
        </div>
        <div className="flex flex-col mt-16 space-y-2 lg:mt-0">
          <Heading>Firebase</Heading>
          <ul role="list" className="mt-4 space-y-4">
            <li>
              <Link to="https://console.firebase.google.com/">Firebase Console</Link>
            </li>
            <li>
              <Link to="https://firebase.google.com/products-build">Build</Link>
            </li>
            <li>
              <Link to="https://firebase.google.com/products-release">Release</Link>
            </li>
            <li>
              <Link to="https://firebase.google.com/products-engage">Engage</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center mt-10 space-x-6 text-gray-600">
        <Link to="https://policies.google.com/privacy?hl=en-GB&fg=1">Privacy</Link>
        <span>&bull;</span>
        <Link to="https://policies.google.com/terms?hl=en-GB&fg=1">Terms</Link>
      </div>
    </footer>
  );
}

function Heading({ children }: { children: string }) {
  return <h3 className="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase">{children}</h3>;
}

function Link({ to, children }: { to: string; children: string }) {
  return (
    <a href={to} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-900">
      {children}
    </a>
  );
}
