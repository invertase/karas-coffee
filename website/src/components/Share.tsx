import React from 'react';
import { ClipboardCopyIcon, MailIcon } from '@heroicons/react/outline';
import { useShortUrl } from '../hooks/useShortUrl';
import { useState } from 'react';
import { Product } from '../types';

export function Share({ product }: { product: Product }) {
  const shortUrl = useShortUrl(product);
  const encodedUrl = !shortUrl.data || !shortUrl.data.shortUrl ? '...' : shortUrl.data.shortUrl;

  const [copySuccess, setCopySuccess] = useState('');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(encodedUrl).then(
      () => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 1000); // Hide message after 2 seconds
      },
      (err) => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Failed to copy');
      },
    );
  };

  return (
    <div className="flex items-center justify-around space-x-4 mt-4 text-gray-500 rounded border-gray-300 border p-2 px-2  bg-gray-100 ">
      <span className="text-lg">Share:</span>
      <div
        className={`hidden sm:flex items-right relative p-2 pl-4 border border-gray-300 rounded-md text-gray-600  bg-white  max-w-48 resize-none focus:outline-none text-center items-center justify-center h-12 w-58 overflow-hidden ${
          copySuccess ? `text-green-500` : ``
        }`}
        aria-label="Share URL"
      >
        <p className={`transition duration-500 ease-[cubic-bezier(0.05,0.05,0.795,0.035)] ${copySuccess ? `text-green-500` : ``}`}>{encodedUrl}</p>
        <button
          onClick={copyToClipboard}
          className={`ml-2 p-2 hover:bg-gray-100 rounded transition duration-500 ease-[cubic-bezier(0.05,0.05,0.795,0.035)] ${
            copySuccess ? `text-green-500` : `text-gray-500`
          }`}
          title="Copy to clipboard"
        >
          <ClipboardCopyIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-right space-x-4 pl-4">
        <button
          onClick={copyToClipboard}
          className={`sm:hidden ml-2 rounded  hover:bg-gray-200 text-black h-10 w-10 items-center justify-center flex border border-gray-300 border-2 transition duration-500 ease-out ${
            copySuccess ? `text-green-500` : `opacity-75 text-gray-500`
          }`}
          title="Copy to clipboard"
        >
          <ClipboardCopyIcon className={`h-8 w-8 opacity-75 transition duration-200 ease-[cubic-bezier(0.05,0.05,0.795,0.035)] ${copySuccess ? "text-green-500" : ""}`} aria-hidden="true" />
        </button>
        <a
          href={`mailto:?subject=Check this out&body=Check out this amazing Kara's Coffee product: ${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded hover:bg-gray-200 opacity-75 text-black h-10 w-10 items-center justify-center flex border border-gray-300 border-2"
          title="Share via Email"
        >
          <MailIcon className="h-6 w-6 opacity-75" aria-hidden="true" />
        </a>
        <a
          href={`http://www.twitter.com/share?url=${encodeURIComponent(
            'Check out this cool product! \n\n ',
          )}${encodedUrl}`}
          target="_blank"
          className="rounded hover:bg-gray-200 h-10 w-10 items-center justify-center flex border border-gray-300 border-2"
          rel="noopener"
        >
          <FormerlyTwitterIcon />
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener"
          className="rounded hover:bg-gray-200 h-10 w-10 items-center justify-center flex border border-gray-300 border-2"
        >
          <FacebookIcon />
        </a>
      </div>
    </div>
  );
}

const FacebookIcon = () => (
  <div className="opacity-75">
  <svg xmlns="http://www.w3.org/2000/svg" role="img" className="w-6 h-6 opacity-75" viewBox="0 0 24 24">
    <title>Facebook</title>
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  </svg>
  </div>
);

const FormerlyTwitterIcon = () => (
  <div className="opacity-75">
    <svg xmlns="http://www.w3.org/2000/svg" role="img" className="w-6 h-6" viewBox="0 0 24 24">
      <title>X</title>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  </div>
);
