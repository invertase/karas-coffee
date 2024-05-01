import React, { useEffect, useMemo, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useUser } from '../hooks/useUser';
import { useChatMutation } from '../hooks/useChatMutation';
import { useLocation } from 'react-router-dom';
import { FirestoreMessage, Message } from '../types';
import { MessageInput } from './MessageInput';
import { ChatMessagesList } from './ChatMessagesList';

const firestoreMessageToMessage = ({ prompt, response, status }: FirestoreMessage): [Message] | [Message, Message] => {
  let displayedResponse = response;

  const state = status.state;

  if (state === 'ERROR') {
    displayedResponse = 'Sorry, I am not able to process your request at the moment. Please try again later.';
  }

  if (!displayedResponse) {
    return [
      {
        text: prompt,
        user: { id: 'user', name: 'User' },
      },
    ];
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
    chatMutation.mutate(
      { prompt: text, searchQuery: text },
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