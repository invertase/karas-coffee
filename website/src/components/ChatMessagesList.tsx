import React, { useEffect, useMemo, useRef, useState } from 'react';
import {Message} from '../types';
import { AnimatedDots } from './AnimatedDots';

export const ChatMessagesList = ({ isTyping, messages }: { isTyping: boolean; messages: Message[] }) => {
    return (
      <div className="flex flex-col-reverse overflow-auto bg-[#111827]">
        <ul className="space-y-2 p-4">
          {messages.map((message, index) => (
            <li
              key={index}
              className={`w-2/3  break-words bg-gray-800 text-white ${
                message.user.id === 'user' ? 'ml-auto' : ''
              } p-2 rounded-lg`}
            >
              {message.text}
            </li>
          ))}
          {isTyping && (
            <div className="w-full flex">
              <AnimatedDots />
            </div>
          )}
        </ul>
      </div>
    );
  };
  