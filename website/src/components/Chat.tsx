import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useUser } from '../hooks/useUser';
import { useChatMutation } from '../hooks/useChatMutation';
import { useLocation } from 'react-router-dom';
import { AnimatedDots } from './AnimatedDots';

type FirestoreMessage = {
  prompt: string;
  response: string;
  status: {
    state: 'ERROR' | 'COMPLETED' | 'PROCESSING';
  };
};

type Message = {
  text: string;
  user: {
    id: string;
    name: string;
  };
};

const firestoreMessageToMessage = ({ prompt, response, status }: FirestoreMessage): [Message] | [Message, Message] => {
  let displayedResponse = response;

  const state = status.state;

  if (state === 'ERROR') {
    displayedResponse = 'Sorry, I am not able to process your request at the moment. Please try again later.';
  }

  if (!prompt) {
    return [
      {
        text: displayedResponse,
        user: { id: 'karabot', name: 'Karabot' },
      },
    ];
  }

  return [
    { text: prompt, user: { id: 'user', name: 'User' } },
    { text: displayedResponse, user: { id: 'karabot', name: 'Karabot' } },
  ];
};

interface ChatProps {
  isOpen: boolean;
}

export function Chat({ isOpen }: ChatProps) {
  const user = useUser();

  const location = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);

  const chat = useChat();
  const chatMutation = useChatMutation();

  useEffect(() => {
    if (chat.isSuccess && chat.data) {
      //@ts-ignore TODO: fix this
      const transformedMessages = chat.data.map(firestoreMessageToMessage).flat();

      setMessages(transformedMessages);
    }
  }, [chat.isSuccess, chat.data]);

  useEffect(() => {
    if (!isOpen) {
      try {
        console.log('resetting chat');
        chatMutation.mutate({ reset: true });
      } catch (e) {}
    }
  }, [isOpen]);

  const handleSendMessage = (text: string) => {
    if (isTyping()) return;
    // Optimistically update the UI with the new message
    const optimisticMessage = {
      text,
      user: {
        id: 'user',
        name: 'User',
      },
    };

    // Update state immediately to include the new message
    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);

    // Perform the mutation
    chatMutation.mutate(
      { prompt: text, searchQuery: text },
      {
        // Optional: onSuccess, onError callbacks for mutation
        onSuccess: () => {
          // Handle successful mutation if needed
          // e.g., Invalidate queries or further update UI based on response
        },
        onError: (error) => {
          // Handle any error by possibly reverting the optimistic update
          // This is simplified; in practice, you might want to show an error message or perform other actions
          setMessages((currentMessages) => currentMessages.filter((message) => message !== optimisticMessage));
          console.error('Error sending message:', error);
        },
      },
    );
  };
  // const [, ...displayedMessages] = messages.filter((m) => !!m.text);
  // memo-ize instead
  const [, ...displayedMessages] = useMemo(() => messages.filter((m) => !!m.text), [messages]);

  useEffect(() => {
    const chatContainer = document.getElementById('chat-messages-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [displayedMessages]);

  const isTyping = () => {
    const lastMessage = displayedMessages[displayedMessages.length - 1];
    // return lastMessage?.user.id === 'karabot' && lastMessage.text === undefined;
    return !lastMessage?.user || lastMessage?.user.id === 'user';
  };

  return (
    <div
      className={
        ['/signin', '/forgot-password', '/register'].includes(location.pathname) ? 'hidden' : 'invisible lg:visible'
      }
    >
      <div
        className={`w-1/3 fixed bg-gray-300 h-[calc(100vh-5rem)] rounded top-20 -right-4 z-1000 transition duration-700 ${
          isOpen ? 'translate-x-[0%]' : 'translate-x-[100%]'
        }`}
      >
        <div id="chat-container" className="w-full h-full flex flex-col">
          <div id="chat-messages-container" className="w-full flex-grow overflow-y-scroll bg-[#111827] p-0">
            <ChatMessagesList isTyping={isTyping()} messages={displayedMessages} />
          </div>
          <div className="pr-1">
            <MessageInput
              placeholder="Type message here"
              showSendButton
              onSendMessage={handleSendMessage}
              disabled={!user.isSuccess || !user.data || isTyping()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageInputProps {
  placeholder: string;
  showSendButton: boolean;
  onSendMessage: (text: string) => void;
  disabled: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ placeholder, showSendButton, onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null); // Create a ref for the input element

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage(''); // Reset input after sending
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !disabled) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full flex items-center p-4 bg-[#111827] shadow rounded-md">
      <input
        ref={inputRef}
        className="p-2 h-12 form-textarea mt-1 flex-1 mr-2 rounded-md border-gray-300 shadow-sm focus:outline-none"
        placeholder={placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
      />
      {showSendButton && (
        <button
          className={`flex-none p-4 font-semibold text-white rounded shadow cursor-pointer ${
            disabled || !message.trim() ? 'cursor-not-allowed' : ''
          }`}
          onClick={handleSendMessage}
          disabled={disabled || !message.trim()}
        >
          <svg
            fill={disabled || !message.trim() ? 'white' : 'green'}
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 512 512"
          >
            <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
          </svg>
        </button>
      )}
    </div>
  );
};


const ChatMessagesList = ({ isTyping, messages }: { isTyping: boolean; messages: Message[] }) => {
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
