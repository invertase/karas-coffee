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

import React, { useEffect, useRef, useState } from 'react';
import { FormikErrors, FormikHelpers, useFormik } from 'formik';
import { useFilePicker } from 'use-file-picker';
import { Label, TextArea, Error } from './Form';
import { Stars } from './Stars';
import { Button } from './Button';
import cx from 'classnames';
import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import GeminiIcon from './GeminiIcon';
import Markdown from 'react-markdown';
import { Spinner } from './Spinner';

type FormValues = {
  message: string;
  stars: number;
  files: File[];
};

export type WriteReviewCardProps = {
  productDescription: string;
  initialMessage?: string;
  initialStars?: number;
  onSubmit: (values: FormValues, helpers: FormikHelpers<FormValues>) => Promise<void>;
};

export function WriteReviewCard({ productDescription, initialMessage, initialStars, onSubmit }: WriteReviewCardProps) {
  const [openFilePicker, files] = useFilePicker({
    accept: 'image/*',
    multiple: true,
    limitFilesConfig: { max: 5 },
    maxFileSize: 10,
  });

  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const formik = useFormik<FormValues>({
    initialValues: {
      message: initialMessage ?? '',
      stars: initialStars ?? 0,
      files: [],
    },
    validate(values) {
      const errors: FormikErrors<FormValues> = {};
      if (!values.message) errors.message = 'Please provide an message.';
      if (values.message && values.message.length < 20) errors.message = 'Please provide longer review.';
      if (values.message && values.message.length > 500) errors.message = 'Please provide shorter review.';
      if (values.stars < 1) errors.stars = 'Please provide a rating.';
      return errors;
    },
    async onSubmit(values, helpers) {
      try {
        await onSubmit(values, helpers);
        helpers.resetForm();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        // TODO(ehesp): switch on code to provide user friendly error messages.
        console.error(e);
        helpers.setStatus(e?.message || 'Something went wrong.');
      }
    },
  });

  useEffect(() => {
    formik.setFieldValue('files', [...formik.values.files, ...files.plainFiles]);
  }, [files.plainFiles]);

  const [geminiAdvice, setGeminiAdvice] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const evaluateReview = async (comment: string) => {
    setGeminiAdvice(null);
    setGeminiLoading(true);
    setGeminiError(null);

    try {
      const evaluateReviewFlow = httpsCallable(functions, 'evaluateReviewFlow');
      const response = await evaluateReviewFlow({
        reviewSoFar: comment,
        context: productDescription,
        userId: auth.currentUser?.uid,
      });

      setGeminiLoading(false);
      setGeminiAdvice(response.data as string);
    } catch (e) {
      console.error(e);
      setGeminiLoading(false);
      setGeminiError('Could not connect to Gemini');
    } finally {
      setGeminiLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyup = (event: KeyboardEvent) => {
      const reviewSoFar = (event.target as HTMLTextAreaElement).value;

      if (idleTimer) {
        clearTimeout(idleTimer);
      }

      if (reviewSoFar.length < 10 || geminiLoading) return;

      if (
        reviewSoFar.endsWith('.') ||
        reviewSoFar.endsWith('!') ||
        reviewSoFar.endsWith('?') ||
        reviewSoFar.endsWith(',')
      ) {
        evaluateReview(reviewSoFar);
      } else {
        setIdleTimer(
          setTimeout(() => {
            evaluateReview(reviewSoFar);
          }, 1000),
        );
      }
    };

    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.addEventListener('keyup', handleKeyup);
    }

    return () => {
      if (textArea) {
        textArea.removeEventListener('keyup', handleKeyup);
      }
    };
  }, [idleTimer, geminiLoading]);

  const isError = formik.dirty && !!formik.errors.message;

  return (
    <form className="space-y-4" onSubmit={formik.handleSubmit}>
      <div>
        <Label id={'message'}>{'Write your own review:'}</Label>
        <textarea
          ref={textAreaRef}
          value={formik.values.message}
          id="message"
          name="message"
          onChange={formik.handleChange}
          className={cx('bg-white w-full px-2 py-1 border rounded focus:outline-none', {
            'focus:border-gray-500': !formik.errors.message,
            'border-red-500': isError,
          })}
        />
        <div className="mt-1 mb-4 flex flex-col">
          <div className="flex items-center mt-2">
            <div className="bg-blue-100 rounded-full p-1">
              <GeminiIcon size={15} />
            </div>
            <p className="text-xs text-black font-semibold ml-2">Write better reviews with Gemini</p>
          </div>
          <div className="text-sm text-gray-600 mt-1 border-l-2 border-blue-100 ml-2.5 pl-5 flex items-center">
            {geminiLoading ? (
              <>
                <div className="mr-2">
                  <Spinner size="sm" />
                </div>
                Loading...
              </>
            ) : (
              <Markdown>{geminiAdvice ?? 'Start typing...'}</Markdown>
            )}
          </div>
        </div>

        {isError && <Error>{formik.errors.message ?? 'An error occurred'}</Error>}
      </div>
      <div className="flex items-center">
        <div className="flex-grow">
          <Label id="stars">Rate this product:</Label>
          <Stars
            max={5}
            current={formik.values.stars}
            size="lg"
            onSelect={(value) => formik.setFieldValue('stars', value)}
          />
          {formik.dirty && !!formik.errors.stars && <Error>{formik.errors.stars}</Error>}
        </div>
        <button type="button" className="text-sm text-indigo-500 hover:underline" onClick={openFilePicker}>
          Attach Images &rarr;
        </button>
      </div>
      <div className="divide-y">
        {formik.values.files.map((file, index) => (
          <div key={file.name + index} className="flex items-center text-sm text-gray-500 py-1">
            <img src={URL.createObjectURL(file)} alt={file.name} className="h-16 mr-2" />
            <div className="flex-grow">{file.name}</div>
            <button
              type="button"
              className="hover:underline hover:text-gray-800 text-xs"
              onClick={() => {
                const files = [...formik.values.files];
                files.splice(index, 1);
                formik.setFieldValue('files', files);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div>
        <Button disabled={!formik.isValid} loading={formik.isSubmitting} type="submit">
          Submit Review
        </Button>
      </div>
    </form>
  );
}
