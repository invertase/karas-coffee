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

import * as firebaseFunctions from 'firebase-functions';
import admin from 'firebase-admin';
// @ts-expect-error No types for firebase-tools
import * as firebase_tools from 'firebase-tools';
import { configureGenkit, initializeGenkit } from '@genkit-ai/core';
import googleAI, { geminiPro } from '@genkit-ai/googleai';
import { onFlow } from "@genkit-ai/firebase/functions";
import { firebaseAuth } from "@genkit-ai/firebase/auth";
import { defineFirestoreRetriever, firebase } from '@genkit-ai/firebase';
import * as z from "zod";
import { generate, retrieve } from '@genkit-ai/ai';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { MessageData } from '@genkit-ai/ai/model';
import { DocumentSnapshot, getFirestore } from 'firebase-admin/firestore';
import { defineDotprompt, dotprompt } from '@genkit-ai/dotprompt';
import { textEmbeddingGecko } from '@genkit-ai/vertexai';

const functions = firebaseFunctions;

const app = admin.initializeApp();

const genkitConfig = configureGenkit({
  plugins: [
    firebase(),
    dotprompt(),
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

initializeGenkit(genkitConfig);


// Returns a list of all product ids in the database
function getProductIds(): Promise<string[]> {
  return admin
    .firestore()
    .collection('products')
    .listDocuments()
    .then((docRefs: any) => {
      return docRefs.map((docRef: any) => docRef.id);
    });
}

// Use Firebase Tools to delete a collection
function deleteCollection(path: string): Promise<void> {
  return firebase_tools.firestore.delete(path, {
    project: 'karas-coffee',
    recursive: true,
    yes: true, // auto-confirmation
  });
}

// Send a welcome email on user create.
exports.onAuthCreate = functions.auth.user().onCreate(async (user: firebaseFunctions.auth.UserRecord) => {
  if (user.email) {
    const collection = admin.firestore().collection('mail');
    await collection.add({
      to: user.email,
      message: {
        subject: 'Welcome to Karas Coffee!',
        html: 'Welcome to Karas Coffee! We are excited to have you as a customer.',
      },
    });
  }
});

// Send a order update SMS to the user once they have placed an order.
exports.onPaymentCreated = functions.firestore
  .document('customers/{customerId}/payments/{paymentId}')
  .onCreate(async (snapshot: any, context: any) => {
    const customerId = context.params.customerId;
    const user = await admin.auth().getUser(customerId);
    if (!user.phoneNumber) {
      firebaseFunctions.logger.log('No phone number found for user, skipping sending update.', user.uid);
      return;
    }
    const message = {
      to: user.phoneNumber,
      body: `Thank you for ordering from Kara's Coffee, your order is currently being processed. You can track it at https://karas-coffee.web.app/account/orders`,
    };
    await admin.firestore().collection('messages').add(message);
  });

// A Firebase function delete all user data every 24 hours - useful only
// for the purpose of this demo so we're not storing user data for long period.
exports.deleteUserData = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const [users, productIds] = await Promise.all([admin.auth().listUsers(), getProductIds()]);

  const bucket = admin.storage().bucket();
  const bucketFiles = (await bucket.getFiles())[0];

  await Promise.all<unknown>([
    deleteCollection('cart'),
    // ShipEngine verify addresses
    deleteCollection('addresses'),
    // Twilio SendGrid
    deleteCollection('cart_emails'),
    // Twilio SMS
    deleteCollection('messages'),
    // Stripe & Firebase Auth
    deleteCollection('customers'),
    // Storage mirror
    deleteCollection('gcs-mirror'),
    // Mailchimp
    deleteCollection('mail'),

    // Delete user reviews
    ...productIds.map((productId) => deleteCollection(`products/${productId}/reviews`)),

    // Delete users from Firebase Auth
    admin.auth().deleteUsers(users.users.map((user) => user.uid)),

    // Delete all storage files
    ...bucketFiles.map((file) => file.delete()),
  ]);
});

// Evaluate review flow
const history = new Map<string, MessageData[]>();
const lastUserReview = new Map<string, string>();
const lastGeminiEvaluation = new Map<string, string>();

const evaluateReviewFlowPrompt = (review: string, lastReview: string, lastEvaluation: string, context: string): string =>
  `
    Objective: You are a sophisticated AI that evaluates the completeness and informativeness of a coffee shop product review.
    Always be polite, keep the tone conversational and keep your responses short.
    Do not use brackets or mention variable names defined above.
    Never give your opinion on the review quality. Always ask questions or acknowledge the user's effort.
    Most recently, you evaluated user's review (${lastReview}) as follows: (${lastEvaluation}).
    Make sure to not ask the same questions and move on if it gets repetitive.

    Product description: ${context}
    Review: ${review}

    Follow these steps to evaluate the review:
    1. If the review is long, detailed, and informative, or if user says they have expressed all their thoughts and have nothing else to say, acknowledge the user's effort with a "Thank you for your review" message and skip other steps.
    2. Evaluate the completeness of the review. Make sure all aspects of product description are covered. Never tell the user your evaluation.
    3. If the review needs improvement, ask one clarifying question. Make sure to ask only one question at a time.
  `;

export const evaluateReviewFlow = onFlow(
  {
    name: "evaluateReviewFlow",
    inputSchema: z.object({
      reviewSoFar: z.string(),
      context: z.string(),
      userId: z.string(),
    }),
    outputSchema: z.string(),
    httpsOptions: { cors: true },
    authPolicy: firebaseAuth((user) => {
      if (!user) {
        throw new Error("Must be called by a user.");
      }
    }),
  },
  async (input) => {
    const lastReview = lastUserReview.get(input.userId) ?? 'none';
    const lastEvaluation = lastGeminiEvaluation.get(input.userId) ?? 'none';
    const historySoFar = history.get(input.userId) ?? [];

    const llmResponse = await generate({
      model: geminiPro,
      prompt: evaluateReviewFlowPrompt(input.reviewSoFar, lastReview, lastEvaluation, input.context),
      history: historySoFar,
      config: {
        temperature: 0.8,
      },
    });

    historySoFar.push({
      content: [{ text: input.reviewSoFar }],
      role: "user",
    });

    historySoFar.push({
      content: [{ text: llmResponse.text() }],
      role: "model",
    });

    history.set(input.userId, historySoFar);
    lastUserReview.set(input.userId, input.reviewSoFar);
    lastGeminiEvaluation.set(input.userId, llmResponse.text());

    return llmResponse.text();
  }
);
// comment
const processReviewsPrompt = defineDotprompt(
  {
    name: "processReviewPrompt",
    model: geminiPro,
    input: {
      schema: z.object({
        reviews: z.string(),
      }),
    },
    output: {
      format: 'text',
    },
  },
  ` 
    Summarize the following reviews and highlight key aspects of the feedback to be useful to buyers. 
    Do not include the reviews in the summary. You must never use markdown, return only basic string. 
    Keep the summary concise and informative. 
    Reviews: {reviews}
  `
);

// Process reviews flow
export const processReviews = defineFlow(
  {
    name: "processReviews",
    inputSchema: z.array(z.string()),
    outputSchema: z.string(),
  },
  async (reviews) => {
    const llmResponse = await processReviewsPrompt.generate({
      input: {
        reviews: reviews.join('\n'),
      },
      config: {
        temperature: 1,
      },
    });

    return llmResponse.text();
  }
);

exports.onReviewAdded = functions.firestore
  .document('products/{productId}/reviews/{userId}')
  .onWrite(async (snapshot: firebaseFunctions.Change<DocumentSnapshot>, context: any) => {
    const productId = context.params.productId;

    // Fetch all reviews for the product
    const reviewsSnapshot = await admin.firestore()
      .collection(`products/${productId}/reviews`)
      .get();

    const reviews = reviewsSnapshot.docs.map(doc => doc.data().message);

    // Run the processReviews flow
    const summarizedReview = await runFlow(processReviews, reviews);

    // Update product doc with the summarized review
    await admin.firestore().doc(`products/${productId}`).update({
      'reviews_summary': summarizedReview,
    });
  });

// Chat response flow
const chatResponsePrompt = defineDotprompt(
  {
    name: "chatResponsePrompt",
    model: geminiPro,
    input: {
      schema: z.object({
        context: z.string(),
        question: z.string(),
      }),
    },
    output: {
      format: 'text',
    },
  },
  ` 
    You are a support agent for a coffee shop.
    Answer the client's question and provide information about the product based on context below. 
    Question: {question}
    Context: {context}
  `
);

const productsRetriever = defineFirestoreRetriever({
  name: 'productsRetriever',
  firestore: getFirestore(app),
  collection: 'products',
  contentField: 'description',
  embedder: textEmbeddingGecko,
  vectorField: 'embedding',
});

export const chatResponseFlow = defineFlow(
  {
    name: "chatResponse",
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (question) => {

    // Retrieve embedded products from the database
    const products = await retrieve({
      retriever: productsRetriever,
      query: '', // get all products
      options: { k: 10 },
    });

    // Run the chat response flow
    const llmResponse = await chatResponsePrompt.generate({
      input: {
        question: question,
        context: products.map((product) => product.content).join('\n'),
      },
      config: {
        temperature: 1,
      },
    });

    return llmResponse.text();
  }
);