import React, { useEffect, useMemo, useState } from 'react';
import { MinChatUiProvider, MessageInput, MessageContainer, MessageList } from '@minchat/react-chat-ui';
import { useChat } from '../hooks/useChat';
import { useUser } from '../hooks/useUser';
import { useChatMutation } from '../hooks/useChatMutation';
import { useLocation } from 'react-router-dom';
import { AnimatedDots } from './AnimatedDots';
import { getDocs } from 'firebase/firestore';
import { collections } from '../firebase';

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

      console.log('transformedMessages', transformedMessages);
      console.log('messages', messages);

      if (transformedMessages.length >= messages.length) {

      setMessages(transformedMessages);
      }
    }
  }, [chat.isSuccess,chat.data]);

  useEffect(() => {
    if (!isOpen) {
      try {
        chatMutation.mutate({reset: true});
      } catch (e) {}
    }
  }, [isOpen]);

  const handleSendMessage = (text: string) => {
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
          setMessages((currentMessages) =>
            currentMessages.filter((message) => message !== optimisticMessage),
          );
          console.error('Error sending message:', error);
        },
      }
    );
  };
  // const [, ...displayedMessages] = messages.filter((m) => !!m.text);
  // memo-ize instead
  const [,...displayedMessages] = useMemo(() => messages.filter((m) => !!m.text), [messages]);

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
    <div className={['/signin', '/forgot-password', '/register'].includes(location.pathname) ? 'hidden' : 'invisible lg:visible'}>
      <div
        className={`w-1/3 fixed bg-gray-300 p-1 h-[calc(100vh-5rem)] rounded top-20 -right-3 z-1000 transition duration-700 ${
          isOpen ? 'translate-x-[0%]' : 'translate-x-[100%]'
        }`}
      >
        <div id="chat-container" className="w-auto h-full flex flex-col">
          <MinChatUiProvider theme="#6ea9d7" colorSet={myColorSet}>
            {/* Chat message list container grows to fill available space, pushing input to bottom */}
            <div id="chat-messages-container" className="flex-grow overflow-y-scroll bg-[#111827] mr-[12px]">
              <ChatMessagesList isTyping={isTyping()} messages={displayedMessages} />
            </div>
            {/* Message input stays at the bottom */}
            <MessageInput
              placeholder="Type message here"
              showSendButton
              showAttachButton={false}
              onSendMessage={handleSendMessage}
              disabled={!user.isSuccess || !user.data}
            />
          </MinChatUiProvider>
        </div>
      </div>
    </div>
  );
}

const ChatMessagesList = ({ isTyping, messages }: { isTyping: boolean; messages: Message[] }) => {
  return (
    <div className="flex flex-col-reverse overflow-auto">
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

const colors = {
  // Theme Colors
  themeDark: '#111827',
  themeLighterDark: '#1E293B',
  themeLightGray: '#D1D5DB',
  themeMediumGray: '#9CA3AF',
  themeDarkGray: '#6B7280',
  themeDarkerGray: '#2D3748',
  themeDividerGray: '#374151',
  themeLastActiveGray: '#4B5563',

  // Text Colors
  lightGrayText: '#1F2937',

  // Element Colors
  lightBlueElement: '#3B82F6',
  lighterBlueForElements: '#D1D5DB',

  // Accent Colors
  greenAccent: '#10B981',

  // Placeholder & Other Specific Uses
  mediumGrayForAttachments: '#9CA3AF',
  darkGrayForPlaceholders: '#6B7280',
};

const myColorSet = {
  // input
  '--input-background-color': colors.themeLighterDark,
  '--input-text-color': colors.lightGrayText,
  '--input-element-color': colors.themeLightGray,
  '--input-attach-color': colors.themeMediumGray,
  '--input-send-color': colors.greenAccent,
  '--input-placeholder-color': colors.themeDarkGray,

  // message header
  '--message-header-background-color': colors.lightGrayText,
  '--message-header-text-color': colors.themeLightGray,
  '--message-header-last-active-color': colors.themeLastActiveGray,
  '--message-header-back-color': colors.themeMediumGray,

  // chat list header
  '--chatlist-header-background-color': colors.themeDark,
  '--chatlist-header-text-color': colors.themeLightGray,
  '--chatlist-header-divider-color': colors.themeDividerGray,

  // chatlist
  '--chatlist-background-color': colors.themeDark,
  '--no-conversation-text-color': colors.themeLightGray,

  // chat item
  '--chatitem-background-color': colors.themeLighterDark,
  '--chatitem-selected-background-color': colors.themeDividerGray,
  '--chatitem-title-text-color': colors.themeLightGray,
  '--chatitem-content-text-color': colors.themeMediumGray,
  '--chatitem-hover-color': colors.themeDarkerGray,

  // main container
  '--container-background-color': colors.themeDark,

  // loader
  '--loader-color': colors.themeLastActiveGray,

  // message list
  '--messagelist-background-color': colors.themeDark,
  '--no-message-text-color': colors.themeLightGray,

  // incoming message
  '--incoming-message-text-color': colors.themeLightGray,
  '--incoming-message-name-text-color': colors.themeMediumGray,
  '--incoming-message-background-color': colors.themeLighterDark,
  '--incoming-message-timestamp-color': colors.themeDarkGray,
  '--incoming-message-link-color': colors.lightBlueElement,

  // outgoing message
  '--outgoing-message-text-color': colors.themeLightGray,
  '--outgoing-message-background-color': colors.themeLighterDark,
  '--outgoing-message-timestamp-color': colors.themeMediumGray,
  '--outgoing-message-checkmark-color': colors.themeLighterDark,
  '--outgoing-message-loader-color': colors.themeMediumGray,
  '--outgoing-message-link-color': colors.lightBlueElement,
};
