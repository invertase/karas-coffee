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
import { FormikErrors, useFormik } from 'formik';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useAuthLinkWithCredential,
  useAuthSignInAnonymously,
  useAuthSignInWithEmailAndPassword,
} from '@react-query-firebase/auth';

import { Card } from '../components/Card';
import { Input, Error, Divider } from '../components/Form';
import { SocialProviders } from '../components/SocialProviders';
import { auth } from '../firebase';
import { Button } from '../components/Button';
import { EmailAuthProvider } from 'firebase/auth';

type FormValues = {
  email: string;
  password: string;
};

export function SignIn() {
  const navigate = useNavigate();
  const signIn = useAuthSignInWithEmailAndPassword(auth, {
    onSuccess() {
      navigate(redirect || '/');
    },
  });

  const linkMutation = useAuthLinkWithCredential();

  const [params] = useSearchParams();
  const redirect = params.get('redirect');

  // Set up formik for login.
  const formik = useFormik<FormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate(values) {
      const errors: FormikErrors<FormValues> = {};
      if (!values.email) errors.email = 'Please provide an email address.';
      if (!values.password) errors.password = 'Please provide a password.';
      return errors;
    },
    async onSubmit(values) {
      signIn.mutate({
        email: values.email,
        password: values.password,
      });

      if (!auth.currentUser) {
        // TODO: probably throw an error here or something
        return
      }

      const credential = EmailAuthProvider.credential(values.email, values.password);


      linkMutation.mutate({ user: auth.currentUser, credential: credential });
    },
  });

  return (
    <section className="max-w-xl px-4 mx-auto my-20">
      <h1 className="mb-4 text-3xl font-extrabold text-center text-gray-900">Sign in to your account</h1>
      <p className="mb-4 italic text-center text-gray-600">
        New to Kara&apos;s Coffee?&nbsp;
        <Link to="/register" className="text-indigo-700 hover:underline">
          Create an account
        </Link>
        .
      </p>
      <Card>
        <form className="space-y-6" onSubmit={formik.handleSubmit}>
          <Input
            id="email"
            label="Email Address"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.dirty ? formik.errors.email : undefined}
          />
          <Input
            type="password"
            id="password"
            label="Password"
            value={formik.values.password}
            onChange={formik.handleChange}
            error={formik.dirty ? formik.errors.password : undefined}
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium tracking-wide text-indigo-600 hover:underline">
              Forgot your password?
            </Link>
          </div>
          {signIn.isError && <Error>{signIn.error.message}</Error>}
          <Button disabled={!formik.isValid} loading={signIn.isLoading} type="submit">
            Sign in
          </Button>
        </form>
        <Divider>Or register with</Divider>
        <div className="mt-6">
          <SocialProviders redirect={redirect} />
        </div>
        <div className="mt-4 text-sm">
          <p>
            By registering an account, you agree to the{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">
              Terms of Service
            </a>
            . Google&rsquo;s{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">
              Privacy Policy
            </a>
            applies to your use of this site. The account you register is temporary as the data for this application is
            reset every 24 hours.
          </p>
        </div>
        {/* <Divider>Or sign in anonymously</Divider>
        <Button
          onClick={() => {
            signInAnonymously.mutate({ email: '', password: '' });
          }}
          loading={signIn.isLoading}
        >
          Sign in Anonymously
        </Button> */}
      </Card>
    </section>
  );
}
