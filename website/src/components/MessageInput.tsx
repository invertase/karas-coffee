import React, { useRef, useState } from 'react';

interface MessageInputProps {
  placeholder: string;
  showSendButton: boolean;
  onSendMessage: (text: string) => void;
  disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ placeholder, showSendButton, onSendMessage, disabled }) => {
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
